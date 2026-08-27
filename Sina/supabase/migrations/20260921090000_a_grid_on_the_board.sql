-- A grid on the board, and tokens that stand on it.
--
-- Three things arrive together: a map can carry a hex grid, a mark knows which
-- map it stands on, and a mark knows which cell.
--
-- WHY A MARK NEEDED A MAP: since 20260920090000 a campaign has a shelf of them,
-- and a token on the tavern floor has no business standing in the same spot on
-- the world map.
--
-- WHAT DID NOT CHANGE: `x` and `y` are fractions of the picture and already the
-- coordinates a token is drawn from. The hex pair is the CELL, a different fact
-- -- it survives a resize, and it says two tokens share a square without the
-- database knowing any geometry.

-- ---------------------------------------------------------------------------
-- 1. A map can be ruled.
-- ---------------------------------------------------------------------------
--
-- `grid_size` is in the PICTURE'S OWN PIXELS: the same hex on every chair,
-- whatever size each of them is drawing the map at.

alter table public.campaign_maps
  add column if not exists grid_enabled boolean not null default false,
  add column if not exists grid_size integer not null default 48,
  add column if not exists grid_luminance double precision not null default 1.0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_maps_grid_size_check'
  ) then
    alter table public.campaign_maps
      add constraint campaign_maps_grid_size_check
        check (grid_size between 16 and 200);
  end if;

  -- Nought is a line drawn in pure black, one in pure white, and the overlay
  -- interpolates every channel between them. Mirrored in Sina/src/rules/grid.js.
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_maps_grid_luminance_check'
  ) then
    alter table public.campaign_maps
      add constraint campaign_maps_grid_luminance_check
        check (grid_luminance between 0.0 and 1.0);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. A mark stands on a map, and in a cell.
-- ---------------------------------------------------------------------------
--
-- `map_id` is nullable because every row written before this migration was
-- placed when a campaign had one picture; the backfill below names it. The hex
-- pair is nullable because a map with no grid has no cells.

alter table public.campaign_marks
  add column if not exists map_id uuid
    references public.campaign_maps(id) on delete cascade,
  add column if not exists hex_q integer,
  add column if not exists hex_r integer;

update public.campaign_marks m
set map_id = w.id
from public.campaign_maps w
where m.map_id is null
  and w.campaign_id = m.campaign_id
  and w.is_world_map;

-- ONE MARK PER SEAT PER MAP, where it used to be one per seat. `nulls not
-- distinct` still carries the Dungeon Master's chair — whose `character_id` is
-- null — and now carries a legacy row's null map as well.
drop index if exists campaign_marks_seat_idx;

create unique index if not exists campaign_marks_seat_map_idx
  on public.campaign_marks (campaign_id, map_id, character_id) nulls not distinct;

-- ---------------------------------------------------------------------------
-- 3. Ruling a map.
-- ---------------------------------------------------------------------------
--
-- A definer rather than an UPDATE policy: RLS grants ROWS and never columns,
-- so the narrowest policy that would let a Dungeon Master rule a map also lets
-- them rewrite its URL. The parameter list is the whole of what may change.
--
-- CLAMPED RATHER THAN REFUSED, a slider deriving these.
-- `p_luminance <> p_luminance` is the NaN test: NaN passes `between` nowhere
-- but survives `least`/`greatest` intact.

create or replace function public.update_map_grid_settings(
  p_map_id uuid,
  p_enabled boolean,
  p_size integer,
  p_luminance double precision
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

  if p_luminance is null or p_luminance <> p_luminance then
    return false;
  end if;

  update public.campaign_maps
    set grid_enabled = coalesce(p_enabled, grid_enabled),
        grid_size = least(200, greatest(16, coalesce(p_size, grid_size))),
        grid_luminance = least(1.0, greatest(0.0, p_luminance))
    where id = p_map_id;

  return found;
end;
$$;

revoke all on function public.update_map_grid_settings(uuid, boolean, integer, double precision) from public;
revoke all on function public.update_map_grid_settings(uuid, boolean, integer, double precision) from anon;
grant execute on function public.update_map_grid_settings(uuid, boolean, integer, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Placing a token, on a map and in a cell.
-- ---------------------------------------------------------------------------
--
-- 20260821260000's function with the map and the cell added, and one rule
-- widened: THE DUNGEON MASTER MAY PLACE ANY TOKEN AT THEIR TABLE — the same
-- authority `clear_campaign_mark` has always given them.
--
-- Dropped first: PostgREST resolves an overload by the exact set of keys it is
-- handed, so the four-argument version would go on writing rows with no map.

drop function if exists public.place_campaign_mark(
  uuid, uuid, double precision, double precision
);

create or replace function public.place_campaign_mark(
  target_campaign uuid,
  target_character uuid,
  target_map uuid,
  mark_x double precision,
  mark_y double precision,
  cell_q integer,
  cell_r integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if mark_x is null or mark_y is null
     or mark_x <> mark_x or mark_y <> mark_y then
    return false;
  end if;

  -- Your own chair, or the head of the table reaching for somebody else's
  -- piece. A character who has left the party is nobody's to place.
  if not (
    public.my_seat_at_table(target_campaign, target_character)
    or (
      public.owns_campaign(target_campaign)
      and (
        target_character is null
        or exists (
          select 1 from public.campaign_members m
          where m.campaign_id = target_campaign
            and m.character_id = target_character
        )
      )
    )
  ) then
    return false;
  end if;

  -- A map from another campaign is not a map at this table.
  if target_map is not null and not exists (
    select 1 from public.campaign_maps m
    where m.id = target_map and m.campaign_id = target_campaign
  ) then
    return false;
  end if;

  insert into public.campaign_marks (
    campaign_id, character_id, map_id, x, y, hex_q, hex_r
  )
  values (
    target_campaign,
    target_character,
    target_map,
    least(1, greatest(0, mark_x)),
    least(1, greatest(0, mark_y)),
    cell_q,
    cell_r
  )
  on conflict (campaign_id, map_id, character_id) do update
    set x = excluded.x,
        y = excluded.y,
        hex_q = excluded.hex_q,
        hex_r = excluded.hex_r,
        placed_at = now();

  return true;
end;
$$;

revoke all on function public.place_campaign_mark(uuid, uuid, uuid, double precision, double precision, integer, integer) from public;
revoke all on function public.place_campaign_mark(uuid, uuid, uuid, double precision, double precision, integer, integer) from anon;
grant execute on function public.place_campaign_mark(uuid, uuid, uuid, double precision, double precision, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Taking one off, from one map.
-- ---------------------------------------------------------------------------
--
-- The same authority as before, narrowed to the map the board is showing.

drop function if exists public.clear_campaign_mark(uuid, uuid);

create or replace function public.clear_campaign_mark(
  target_campaign uuid,
  target_character uuid,
  target_map uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not (
    public.my_seat_at_table(target_campaign, target_character)
    or public.owns_campaign(target_campaign)
  ) then
    return false;
  end if;

  -- `is not distinct from` rather than `=` on both, or the Dungeon Master's own
  -- mark and a legacy row's null map would never match their own rows.
  delete from public.campaign_marks
  where campaign_id = target_campaign
    and character_id is not distinct from target_character
    and map_id is not distinct from target_map;

  return true;
end;
$$;

revoke all on function public.clear_campaign_mark(uuid, uuid, uuid) from public;
revoke all on function public.clear_campaign_mark(uuid, uuid, uuid) from anon;
grant execute on function public.clear_campaign_mark(uuid, uuid, uuid) to authenticated;
