-- A camera on the table, and the pictures it takes.
--
-- The Dungeon Master puts a camera on a battle map, aims it, says what each
-- piece is doing, and the server has a scene painted from that spot at head
-- height. Four parts:
--
--   1. SCENES ARE MAPS. A painted scene is a `campaign_maps` row with
--      `is_scene`, so putting one on the table, the players' board and every
--      doorbell work unchanged. Four to a campaign, the oldest giving way.
--   2. THE CAMERA AND THE DIRECTIONS ARE THE DUNGEON MASTER'S ALONE. RLS grants
--      rows and never columns, and the party reads every column of
--      `campaign_maps` and of every unhidden piece, so neither could carry
--      them. Two tables of their own, read by the owner and written only by
--      definer functions.
--   3. A SCENE TAKES NO PIECES. It is a picture seen from the ground; a disc
--      standing on it would be standing on the sky.
--   4. ONE PAINTING AT A TIME per Dungeon Master, held here because the
--      Server Actions run on as many instances as the host likes.

-- ---------------------------------------------------------------------------
-- 1. Scenes on the shelf.
-- ---------------------------------------------------------------------------

alter table public.campaign_maps
  add column if not exists is_scene boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_maps_scene_check'
  ) then
    alter table public.campaign_maps
      add constraint campaign_maps_scene_check
        check (not (is_scene and is_world_map));
  end if;
end
$$;

-- 20260920090000's guard, standing aside for scenes too: they have a ring of
-- their own below and are not among the ten.
create or replace function public.enforce_campaign_map_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_world_map or new.is_scene then
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
      and not is_scene
  ) >= 10 then
    raise exception 'map_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_campaign_map_limit() from public;
revoke all on function public.enforce_campaign_map_limit() from anon;
revoke all on function public.enforce_campaign_map_limit() from authenticated;

-- Hanging a scene. Mirrors MAX_SCENES in Sina/src/rules/scene.js.
--
-- THE OLDEST GIVES WAY, but never the one on the table: taking that would put
-- the world map back under the party mid-scene. Only one map is on the table,
-- so three of the four are always free to go.
--
-- Returns the URLs of the scenes it took down, for the caller to sweep from
-- the bucket. NULL is a refusal; an empty array is a scene hung with nothing
-- taken down.
create or replace function public.hang_scene(
  p_campaign_id uuid,
  p_id uuid,
  p_name text,
  p_url text
)
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_active uuid;
  v_gone text[] := '{}';
  v_oldest_id uuid;
  v_oldest_url text;
begin
  if not public.owns_campaign(p_campaign_id) then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text, 5));

  select c.active_map_id into v_active
  from public.campaigns c
  where c.id = p_campaign_id;

  while (
    select count(*)
    from public.campaign_maps
    where campaign_id = p_campaign_id and is_scene
  ) >= 4 loop
    v_oldest_id := null;

    select m.id, m.url into v_oldest_id, v_oldest_url
    from public.campaign_maps m
    where m.campaign_id = p_campaign_id
      and m.is_scene
      and m.id is distinct from v_active
    order by m.created_at asc
    limit 1;

    exit when v_oldest_id is null;

    delete from public.campaign_maps where id = v_oldest_id;
    v_gone := v_gone || v_oldest_url;
  end loop;

  insert into public.campaign_maps (
    id, campaign_id, name, url, is_scene, sort_order,
    grid_enabled, fog_enabled
  )
  values (
    p_id, p_campaign_id, p_name, p_url, true, 1000,
    false, false
  );

  return v_gone;
end;
$$;

revoke all on function public.hang_scene(uuid, uuid, text, text) from public;
revoke all on function public.hang_scene(uuid, uuid, text, text) from anon;
grant execute on function public.hang_scene(uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. A scene takes no pieces.
-- ---------------------------------------------------------------------------
--
-- A trigger rather than another copy of `place_map_token`: that function has
-- been replaced twice already, and a third body here would be one more place
-- for an out-of-order paste to downgrade it.

create or replace function public.refuse_pieces_on_scenes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.campaign_maps m
    where m.id = new.map_id and m.is_scene
  ) then
    raise exception 'scene_takes_no_pieces';
  end if;

  return new;
end;
$$;

revoke all on function public.refuse_pieces_on_scenes() from public;
revoke all on function public.refuse_pieces_on_scenes() from anon;
revoke all on function public.refuse_pieces_on_scenes() from authenticated;

drop trigger if exists map_placed_tokens_refuse_scenes on public.map_placed_tokens;
create trigger map_placed_tokens_refuse_scenes
  before insert or update of map_id on public.map_placed_tokens
  for each row execute function public.refuse_pieces_on_scenes();

-- ---------------------------------------------------------------------------
-- 3. The camera.
-- ---------------------------------------------------------------------------
--
-- One per map. `facing` is degrees clockwise from the top of the picture.
-- `note` is the moment itself — the weather, the hour, the mood. Bounds mirror
-- MAX_SCENE_NOTE_LENGTH.

create table if not exists public.scene_cameras (
  map_id uuid primary key references public.campaign_maps(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  world_x double precision not null,
  world_y double precision not null,
  facing double precision not null default 0,
  note text,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'scene_cameras_point_check'
  ) then
    alter table public.scene_cameras
      add constraint scene_cameras_point_check
        check (world_x between 0 and 1 and world_y between 0 and 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'scene_cameras_facing_check'
  ) then
    alter table public.scene_cameras
      add constraint scene_cameras_facing_check
        check (facing >= 0 and facing < 360);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'scene_cameras_note_check'
  ) then
    alter table public.scene_cameras
      add constraint scene_cameras_note_check
        check (note is null or char_length(note) between 1 and 300);
  end if;
end
$$;

create index if not exists scene_cameras_by_campaign
  on public.scene_cameras (campaign_id);

alter table public.scene_cameras enable row level security;

drop policy if exists "Dungeon Masters read their own cameras" on public.scene_cameras;
create policy "Dungeon Masters read their own cameras"
  on public.scene_cameras for select to authenticated
  using (public.owns_campaign(campaign_id));

-- The campaign is the MAP'S, never the caller's word for it, and only a battle
-- map takes a camera: the world map is a continent and a scene is already a
-- photograph.
create or replace function public.stage_scene_camera(
  p_map_id uuid,
  p_x double precision,
  p_y double precision,
  p_facing double precision,
  p_note text default null
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
  where m.id = p_map_id
    and not m.is_world_map
    and not m.is_scene;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return false;
  end if;

  insert into public.scene_cameras (
    map_id, campaign_id, world_x, world_y, facing, note, updated_at
  )
  values (
    p_map_id, v_campaign, p_x, p_y, p_facing,
    nullif(btrim(p_note), ''), now()
  )
  on conflict (map_id) do update
    set world_x = excluded.world_x,
        world_y = excluded.world_y,
        facing = excluded.facing,
        note = excluded.note,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.stage_scene_camera(uuid, double precision, double precision, double precision, text) from public;
revoke all on function public.stage_scene_camera(uuid, double precision, double precision, double precision, text) from anon;
grant execute on function public.stage_scene_camera(uuid, double precision, double precision, double precision, text) to authenticated;

create or replace function public.remove_scene_camera(p_map_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_map(p_map_id) then
    return false;
  end if;

  delete from public.scene_cameras where map_id = p_map_id;

  return true;
end;
$$;

revoke all on function public.remove_scene_camera(uuid) from public;
revoke all on function public.remove_scene_camera(uuid) from anon;
grant execute on function public.remove_scene_camera(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. What each piece is doing.
-- ---------------------------------------------------------------------------
--
-- Keyed on the PLACED piece, so it goes when the piece does. Bounds mirror
-- MAX_DIRECTION_LENGTH.

create table if not exists public.scene_directions (
  token_id uuid primary key references public.map_placed_tokens(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  direction text not null,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'scene_directions_text_check'
  ) then
    alter table public.scene_directions
      add constraint scene_directions_text_check
        check (char_length(direction) between 1 and 200);
  end if;
end
$$;

create index if not exists scene_directions_by_campaign
  on public.scene_directions (campaign_id);

alter table public.scene_directions enable row level security;

drop policy if exists "Dungeon Masters read their own directions" on public.scene_directions;
create policy "Dungeon Masters read their own directions"
  on public.scene_directions for select to authenticated
  using (public.owns_campaign(campaign_id));

-- A blank direction takes it away rather than storing nothing.
create or replace function public.direct_scene_token(
  p_token_id uuid,
  p_direction text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_text text := nullif(btrim(p_direction), '');
begin
  select m.campaign_id into v_campaign
  from public.map_placed_tokens t
  join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return false;
  end if;

  if v_text is null then
    delete from public.scene_directions where token_id = p_token_id;
    return true;
  end if;

  insert into public.scene_directions (token_id, campaign_id, direction, updated_at)
  values (p_token_id, v_campaign, v_text, now())
  on conflict (token_id) do update
    set direction = excluded.direction,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.direct_scene_token(uuid, text) from public;
revoke all on function public.direct_scene_token(uuid, text) from anon;
grant execute on function public.direct_scene_token(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. One painting at a time.
-- ---------------------------------------------------------------------------
--
-- A row per Dungeon Master while a painting is under way. No policies at all:
-- only the two functions below touch it. A claim older than three minutes is
-- one whose request died without letting go — longer than the page's
-- `maxDuration`, so a live one is never taken over.

create table if not exists public.scene_paintings (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.scene_paintings enable row level security;

create or replace function public.begin_scene_painting(p_campaign_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_claimed uuid;
begin
  if (select auth.uid()) is null or not public.owns_campaign(p_campaign_id) then
    return false;
  end if;

  insert into public.scene_paintings (user_id, campaign_id, started_at)
  values ((select auth.uid()), p_campaign_id, now())
  on conflict (user_id) do update
    set campaign_id = excluded.campaign_id,
        started_at = now()
    where public.scene_paintings.started_at < now() - interval '180 seconds'
  returning user_id into v_claimed;

  return v_claimed is not null;
end;
$$;

revoke all on function public.begin_scene_painting(uuid) from public;
revoke all on function public.begin_scene_painting(uuid) from anon;
grant execute on function public.begin_scene_painting(uuid) to authenticated;

create or replace function public.end_scene_painting()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.scene_paintings where user_id = (select auth.uid());

  return true;
end;
$$;

revoke all on function public.end_scene_painting() from public;
revoke all on function public.end_scene_painting() from anon;
grant execute on function public.end_scene_painting() to authenticated;
