-- A hand of pieces, and the board they stand on.
--
-- Two tables arrive together. `campaign_token_templates` is what a Dungeon
-- Master INVENTS — five pictures with names, made on the campaign sheet beside
-- the items and the chests. `map_placed_tokens` is where a piece STANDS, and it
-- takes over from `campaign_marks`: the party's own marker, each character's
-- face, and as many copies of an invented piece as the encounter needs, all in
-- one table because the board draws them as one thing.
--
-- WHY ONE TABLE AND NOT THREE: a token is a place plus a face, and which face
-- it wears is the only thing that differs. Three tables would be three reads,
-- three subscriptions and three sets of placement rules to keep in step.
--
-- WHAT A MAP DECIDES. The world map carries the party and nothing else — six
-- faces standing on a continent is a lie about where anybody is. Every other
-- map carries the faces and the monsters and never the party, for the same
-- reason from the other end. That rule lives in `place_map_token` below, so it
-- cannot be got round by a hand-built request.
--
-- HIDDEN IS NOT DRAWN FAINTLY, IT IS NOT SENT. The SELECT policy withholds a
-- hidden row from everybody but the Dungeon Master, so a player's browser never
-- has one to render, and neither does their socket. Opacity would be a promise
-- kept by the client alone.

-- ---------------------------------------------------------------------------
-- 1. The hand.
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_token_templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  -- The same bounds the rules layer keeps — see Sina/src/rules/tokens.js.
  -- `char_length` and not `length`, matching that layer's code-point counting.
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_token_templates_name_check'
  ) then
    alter table public.campaign_token_templates
      add constraint campaign_token_templates_name_check
        check (char_length(btrim(name)) between 1 and 40);
  end if;

  -- Built by this app and never reaching four hundred, as a map's URL is not.
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_token_templates_image_check'
  ) then
    alter table public.campaign_token_templates
      add constraint campaign_token_templates_image_check
        check (char_length(image_url) between 1 and 400);
  end if;
end
$$;

create index if not exists campaign_token_templates_by_campaign
  on public.campaign_token_templates (campaign_id, created_at);

alter table public.campaign_token_templates enable row level security;

-- Read: the Dungeon Master, and anybody with a character in the party — a
-- player's board has to draw the monster standing in front of them. Both
-- questions cross into another RLS-protected table, so both go through the
-- `security definer` helpers from 20260818160000.
--
-- Write: the Dungeon Master alone. A piece is invented, not found.

drop policy if exists "The table reads its own pieces" on public.campaign_token_templates;
create policy "The table reads its own pieces"
  on public.campaign_token_templates for select to authenticated
  using (
    public.owns_campaign(campaign_id)
    or public.my_character_in_campaign(campaign_id)
  );

drop policy if exists "Dungeon Masters invent their own pieces" on public.campaign_token_templates;
create policy "Dungeon Masters invent their own pieces"
  on public.campaign_token_templates for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters take their own pieces back" on public.campaign_token_templates;
create policy "Dungeon Masters take their own pieces back"
  on public.campaign_token_templates for delete to authenticated
  using (public.owns_campaign(campaign_id));

-- No UPDATE policy. A piece is a picture and a name, and changing either is
-- indistinguishable from making a new one — which costs a slot and says so.

-- ---------------------------------------------------------------------------
-- 2. Five of them.
-- ---------------------------------------------------------------------------
--
-- enforce_campaign_map_limit's shape, including the two things that trigger had
-- to learn: the advisory lock, because two requests read the same pre-state
-- under READ COMMITTED; and `auth.uid() is not null`, so the guard keeps
-- applying for the sessions that bypass RLS. Lock seed 4, against a campaign id.
--
-- Mirrors MAX_CAMPAIGN_TOKENS in Sina/src/rules/tokens.js.

create or replace function public.enforce_token_template_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not public.owns_campaign(new.campaign_id)
  then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 4));

  if (
    select count(*)
    from public.campaign_token_templates
    where campaign_id = new.campaign_id
  ) >= 5 then
    raise exception 'token_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_token_template_limit() from public;
revoke all on function public.enforce_token_template_limit() from anon;
revoke all on function public.enforce_token_template_limit() from authenticated;

drop trigger if exists campaign_token_templates_enforce_limit
  on public.campaign_token_templates;
create trigger campaign_token_templates_enforce_limit
  before insert on public.campaign_token_templates
  for each row execute function public.enforce_token_template_limit();

-- ---------------------------------------------------------------------------
-- 3. The board.
-- ---------------------------------------------------------------------------
--
-- `world_x` and `world_y` are FRACTIONS OF THE PICTURE, the coordinates
-- `campaign_marks` already drew from: they survive every chair drawing the map
-- at a different size. The hex pair is the CELL, a different fact — it survives
-- a resize too, and it says two pieces share a square without the database
-- knowing any geometry. Null where a map carries no grid.

create table if not exists public.map_placed_tokens (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.campaign_maps(id) on delete cascade,
  character_id uuid references public.characters(id) on delete cascade,
  template_id uuid references public.campaign_token_templates(id) on delete cascade,
  is_party_marker boolean not null default false,
  hex_q integer,
  hex_r integer,
  world_x double precision not null default 0,
  world_y double precision not null default 0,
  ring_color text not null default '#ef4444',
  is_hidden boolean not null default false,
  is_dead boolean not null default false,
  conditions text[] not null default '{}'::text[],
  placed_at timestamptz not null default now()
);

do $$
begin
  -- ONE FACE PER PIECE. A row naming both a character and an invented piece is
  -- a token the board cannot draw, and a row naming neither is a token with no
  -- picture at all.
  if not exists (
    select 1 from pg_constraint where conname = 'map_placed_tokens_one_face_check'
  ) then
    alter table public.map_placed_tokens
      add constraint map_placed_tokens_one_face_check
        check (
          (character_id is not null)::integer
          + (template_id is not null)::integer
          + is_party_marker::integer = 1
        );
  end if;

  -- Fractions, clamped the same way `place_campaign_mark` clamps a mark's.
  if not exists (
    select 1 from pg_constraint where conname = 'map_placed_tokens_point_check'
  ) then
    alter table public.map_placed_tokens
      add constraint map_placed_tokens_point_check
        check (world_x between 0 and 1 and world_y between 0 and 1);
  end if;

  -- Six lowercase hex digits. The palette itself is the rules layer's — see
  -- TOKEN_RING_COLORS — and this is only what a colour may LOOK like, so a
  -- palette repainted in a later release does not orphan the rows already down.
  if not exists (
    select 1 from pg_constraint where conname = 'map_placed_tokens_ring_check'
  ) then
    alter table public.map_placed_tokens
      add constraint map_placed_tokens_ring_check
        check (ring_color ~ '^#[0-9a-f]{6}$');
  end if;

  -- The same fifteen a character may be under, through the same function.
  if not exists (
    select 1 from pg_constraint where conname = 'map_placed_tokens_conditions_check'
  ) then
    alter table public.map_placed_tokens
      add constraint map_placed_tokens_conditions_check
        check (public.conditions_are_valid(conditions));
  end if;
end
$$;

-- One read per map, which is the only read this table has.
create index if not exists map_placed_tokens_by_map
  on public.map_placed_tokens (map_id, placed_at);

-- ONE FACE PER MAP for the two singular pieces, so placing a character's token
-- where it already stands MOVES it rather than dealing a second one. An
-- invented piece has no such index: putting three goblins on the board is the
-- whole point of having invented one.
create unique index if not exists map_placed_tokens_one_character
  on public.map_placed_tokens (map_id, character_id)
  where character_id is not null;

create unique index if not exists map_placed_tokens_one_party
  on public.map_placed_tokens (map_id)
  where is_party_marker;

alter table public.map_placed_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Which map is at my table.
-- ---------------------------------------------------------------------------
--
-- The two questions the policies below ask, as definer functions rather than
-- inline `exists` over `campaign_maps` — which is itself RLS-protected, and a
-- policy reading another table's policies is the recursion 20260818160000 was
-- written to break.

create or replace function public.owns_map(target_map uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_maps m
    join public.campaigns c on c.id = m.campaign_id
    where m.id = target_map and c.user_id = (select auth.uid())
  );
$$;

create or replace function public.map_at_my_table(target_map uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_maps m
    where m.id = target_map
      and (
        public.owns_campaign(m.campaign_id)
        or public.my_character_in_campaign(m.campaign_id)
      )
  );
$$;

revoke all on function public.owns_map(uuid) from public;
revoke all on function public.owns_map(uuid) from anon;
grant execute on function public.owns_map(uuid) to authenticated;

revoke all on function public.map_at_my_table(uuid) from public;
revoke all on function public.map_at_my_table(uuid) from anon;
grant execute on function public.map_at_my_table(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Who sees a piece, and who moves one.
-- ---------------------------------------------------------------------------
--
-- READ is the whole of the hiding. A hidden piece is the Dungeon Master's own
-- row and nobody else's, so a player's `select()` returns nothing for it and
-- Realtime — which evaluates these same policies against the subscriber's JWT —
-- delivers nothing either. There is no version of this token in a player's
-- browser to be revealed by reading the page source.
--
-- There are NO WRITE POLICIES AT ALL, the shape `campaign_members` and
-- `notifications` already take. RLS grants whole ROWS: the narrowest UPDATE
-- policy that let a player drag their own token would also let them set
-- `is_hidden` on it, or move somebody else's piece by naming it. The four
-- definer functions below are the only writers, and each asks a different
-- question about who is doing what.

drop policy if exists "The table reads what is on the board" on public.map_placed_tokens;
create policy "The table reads what is on the board"
  on public.map_placed_tokens for select to authenticated
  using (
    public.owns_map(map_id)
    or (public.map_at_my_table(map_id) and not is_hidden)
  );

-- ---------------------------------------------------------------------------
-- 6. Putting a piece down.
-- ---------------------------------------------------------------------------
--
-- The whole placement rule, in one place:
--
--   world map      the party marker, and only from the head of the table
--   any other map  a character's own face, or any face and any invented piece
--                  from the head of the table — and never the party marker
--
-- A character token and the party marker are UPSERTS against the indexes in
-- step 3, so putting one where it already stands moves it. An invented piece is
-- always a fresh row, which is what `ring_color` distinguishes them by.
--
-- Returns the row's id, or null for a refusal. Deliberately indistinguishable
-- from a miss: a player probing which map is which learns nothing either way.

create or replace function public.place_map_token(
  p_map_id uuid,
  p_character_id uuid,
  p_template_id uuid,
  p_party boolean,
  p_x double precision,
  p_y double precision,
  p_q integer,
  p_r integer,
  p_ring_color text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_world boolean;
  v_owner boolean;
  v_ring text;
  v_id uuid;
begin
  if p_x is null or p_y is null or p_x <> p_x or p_y <> p_y then
    return null;
  end if;

  -- Exactly one face, asked here as well as by the CHECK: a refusal is a null
  -- rather than an exception the caller has to classify.
  if (p_character_id is not null)::integer
     + (p_template_id is not null)::integer
     + coalesce(p_party, false)::integer <> 1
  then
    return null;
  end if;

  select m.campaign_id, m.is_world_map into v_campaign, v_world
  from public.campaign_maps m
  where m.id = p_map_id;

  if v_campaign is null then
    return null;
  end if;

  v_owner := public.owns_campaign(v_campaign);

  if v_world then
    -- The party alone, and only the hand that speaks for the party.
    if not coalesce(p_party, false) or not v_owner then
      return null;
    end if;
  else
    -- Everywhere else the party marker is a piece with nothing to stand for:
    -- the faces themselves are on the board.
    if coalesce(p_party, false) then
      return null;
    end if;

    if p_template_id is not null then
      -- An invented piece is the Dungeon Master's to deal, and only one from
      -- this campaign's own hand.
      if not v_owner or not exists (
        select 1 from public.campaign_token_templates t
        where t.id = p_template_id and t.campaign_id = v_campaign
      ) then
        return null;
      end if;
    else
      -- Your own face, or anybody's from the head of the table — and only for
      -- a character still in this party.
      if not (
        public.my_seat_at_table(v_campaign, p_character_id)
        or (
          v_owner
          and exists (
            select 1 from public.campaign_members m
            where m.campaign_id = v_campaign
              and m.character_id = p_character_id
          )
        )
      ) then
        return null;
      end if;
    end if;
  end if;

  -- A colour outside the shape the CHECK allows takes the default rather than
  -- raising: it is a swatch the browser picked, not something typed.
  v_ring := case
    when p_ring_color ~ '^#[0-9a-f]{6}$' then p_ring_color
    else '#ef4444'
  end;

  if p_template_id is not null then
    insert into public.map_placed_tokens (
      map_id, template_id, world_x, world_y, hex_q, hex_r, ring_color
    )
    values (
      p_map_id, p_template_id,
      least(1, greatest(0, p_x)), least(1, greatest(0, p_y)),
      p_q, p_r, v_ring
    )
    returning id into v_id;

    return v_id;
  end if;

  if coalesce(p_party, false) then
    insert into public.map_placed_tokens (
      map_id, is_party_marker, world_x, world_y, hex_q, hex_r, ring_color
    )
    values (
      p_map_id, true,
      least(1, greatest(0, p_x)), least(1, greatest(0, p_y)),
      p_q, p_r, v_ring
    )
    on conflict (map_id) where is_party_marker do update
      set world_x = excluded.world_x,
          world_y = excluded.world_y,
          hex_q = excluded.hex_q,
          hex_r = excluded.hex_r,
          placed_at = now()
    returning id into v_id;

    return v_id;
  end if;

  insert into public.map_placed_tokens (
    map_id, character_id, world_x, world_y, hex_q, hex_r, ring_color
  )
  values (
    p_map_id, p_character_id,
    least(1, greatest(0, p_x)), least(1, greatest(0, p_y)),
    p_q, p_r, v_ring
  )
  on conflict (map_id, character_id) where character_id is not null do update
    set world_x = excluded.world_x,
        world_y = excluded.world_y,
        hex_q = excluded.hex_q,
        hex_r = excluded.hex_r,
        placed_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.place_map_token(uuid, uuid, uuid, boolean, double precision, double precision, integer, integer, text) from public;
revoke all on function public.place_map_token(uuid, uuid, uuid, boolean, double precision, double precision, integer, integer, text) from anon;
grant execute on function public.place_map_token(uuid, uuid, uuid, boolean, double precision, double precision, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Moving one that is already down.
-- ---------------------------------------------------------------------------
--
-- The id names the row, so the rule is the same one asked from the other end:
-- your own face, or anything at a table you run.

create or replace function public.move_map_token(
  p_token_id uuid,
  p_x double precision,
  p_y double precision,
  p_q integer,
  p_r integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_character uuid;
begin
  if p_x is null or p_y is null or p_x <> p_x or p_y <> p_y then
    return false;
  end if;

  select m.campaign_id, t.character_id into v_campaign, v_character
  from public.map_placed_tokens t
  join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;

  if v_campaign is null then
    return false;
  end if;

  -- A piece with no character — the party marker, an invented one — belongs to
  -- the head of the table, which is what `my_seat_at_table(_, null)` asks.
  if not (
    public.owns_campaign(v_campaign)
    or (v_character is not null
        and public.my_seat_at_table(v_campaign, v_character))
  ) then
    return false;
  end if;

  update public.map_placed_tokens
    set world_x = least(1, greatest(0, p_x)),
        world_y = least(1, greatest(0, p_y)),
        hex_q = p_q,
        hex_r = p_r,
        placed_at = now()
    where id = p_token_id;

  return found;
end;
$$;

revoke all on function public.move_map_token(uuid, double precision, double precision, integer, integer) from public;
revoke all on function public.move_map_token(uuid, double precision, double precision, integer, integer) from anon;
grant execute on function public.move_map_token(uuid, double precision, double precision, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. What a piece is suffering.
-- ---------------------------------------------------------------------------
--
-- Hidden, killed and the fifteen conditions, written together because the
-- context menu that sets them is one menu — and because laying them down one at
-- a time draws a frame of a piece that is dead but not yet greyed.
--
-- THE HEAD OF THE TABLE'S ALONE. Hiding is the whole of the surprise, and a
-- player who could set it on their own token could set it on a monster.
--
-- Every argument is optional: null leaves that column where it stands.

create or replace function public.set_map_token_state(
  p_token_id uuid,
  p_hidden boolean,
  p_dead boolean,
  p_conditions text[]
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
  from public.map_placed_tokens t
  join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return false;
  end if;

  if p_conditions is not null
     and not public.conditions_are_valid(p_conditions)
  then
    return false;
  end if;

  update public.map_placed_tokens
    set is_hidden = coalesce(p_hidden, is_hidden),
        is_dead = coalesce(p_dead, is_dead),
        conditions = coalesce(p_conditions, conditions)
    where id = p_token_id;

  return found;
end;
$$;

revoke all on function public.set_map_token_state(uuid, boolean, boolean, text[]) from public;
revoke all on function public.set_map_token_state(uuid, boolean, boolean, text[]) from anon;
grant execute on function public.set_map_token_state(uuid, boolean, boolean, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Taking one off.
-- ---------------------------------------------------------------------------

create or replace function public.remove_map_token(p_token_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_character uuid;
begin
  select m.campaign_id, t.character_id into v_campaign, v_character
  from public.map_placed_tokens t
  join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;

  if v_campaign is null then
    return false;
  end if;

  if not (
    public.owns_campaign(v_campaign)
    or (v_character is not null
        and public.my_seat_at_table(v_campaign, v_character))
  ) then
    return false;
  end if;

  delete from public.map_placed_tokens where id = p_token_id;

  return true;
end;
$$;

revoke all on function public.remove_map_token(uuid) from public;
revoke all on function public.remove_map_token(uuid) from anon;
grant execute on function public.remove_map_token(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Sweeping a map clear.
-- ---------------------------------------------------------------------------
--
-- WHAT THIS IS FOR: ruling a map that was being played free-form. The pieces
-- standing on it were put down at points the grid knows nothing about, and
-- scattering them across the nearest cells would be the app guessing at
-- positions the Dungeon Master is about to set deliberately. So the board is
-- swept and the pieces are dealt again, onto the hexes they belong on.
--
-- The Dungeon Master's alone, as ruling the map is.

create or replace function public.clear_map_placed_tokens(p_map_id uuid)
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

  delete from public.map_placed_tokens where map_id = p_map_id;

  return true;
end;
$$;

revoke all on function public.clear_map_placed_tokens(uuid) from public;
revoke all on function public.clear_map_placed_tokens(uuid) from anon;
grant execute on function public.clear_map_placed_tokens(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. The marks already on the board.
-- ---------------------------------------------------------------------------
--
-- `campaign_marks` is what this table replaces, and every row in it is a piece
-- somebody put down in a session that has already happened. They are carried
-- over rather than dropped: a party that left the board set up mid-encounter
-- comes back to it.
--
-- A mark with no map belongs to a campaign that has never switched pictures —
-- its world map's row is the one 20260920090000 derives. A mark with no
-- character is the head of the table's, which is the party marker here.
--
-- The old table is left standing. Nothing reads it after this release, and
-- dropping it would throw away the only copy of anything this insert could not
-- carry across.

insert into public.map_placed_tokens (
  map_id, character_id, is_party_marker, world_x, world_y, hex_q, hex_r
)
select
  coalesce(k.map_id, w.id),
  k.character_id,
  k.character_id is null,
  least(1, greatest(0, k.x)),
  least(1, greatest(0, k.y)),
  k.hex_q,
  k.hex_r
from public.campaign_marks k
left join public.campaign_maps w
  on w.campaign_id = k.campaign_id and w.is_world_map
where coalesce(k.map_id, w.id) is not null
  -- The world map takes the party's marker and nothing else; every other map
  -- takes the faces. The rule in step 6, applied to what is already down.
  and (
    select m.is_world_map from public.campaign_maps m
    where m.id = coalesce(k.map_id, w.id)
  ) = (k.character_id is null)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 12. What the table hears.
-- ---------------------------------------------------------------------------
--
-- Row Level Security still decides what is delivered: the socket carries the
-- subscriber's JWT and the SELECT policy above is evaluated against it, so a
-- hidden piece is never sent to a player's browser.
--
-- The board answers a placement off the table's own channel rather than off
-- these — see use-map-tokens.js — and this is the honest half behind it: a
-- chair that missed the broadcast, or joined after it, is told by the database.

do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_token_templates'
     )
  then
    alter publication supabase_realtime add table public.campaign_token_templates;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'map_placed_tokens'
     )
  then
    alter publication supabase_realtime add table public.map_placed_tokens;
  end if;
end;
$pub$;
