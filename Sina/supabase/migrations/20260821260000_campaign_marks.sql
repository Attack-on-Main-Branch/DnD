-- Marks on the map: where the party is, and where each of them is standing.
--
-- A mark is dropped by right-clicking the board — gold and labelled "Party"
-- when the Dungeon Master places it, the character's own avatar when a player
-- does. It is the one thing at this table drawn ON the world rather than beside
-- it, so it has to survive a closed laptop: a token that forgets where it was
-- is a token nobody uses.
--
-- Coordinates are FRACTIONS of the picture, never pixels. The board is drawn at
-- whatever height map-height.js has left over and it zooms, so a pixel here
-- would mean a different place on every screen and at every zoom step.
--
-- One mark per SEAT, and that is the whole of the shape. An account can own
-- this campaign AND play a character in it — those are two chairs, and
-- `readSeat` in Maria's load-table.js already decides which one somebody is in.
-- The Dungeon Master's chair has no character, which is what the null
-- `character_id` is: the party's own token, the one that says "Party".

create table if not exists public.campaign_marks (
  -- A key of its own, for a reason that is not tidiness: logical replication
  -- refuses to publish a DELETE from a table with no replica identity, and
  -- clearing a mark is half of this feature. The seat is the identity a reader
  -- cares about, and that is the unique index below.
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null references public.campaigns (id) on delete cascade,

  -- Null is the Dungeon Master's chair. Nullable, so it cannot be part of a
  -- primary key — hence the index rather than a composite key.
  character_id uuid references public.characters (id) on delete cascade,

  x double precision not null,
  y double precision not null,

  placed_at timestamptz not null default now()
);

-- Fractions of the picture, both of them. `place_campaign_mark` clamps before
-- it writes, so this stands behind anything that reaches the table another way
-- — the same division of labour `characters_current_hp_check` has.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_marks_point_check'
  ) then
    alter table public.campaign_marks
      add constraint campaign_marks_point_check
      check (x between 0 and 1 and y between 0 and 1);
  end if;
end;
$$;

-- One mark per chair. `nulls not distinct` is what makes that true of the
-- Dungeon Master's too: left to itself Postgres treats every null as its own
-- value, so the head of the table would have collected a token per right-click
-- while everybody else moved one.
create unique index if not exists campaign_marks_seat_idx
  on public.campaign_marks (campaign_id, character_id) nulls not distinct;

-- The whole old row on the wire for an update or a delete, not just the key.
-- Realtime evaluates the SELECT policy below against what it is given, and a
-- delete carrying only `id` has no `campaign_id` for that policy to read — so
-- without this a cleared mark stays on everybody else's board until they
-- reload. Nothing here is a secret: a campaign id, a character id and a point.
alter table public.campaign_marks replica identity full;

alter table public.campaign_marks enable row level security;

-- Everyone at the table sees every mark — that is what a mark is for. The two
-- definer helpers from 20260818160000 ask the same question `campaign_party`
-- and the presence channel ask, so a chair at this table means the same thing
-- in all three.
drop policy if exists "The table reads its own marks" on public.campaign_marks;
create policy "The table reads its own marks"
  on public.campaign_marks for select to authenticated
  using (
    public.owns_campaign(campaign_id)
    or public.my_character_in_campaign(campaign_id)
  );

-- No INSERT, UPDATE or DELETE policy, deliberately. Every write goes through
-- one of the two definer functions below, the way `notifications` does: a
-- policy grants whole rows, and "may write a mark for this seat" is a question
-- about which chair the caller is in rather than about a row they already hold.

-- ---------------------------------------------------------------------------
-- Whose chair is this?
-- ---------------------------------------------------------------------------
--
-- The rule the rest of the table already runs on, asked where it counts. A null
-- character is the head of the table and belongs to whoever owns the campaign;
-- a character is its owner's, and only while it is still in this party — one
-- that has left cannot go on marking the map of a campaign it is no longer in.
create or replace function public.my_seat_at_table(
  target_campaign uuid,
  target_character uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_character is null then
      public.owns_campaign(target_campaign)
    else
      public.owns_character(target_character)
      and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = target_campaign
          and m.character_id = target_character
      )
  end;
$$;

-- ---------------------------------------------------------------------------
-- Placing one.
-- ---------------------------------------------------------------------------
--
-- An upsert, because a seat has one mark: right-clicking somewhere else moves
-- your token rather than leaving a trail of them. The conflict target is the
-- seat index above, which is why that index has to treat nulls as equal.
--
-- Clamped rather than refused. The browser derives the point from the picture's
-- own box, so anything outside 0..1 is a rounding artefact at the very edge and
-- not an intention worth arguing with — the same call `parseHitPoints` makes.
-- `mark_x <> mark_x` is the NaN test: a double can arrive as one, and NaN
-- passes `between 0 and 1` nowhere but survives `least`/`greatest` intact.
create or replace function public.place_campaign_mark(
  target_campaign uuid,
  target_character uuid,
  mark_x double precision,
  mark_y double precision
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

  if not public.my_seat_at_table(target_campaign, target_character) then
    return false;
  end if;

  insert into public.campaign_marks (campaign_id, character_id, x, y)
  values (
    target_campaign,
    target_character,
    least(1, greatest(0, mark_x)),
    least(1, greatest(0, mark_y))
  )
  on conflict (campaign_id, character_id) do update
    set x = excluded.x,
        y = excluded.y,
        placed_at = now();

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Taking one off.
-- ---------------------------------------------------------------------------
--
-- Your own, always. And the Dungeon Master's over any of them, for the same
-- reason they hold the pen over the party's hit points in
-- 20260821160000_dm_edits_party_health.sql: the board belongs to whoever is
-- running the session, and a token left behind by somebody who has gone to bed
-- is theirs to clear.
--
-- `is not distinct from` rather than `=`, or the Dungeon Master's own mark —
-- the one with the null character — would never match its own row.
create or replace function public.clear_campaign_mark(
  target_campaign uuid,
  target_character uuid
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

  delete from public.campaign_marks
  where campaign_id = target_campaign
    and character_id is not distinct from target_character;

  return true;
end;
$$;

-- A character who leaves the party takes their token with them. The foreign key
-- above only reaches a character deleted outright; this is the ordinary case,
-- and without it the board keeps a face nobody at the table can account for and
-- nobody but the Dungeon Master can clear.
create or replace function public.clear_marks_on_leaving()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.campaign_marks
  where campaign_id = old.campaign_id
    and character_id = old.character_id;

  return old;
end;
$$;

revoke all on function public.clear_marks_on_leaving() from public;
revoke all on function public.clear_marks_on_leaving() from anon;
revoke all on function public.clear_marks_on_leaving() from authenticated;

drop trigger if exists campaign_members_clear_marks on public.campaign_members;
create trigger campaign_members_clear_marks
  after delete on public.campaign_members
  for each row execute function public.clear_marks_on_leaving();

revoke all on function public.my_seat_at_table(uuid, uuid) from public;
revoke all on function public.my_seat_at_table(uuid, uuid) from anon;
grant execute on function public.my_seat_at_table(uuid, uuid) to authenticated;

revoke all on function public.place_campaign_mark(uuid, uuid, double precision, double precision) from public;
revoke all on function public.place_campaign_mark(uuid, uuid, double precision, double precision) from anon;
grant execute on function public.place_campaign_mark(uuid, uuid, double precision, double precision) to authenticated;

revoke all on function public.clear_campaign_mark(uuid, uuid) from public;
revoke all on function public.clear_campaign_mark(uuid, uuid) from anon;
grant execute on function public.clear_campaign_mark(uuid, uuid) to authenticated;

-- Realtime, so a mark lands on everybody's board rather than on the placer's
-- alone — the point of a shared map. Guarded on both sides so the file stays
-- safe to re-run, and so a database without Supabase's own publication does not
-- fail on this line. The SELECT policy above is what decides who is told.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_marks'
     )
  then
    alter publication supabase_realtime add table public.campaign_marks;
  end if;
end;
$pub$;
