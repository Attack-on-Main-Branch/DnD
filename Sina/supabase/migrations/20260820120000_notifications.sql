-- Sealed missives: the notifications a signed-in visitor receives, and the
-- invitation flow that replaces adding a character to a party outright.
--
-- Until now a Dungeon Master could put anybody's character in their campaign by
-- searching for its handle, with no say from the person who plays it. The party
-- table stays as it was; what changes is who may write to it. A DM now sends an
-- invitation, and only the character's owner turns that into a membership row.
--
-- Three things follow from that, and they are why so much of this file is
-- SECURITY DEFINER rather than policy:
--
--   * A DM must be able to put a row in somebody else's inbox without being
--     able to read that person's characters. `send_campaign_invite` resolves
--     the owner behind a definer boundary and returns nothing about them.
--   * A player must be able to insert into `campaign_members` for a campaign
--     they do not own, which no policy on that table grants and none should.
--     `accept_campaign_invite` is the only door, and it opens once per invite.
--   * The party cap has to hold on that path too. The BEFORE trigger from
--     20260818180000 deliberately stands aside for a caller who does not own
--     the campaign -- otherwise it answered whether a stranger's party was full
--     -- so the accept path counts for itself, under the same advisory lock.
--
-- Notifications carry `title` and `message` so a row says what it is on its
-- own. For an invitation those strings are assembled from the campaign's title
-- and the character's handle, which are the user's own words rather than ours;
-- the product voice stays in Maria, which renders an invite from `data` and
-- never prints the stored sentence. Nothing here is granted an INSERT policy:
-- every row in this table is written by one of the three functions below.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  type text not null check (type in ('campaign_invite', 'system_changelog')),

  -- char_length, not octet_length: the same code-point count the rules layer
  -- uses. Bounded so a caller of `announce_version` cannot park an essay here.
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 400),

  -- { campaign_id, campaign_title, character_id, character_name, version }
  data jsonb not null default '{}'::jsonb,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'read', 'dismissed')),

  created_at timestamptz not null default now()
);

-- The inbox is always read newest first, for one recipient.
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- One live invitation per character per campaign. A declined or accepted one
-- leaves the slot free, so a DM may ask again after a no.
create unique index if not exists notifications_pending_invite_idx
  on public.notifications (
    user_id, (data ->> 'campaign_id'), (data ->> 'character_id')
  )
  where type = 'campaign_invite' and status = 'pending';

-- One announcement per version per recipient, whatever became of it. This index
-- is also the record of what a user has already been told: dismissing an
-- announcement changes its status, never removes the row, so the version stays
-- known and the same release cannot be announced twice.
create unique index if not exists notifications_version_idx
  on public.notifications (user_id, (data ->> 'version'))
  where type = 'system_changelog';

alter table public.notifications enable row level security;

-- Strictly the recipient's own row, on all three verbs. There is deliberately
-- no INSERT policy: see the functions below.
drop policy if exists "Recipients read their notifications" on public.notifications;
create policy "Recipients read their notifications"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Recipients update their notifications" on public.notifications;
create policy "Recipients update their notifications"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Recipients delete their notifications" on public.notifications;
create policy "Recipients delete their notifications"
  on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Sending an invitation.
--
-- The DM names a campaign of their own and a character they found through
-- `search_characters`. Everything about the recipient is resolved in here and
-- none of it is returned: the caller learns that the invitation was sent, not
-- who received it. Failures are raised as bare tokens because the data layer
-- classifies on the message and Maria writes the sentence.
--
-- `already_added` and `party_limit_reached` are answered up front as a courtesy
-- to the DM. Neither is load-bearing -- the party cap is checked again when the
-- invitation is accepted, which is the moment that actually adds a row.
create or replace function public.send_campaign_invite(
  p_campaign_id uuid,
  p_character_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_title text;
  v_owner uuid;
  v_name text;
  v_discriminator text;
  v_id uuid;
begin
  select c.title into v_title
  from public.campaigns c
  where c.id = p_campaign_id and c.user_id = (select auth.uid());

  if v_title is null then
    raise exception 'campaign_not_found';
  end if;

  select ch.user_id, ch.name, ch.discriminator
    into v_owner, v_name, v_discriminator
  from public.characters ch
  where ch.id = p_character_id;

  if v_owner is null then
    raise exception 'character_not_found';
  end if;

  if exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign_id and m.character_id = p_character_id
  ) then
    raise exception 'already_added';
  end if;

  if (
    select count(*) from public.campaign_members m
    where m.campaign_id = p_campaign_id
  ) >= 6 then
    raise exception 'party_limit_reached';
  end if;

  insert into public.notifications (user_id, type, title, message, data)
  values (
    v_owner,
    'campaign_invite',
    'An invitation to ' || v_title,
    v_name || '#' || v_discriminator || ' is called to the party of ' || v_title || '.',
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'campaign_title', v_title,
      'character_id', p_character_id,
      'character_name', v_name,
      'character_discriminator', v_discriminator
    )
  )
  returning id into v_id;

  return v_id;
exception
  -- The partial index above. One invitation may be outstanding at a time, and a
  -- second click is that rather than something worth a stack trace.
  when unique_violation then
    raise exception 'invite_pending';
end;
$fn$;

-- Accepting one.
--
-- The only place a `campaign_members` row is written by somebody who does not
-- own the campaign, and the reason it is a definer function rather than a
-- policy: "may insert because an invitation addressed to me says so" is not a
-- question a WITH CHECK can ask without opening the table to far more.
--
-- The advisory lock uses the same key as `enforce_party_limit`, so a DM's own
-- insert and a player's accept queue behind each other rather than both reading
-- a party of five and both writing. The count is repeated here because that
-- trigger stands down for a caller who does not own the campaign.
create or replace function public.accept_campaign_invite(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid;
  v_character uuid;
begin
  -- FOR UPDATE, so two clicks on the same invitation cannot both pass the
  -- `status = 'pending'` test and both add a row.
  select (n.data ->> 'campaign_id')::uuid, (n.data ->> 'character_id')::uuid
    into v_campaign, v_character
  from public.notifications n
  where n.id = p_notification_id
    and n.user_id = (select auth.uid())
    and n.type = 'campaign_invite'
    and n.status = 'pending'
  for update;

  if v_campaign is null then
    raise exception 'invite_not_found';
  end if;

  -- Re-checked rather than trusted: the invitation is old news by now, and the
  -- character may have been retired since it was sent.
  if not exists (
    select 1 from public.characters ch
    where ch.id = v_character and ch.user_id = (select auth.uid())
  ) then
    raise exception 'character_not_found';
  end if;

  if not exists (select 1 from public.campaigns c where c.id = v_campaign) then
    raise exception 'campaign_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_campaign::text, 2));

  if (
    select count(*) from public.campaign_members m
    where m.campaign_id = v_campaign
  ) >= 6 then
    raise exception 'party_limit_reached';
  end if;

  insert into public.campaign_members (campaign_id, character_id)
  values (v_campaign, v_character)
  on conflict do nothing;

  update public.notifications
  set status = 'accepted'
  where id = p_notification_id;

  return v_campaign;
end;
$fn$;

-- Announcing a release to whoever is reading.
--
-- The copy is a parameter because it is Maria's to write, and that is safe in a
-- way the invitation's is not: this row is addressed to the caller themselves,
-- so the worst anyone can do with it is talk to themselves. The version format
-- and the ceiling are there so that talking to themselves stays bounded.
--
-- Returns null when this version was already announced, which is the ordinary
-- outcome -- the unique index makes the insert idempotent rather than the
-- caller's timing.
create or replace function public.announce_version(
  p_version text,
  p_title text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;

  if p_version !~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$' then
    raise exception 'invalid_version';
  end if;

  if (
    select count(*) from public.notifications n
    where n.user_id = v_user and n.type = 'system_changelog'
  ) >= 50 then
    raise exception 'announce_limit_reached';
  end if;

  insert into public.notifications (user_id, type, title, message, data)
  values (
    v_user,
    'system_changelog',
    p_title,
    p_message,
    jsonb_build_object('version', p_version)
  )
  on conflict do nothing
  returning id into v_id;

  return v_id;
end;
$fn$;

-- The Dungeon Master's own INSERT is withdrawn, and that is the whole of the
-- refactor: with it in place, "we ask first" would be a rule the user interface
-- kept and PostgREST did not, and an authenticated caller can reach PostgREST
-- directly. `accept_campaign_invite` runs as the migration's owner and so is
-- unaffected -- it is now the only way a row reaches this table.
--
-- Reading and removing stay with the DM. A party is theirs to see and theirs to
-- disband; it is only joining that needs the player's word.
drop policy if exists "Owners add their campaign members" on public.campaign_members;

revoke all on function public.send_campaign_invite(uuid, uuid) from public;
revoke all on function public.send_campaign_invite(uuid, uuid) from anon;
grant execute on function public.send_campaign_invite(uuid, uuid) to authenticated;

revoke all on function public.accept_campaign_invite(uuid) from public;
revoke all on function public.accept_campaign_invite(uuid) from anon;
grant execute on function public.accept_campaign_invite(uuid) to authenticated;

revoke all on function public.announce_version(text, text, text) from public;
revoke all on function public.announce_version(text, text, text) from anon;
grant execute on function public.announce_version(text, text, text) to authenticated;

-- Realtime. Without the table in this publication a browser subscription
-- connects, reports SUBSCRIBED, and then never delivers anything -- the hardest
-- version of this to debug. Guarded on both sides so the file stays safe to
-- re-run, and so a database without Supabase's own publication does not fail
-- on this line.
--
-- Row Level Security still decides what is delivered: the socket carries the
-- subscriber's JWT and the SELECT policy above is evaluated against it, so a
-- change to somebody else's row is never sent.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     )
  then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$pub$;

-- The party table too, so a Dungeon Master watching their campaign page sees a
-- character arrive the moment its player accepts. "Owners read their campaign
-- members" is what decides who is told.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_members'
     )
  then
    alter publication supabase_realtime add table public.campaign_members;
  end if;
end;
$pub$;
