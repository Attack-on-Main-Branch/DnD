-- More than one map, and one of them on the table.
--
-- A campaign has had exactly one picture since 20260817120000. `campaign_maps`
-- is the shelf, and `campaigns.active_map_id` is what is on the table.
--
-- THE WORLD MAP IS ON THE SHELF TOO, or the Dungeon Master could switch away
-- from it and never back. That row is DERIVED: `campaigns.map_url` stays the
-- column every existing reader and writer uses, and the trigger below keeps
-- its row in step. One direction only — the reverse would be a cycle.

-- ---------------------------------------------------------------------------
-- 1. The shelf.
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_maps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null default 'Untitled Map',
  url text not null,
  is_world_map boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
begin
  -- The same bounds the rules layer keeps. A name is a label on a card, not
  -- prose; the URL is built by this app and never reaches four hundred.
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_maps_name_check'
  ) then
    alter table public.campaign_maps
      add constraint campaign_maps_name_check
        check (char_length(btrim(name)) between 1 and 60);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'campaign_maps_url_check'
  ) then
    alter table public.campaign_maps
      add constraint campaign_maps_url_check
        check (char_length(url) between 1 and 400);
  end if;
end
$$;

-- Read one campaign at a time, in shelf order. The world map sorts first
-- because the trigger below gives its row a negative `sort_order`.
create index if not exists campaign_maps_by_campaign
  on public.campaign_maps (campaign_id, sort_order, created_at);

-- ONE world map per campaign, which is what lets the trigger below upsert onto
-- it rather than having to find it first.
create unique index if not exists campaign_maps_one_world
  on public.campaign_maps (campaign_id)
  where is_world_map;

alter table public.campaign_maps enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Who may see a map, and who may hang one.
-- ---------------------------------------------------------------------------
--
-- Read: the Dungeon Master, and anybody with a character in the party. Both
-- questions cross into another RLS-protected table, so both go through the
-- `security definer` helpers from 20260818160000 rather than an inline
-- `exists` — see that migration for the recursion this avoids.
--
-- Write: the Dungeon Master alone. A player switching the board out from under
-- the table is not a thing this game has.

drop policy if exists "The table reads its own maps" on public.campaign_maps;
create policy "The table reads its own maps"
  on public.campaign_maps for select to authenticated
  using (
    public.owns_campaign(campaign_id)
    or public.my_character_in_campaign(campaign_id)
  );

drop policy if exists "Dungeon Masters hang their own maps" on public.campaign_maps;
create policy "Dungeon Masters hang their own maps"
  on public.campaign_maps for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters change their own maps" on public.campaign_maps;
create policy "Dungeon Masters change their own maps"
  on public.campaign_maps for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters take their own maps down" on public.campaign_maps;
create policy "Dungeon Masters take their own maps down"
  on public.campaign_maps for delete to authenticated
  using (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- 3. Ten of them, and the world does not count.
-- ---------------------------------------------------------------------------
--
-- enforce_campaign_limit's shape, including the two things it had to learn:
-- the advisory lock, because two requests read the same pre-state under READ
-- COMMITTED; and `auth.uid() is not null`, so the guard keeps applying for the
-- sessions that bypass RLS. Lock seed 3, against a campaign id.
--
-- Mirrors MAX_EXTRA_MAPS in Sina/src/rules/campaign.js.

create or replace function public.enforce_campaign_map_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The world map is the campaign's own picture and is derived from it. It is
  -- not one of the ten, and it is not inserted by anybody who could be over.
  if new.is_world_map then
    return new;
  end if;

  if (select auth.uid()) is not null
     and not public.owns_campaign(new.campaign_id)
  then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 3));

  if (
    select count(*)
    from public.campaign_maps
    where campaign_id = new.campaign_id
      and not is_world_map
  ) >= 10 then
    raise exception 'map_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_campaign_map_limit() from public;
revoke all on function public.enforce_campaign_map_limit() from anon;
revoke all on function public.enforce_campaign_map_limit() from authenticated;

drop trigger if exists campaign_maps_enforce_limit on public.campaign_maps;
create trigger campaign_maps_enforce_limit
  before insert on public.campaign_maps
  for each row execute function public.enforce_campaign_map_limit();

-- ---------------------------------------------------------------------------
-- 4. What is on the table.
-- ---------------------------------------------------------------------------
--
-- `on delete set null`, so a map taken off the shelf puts the world back rather
-- than leaving the party looking at a URL that answers 404.

alter table public.campaigns
  add column if not exists active_map_id uuid
    references public.campaign_maps(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. The world map's row, kept in step.
-- ---------------------------------------------------------------------------
--
-- `campaigns.map_url` is still the column the creation sheet, the edit sheet
-- and `update_campaign` write, and still the column the dashboard card and the
-- campaign page read. This gives it a row on the shelf so the switcher can put
-- it back, and nothing else changes.
--
-- AFTER, not BEFORE: the campaign has to exist before a row may reference it.

create or replace function public.campaigns_sync_world_map()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.map_url is null then
    delete from public.campaign_maps
    where campaign_id = new.id and is_world_map;

    return new;
  end if;

  insert into public.campaign_maps (
    campaign_id, name, url, is_world_map, sort_order
  )
  values (new.id, 'World map', new.map_url, true, -1)
  -- The partial unique index from step 1 is the conflict target, which is why
  -- the predicate is repeated here.
  on conflict (campaign_id) where is_world_map
  do update set url = excluded.url;

  return new;
end;
$$;

revoke all on function public.campaigns_sync_world_map() from public;
revoke all on function public.campaigns_sync_world_map() from anon;
revoke all on function public.campaigns_sync_world_map() from authenticated;

drop trigger if exists campaigns_sync_world_map on public.campaigns;
create trigger campaigns_sync_world_map
  after insert or update of map_url on public.campaigns
  for each row execute function public.campaigns_sync_world_map();

-- Every campaign that already had a world map, given its row. Idempotent: the
-- partial index makes a second run an update to the same value.
insert into public.campaign_maps (campaign_id, name, url, is_world_map, sort_order)
select c.id, 'World map', c.map_url, true, -1
from public.campaigns c
where c.map_url is not null
on conflict (campaign_id) where is_world_map
do update set url = excluded.url;

-- ---------------------------------------------------------------------------
-- 6. Putting one on the table.
-- ---------------------------------------------------------------------------
--
-- A definer function rather than an UPDATE policy, for the reason every other
-- write at this table goes through one: RLS grants ROWS and never columns, so
-- the narrowest policy that would let a Dungeon Master set this also lets them
-- rewrite the title and the lore from a hand-built request. The parameter list
-- is the whole of what may change.
--
-- `p_map_id` null is the world map put back, and is not a refusal.

create or replace function public.set_active_campaign_map(
  p_campaign_id uuid,
  p_map_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_campaign(p_campaign_id) then
    return false;
  end if;

  -- A map from another campaign is not a map at this table. Checked here and
  -- not by a foreign key, which knows nothing about which campaign.
  if p_map_id is not null and not exists (
    select 1
    from public.campaign_maps m
    where m.id = p_map_id and m.campaign_id = p_campaign_id
  ) then
    return false;
  end if;

  update public.campaigns
    set active_map_id = p_map_id
    where id = p_campaign_id;

  return found;
end;
$$;

revoke all on function public.set_active_campaign_map(uuid, uuid) from public;
revoke all on function public.set_active_campaign_map(uuid, uuid) from anon;
grant execute on function public.set_active_campaign_map(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. What the table is looking at.
-- ---------------------------------------------------------------------------
--
-- 20260821200000's function with the active map resolved into `map_url`.
-- Dropped first because the RETURN TYPE grows, which `create or replace`
-- refuses outright.
--
-- THE CALLER IS NOT TOLD TO RESOLVE IT. Every chair at the table asks this one
-- question — "what am I looking at" — and answering it in two columns invites
-- two answers. The campaign PAGE still reads `campaigns.map_url` directly and
-- still gets the world map, which is what that page is about.

drop function if exists public.campaign_table(uuid);

create function public.campaign_table(target_campaign uuid)
returns table (
  id uuid,
  title text,
  world_description text,
  map_url text,
  active_map_id uuid,
  is_owner boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.world_description,
         coalesce(m.url, c.map_url),
         c.active_map_id,
         public.owns_campaign(target_campaign)
  from public.campaigns c
  left join public.campaign_maps m on m.id = c.active_map_id
  where c.id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    );
$$;

revoke all on function public.campaign_table(uuid) from public;
revoke all on function public.campaign_table(uuid) from anon;
grant execute on function public.campaign_table(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. What the table hears.
-- ---------------------------------------------------------------------------
--
-- Row Level Security still decides what is delivered: the socket carries the
-- subscriber's JWT and the SELECT policies above are evaluated against it, so a
-- change to a campaign nobody at this table plays in is never sent.
--
-- The board answers a switch off the wire rather than off these — see
-- table-maps.jsx — and this is the honest half behind it: a chair that missed
-- the broadcast, or joined after it, is told by the database instead.

do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_maps'
     )
  then
    alter publication supabase_realtime add table public.campaign_maps;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaigns'
     )
  then
    alter publication supabase_realtime add table public.campaigns;
  end if;
end;
$pub$;

-- ---------------------------------------------------------------------------
-- 9. Swapping the picture on one card.
-- ---------------------------------------------------------------------------
--
-- ONE DOOR FOR BOTH KINDS OF MAP. The world map's row is DERIVED, so writing
-- it would be undone the next time anything touched `campaigns.map_url`. This
-- asks which sort of card was pressed and writes the column that owns it.
--
-- It hands back the URL it replaced — the last moment anything points at the
-- old object. Null is a refusal or a miss, deliberately indistinguishable.

create or replace function public.replace_campaign_map(
  p_map_id uuid,
  p_url text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_world boolean;
  v_was text;
begin
  select m.campaign_id, m.is_world_map, m.url
    into v_campaign, v_world, v_was
  from public.campaign_maps m
  where m.id = p_map_id;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return null;
  end if;

  if v_world then
    -- The trigger in step 5 carries it onto the row.
    update public.campaigns set map_url = p_url where id = v_campaign;
  else
    update public.campaign_maps set url = p_url where id = p_map_id;
  end if;

  return v_was;
end;
$$;

revoke all on function public.replace_campaign_map(uuid, text) from public;
revoke all on function public.replace_campaign_map(uuid, text) from anon;
grant execute on function public.replace_campaign_map(uuid, text) to authenticated;
