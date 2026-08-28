-- A fog over the board.
--
-- Every map arrives PITCH BLACK and is opened by hand. Two columns hold it:
-- whether the fog is up, and where the light has been painted.
--
-- A PICTURE AND NOT A GEOMETRY. A revealed region is an arbitrary freehand shape
-- over hundreds of strokes; as polygons it is a growing list nothing can merge,
-- and as cells it is a grid — which is the thing this is not. A raster mask is a
-- fixed cost whatever has been painted.
--
-- THE MASK RECORDS WHAT IS LIT. Opaque is revealed, so an absent mask is a map
-- nobody has opened — exactly the state a new one should be in, with no row.
--
-- IT IS NOT A SECRET. The mask travels to the party's browsers because those are
-- what draw the darkness, and the map underneath is a public URL besides. Fog
-- hides a room from a player who is playing, not from one who opens the network
-- tab. What must not be seen belongs off the picture — a hidden token's row is
-- withheld by the SELECT policy, and that is what a real secret looks like.

-- ---------------------------------------------------------------------------
-- 1. What a map remembers about its own darkness.
-- ---------------------------------------------------------------------------
--
-- DEFAULT TRUE, AND THAT BACKFILLS: every map already on a shelf goes dark for
-- the party the moment this runs. Deliberate — defaulting old rows to false
-- would put every existing map in the one state the feature exists to prevent.

alter table public.campaign_maps
  add column if not exists fog_enabled boolean not null default true;

alter table public.campaign_maps
  add column if not exists fog_mask_url text;

do $$
begin
  -- Built by this app and never reaching four hundred, as a map's URL is not.
  -- Null is a map nobody has opened: all dark, and no object in the bucket.
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_maps_fog_mask_check'
  ) then
    alter table public.campaign_maps
      add constraint campaign_maps_fog_mask_check
        check (fog_mask_url is null or char_length(fog_mask_url) between 1 and 400);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Where the masks live.
-- ---------------------------------------------------------------------------
--
-- Its own bucket and not a prefix inside `campaign-maps`, because of the write
-- pattern: a map is uploaded once and cached for a year, a mask is rewritten
-- every time a brush is put down. Two lifetimes, two buckets.
--
-- THE PATH CARRIES THE CAMPAIGN and the policy reads it back out:
-- `campaigns/{campaign id}/maps/{map id}/fog-mask.webp`. Load-bearing — change
-- it and change the policy. `storage.foldername(name)` splits on `/`, so `[2]`
-- is the campaign; the regex guard is not decoration, a cast of a segment that
-- is not a uuid RAISES, and an exception in a policy is a 500 not a refusal.
--
-- These statements touch the `storage` schema, which the migration runner owns
-- on a hosted project. If your role cannot create them, create the bucket in
-- Storage → New bucket (public), then paste the four policies into the SQL
-- editor as the owner.

insert into storage.buckets (id, name, public)
values ('campaign-fog-masks', 'campaign-fog-masks', true)
on conflict (id) do update set public = true;

drop policy if exists "Fog masks are publicly readable" on storage.objects;
create policy "Fog masks are publicly readable"
  on storage.objects for select
  using (bucket_id = 'campaign-fog-masks');

drop policy if exists "Dungeon Masters paint their own fog" on storage.objects;
create policy "Dungeon Masters paint their own fog"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'campaign-fog-masks'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_campaign(((storage.foldername(name))[2])::uuid)
  );

-- Every stroke after the first is an UPDATE of the object already there, and it
-- has to be pinned at both ends: `using` decides which rows may be targeted,
-- `with check` what they may become. Without the second, a caller could move
-- somebody else's mask under a campaign of their own.
drop policy if exists "Dungeon Masters repaint their own fog" on storage.objects;
create policy "Dungeon Masters repaint their own fog"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'campaign-fog-masks'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_campaign(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'campaign-fog-masks'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_campaign(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Dungeon Masters wipe their own fog" on storage.objects;
create policy "Dungeon Masters wipe their own fog"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'campaign-fog-masks'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.owns_campaign(((storage.foldername(name))[2])::uuid)
  );

-- ---------------------------------------------------------------------------
-- 3. Setting it.
-- ---------------------------------------------------------------------------
--
-- A definer rather than an UPDATE policy, as `update_map_grid_settings` is: RLS
-- grants ROWS and never columns, so the narrowest policy that would let a
-- Dungeon Master paint a map also lets them rewrite its URL.
--
-- A null `p_enabled` leaves the switch where it stands. A null `p_mask_url`
-- cannot mean the same, clearing the mask being a thing a caller may want, so
-- `p_touch_mask` says whether the caller is speaking about it at all.

create or replace function public.update_map_fog_state(
  p_map_id uuid,
  p_enabled boolean,
  p_mask_url text,
  p_touch_mask boolean
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
begin
  select m.campaign_id into v_campaign
  from public.campaign_maps m
  where m.id = p_map_id;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return false;
  end if;

  if p_mask_url is not null and char_length(p_mask_url) > 400 then
    return false;
  end if;

  update public.campaign_maps
    set fog_enabled = coalesce(p_enabled, fog_enabled),
        fog_mask_url = case
          when coalesce(p_touch_mask, false) then p_mask_url
          else fog_mask_url
        end
    where id = p_map_id;

  return found;
end;
$$;

revoke all on function public.update_map_fog_state(uuid, boolean, text, boolean) from public;
revoke all on function public.update_map_fog_state(uuid, boolean, text, boolean) from anon;
grant execute on function public.update_map_fog_state(uuid, boolean, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. What the table hears.
-- ---------------------------------------------------------------------------
--
-- In the publication since 20260920090000; the guard is here so this file stands
-- on its own. The board answers a brush off the table's own channel and this is
-- the backstop: a chair that missed the broadcast is told by the database.

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
end;
$pub$;
