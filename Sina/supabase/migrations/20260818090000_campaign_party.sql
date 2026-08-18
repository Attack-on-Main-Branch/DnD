-- The party: which characters belong to which campaign.
--
-- A join table rather than a column on either side, because the relationship is
-- many-to-many in both directions — a character can sit in more than one
-- campaign, and a campaign holds several characters.
--
-- The hard part here is not the table, it is that a Dungeon Master's party is
-- made of characters they do NOT own. Everything below exists to let that work
-- without opening the characters table any wider than it has to be.

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  added_at timestamptz not null default now(),

  -- The pair is the identity: a character is in a campaign once or not at all,
  -- and this is what makes adding the same one twice a no-op rather than a
  -- duplicate row.
  primary key (campaign_id, character_id)
);

create index if not exists campaign_members_character_id_idx
  on public.campaign_members (character_id);

alter table public.campaign_members enable row level security;

-- Membership is the campaign owner's to read and to change. Not the
-- character's owner: a player seeing every campaign their character has been
-- added to is a different feature with a different policy, and it is not this
-- one.
drop policy if exists "Owners read their campaign members" on public.campaign_members;
create policy "Owners read their campaign members"
  on public.campaign_members for select to authenticated
  using (exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "Owners add their campaign members" on public.campaign_members;
create policy "Owners add their campaign members"
  on public.campaign_members for insert to authenticated
  with check (exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "Owners remove their campaign members" on public.campaign_members;
create policy "Owners remove their campaign members"
  on public.campaign_members for delete to authenticated
  using (exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.user_id = (select auth.uid())
  ));

-- A Dungeon Master can read the characters in their own campaigns, and only
-- those. This is the one place `characters` is readable by somebody other than
-- its owner, and the EXISTS is the whole of the permission: no membership row,
-- no read. It is additive — the owner's own policy from 20260811140554 still
-- stands on its own.
drop policy if exists "DMs read the characters in their campaigns" on public.characters;
create policy "DMs read the characters in their campaigns"
  on public.characters for select to authenticated
  using (exists (
    select 1
    from public.campaign_members m
    join public.campaigns c on c.id = m.campaign_id
    where m.character_id = characters.id
      and c.user_id = (select auth.uid())
  ));

-- Finding a character to add, by the handle its player gives out.
--
-- SECURITY DEFINER, because the whole point is to see past RLS — before a
-- character is in the party there is no membership row to authorise reading it,
-- so the policy above cannot help and the search would find nothing.
--
-- Which makes the shape of this function the security boundary, so:
--
--   * EXACT match on both halves, never LIKE and never a prefix. A DM who
--     knows "Frieren#1000" finds it; nobody can walk the table by typing "a".
--     This is the same pair the unique index covers, so it is one lookup.
--   * A fixed, minimal column list. No user_id, no backstory, no notes —
--     enough to show who you are about to add and nothing else.
--   * `limit 1`, because the pair is unique and a set-returning function that
--     could ever return more is a different thing to reason about.
--
-- Case-insensitive on the name to match the unique index, which is on
-- lower(name): a handle that works here is one the database considers taken.
create or replace function public.find_character_by_handle(
  handle_name text,
  handle_discriminator text
)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race, c.archetype, c.class_id, c.color_theme
  from public.characters c
  where lower(c.name) = lower(btrim(handle_name))
    and c.discriminator = btrim(handle_discriminator)
  limit 1;
$$;

-- Callable by a signed-in visitor and nobody else. `anon` would make the
-- handle space searchable without an account at all.
revoke all on function public.find_character_by_handle(text, text) from public;
revoke all on function public.find_character_by_handle(text, text) from anon;
grant execute on function public.find_character_by_handle(text, text) to authenticated;

-- Six per party, held here for the same reason the other two caps are: an
-- authenticated request can reach PostgREST directly, so a check that only runs
-- in a Server Action is not the thing that holds. Mirrors MAX_PARTY in
-- Sina/src/rules/campaign.js.
create or replace function public.enforce_party_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 2));

  if (
    select count(*) from public.campaign_members
    where campaign_id = new.campaign_id
  ) >= 6 then
    raise exception 'party_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_party_limit() from public;
revoke all on function public.enforce_party_limit() from anon;
revoke all on function public.enforce_party_limit() from authenticated;

drop trigger if exists campaign_members_enforce_limit on public.campaign_members;
create trigger campaign_members_enforce_limit
  before insert on public.campaign_members
  for each row execute function public.enforce_party_limit();
