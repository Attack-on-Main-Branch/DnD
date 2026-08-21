-- Hit points that survive a reload, and the notes a player keeps at the table.
--
-- Until now the health bar on a character sheet drew a hard-coded 100 — the
-- comment in character-panels.jsx said as much, because a bar that moved on
-- every reload would read as data. This gives it a column.

-- ---------------------------------------------------------------------------
-- Health.
-- ---------------------------------------------------------------------------
--
-- Mirrors MAX_HP in Sina/src/rules/character.js. Changing one means changing
-- both; the rules layer is not the only check, and must not be.
alter table public.characters
  add column if not exists current_hp integer not null default 100;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_current_hp_check'
  ) then
    alter table public.characters
      add constraint characters_current_hp_check
      check (current_hp between 0 and 100);
  end if;
end;
$$;

/*
 * A definer function rather than an UPDATE policy on public.characters, and the
 * distinction matters: RLS grants rows, never columns, so the narrowest policy
 * expressible here would let its holder rewrite the name, the race, the
 * backstory and the handle along with the hit points. Nothing in the app edits
 * any of those, and a door nobody is watching is worse than no door.
 *
 * So the write is this function's shape instead. One column, one row, the
 * caller's own character or nothing.
 *
 * The clamp is deliberate and is not a substitute for the CHECK above: it turns
 * a slider that overshoots into a full bar rather than an error, while the
 * constraint still stands behind anything that reaches the table another way.
 */
create or replace function public.set_character_health(
  target_character uuid,
  hit_points integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  clamped integer := least(100, greatest(0, hit_points));
begin
  if not public.owns_character(target_character) then
    return null;
  end if;

  update public.characters
    set current_hp = clamped
    where id = target_character;

  return clamped;
end;
$$;

revoke all on function public.set_character_health(uuid, integer) from public;
revoke all on function public.set_character_health(uuid, integer) from anon;
grant execute on function public.set_character_health(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Notes.
-- ---------------------------------------------------------------------------
--
-- Written at the table, read back on the character sheet. A note belongs to the
-- character, and through it to one account: nobody else reads these, the
-- Dungeon Master included. What a player writes about a session is theirs.
--
-- Ordinary policies rather than the definer functions `notifications` uses,
-- because every column here is the caller's own to set. `created_at` has a
-- default and the data layer never sends one; a forged timestamp would only
-- misdate a row its own author is the only reader of.
create table if not exists public.character_notes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,

  body text not null,

  created_at timestamptz not null default now()
);

-- Mirrors MAX_NOTE_LENGTH in Sina/src/rules/character.js. `char_length` counts
-- code points, which is what the rules layer counts too — JS `.length` counts
-- UTF-16 units and would let an emoji-heavy note past here.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'character_notes_body_check'
  ) then
    alter table public.character_notes
      add constraint character_notes_body_check
      check (char_length(btrim(body)) between 1 and 1000);
  end if;
end;
$$;

-- Every read is "this character's notes, newest first", which is this index.
create index if not exists character_notes_character_id_created_at_idx
  on public.character_notes (character_id, created_at desc);

alter table public.character_notes enable row level security;

-- `owns_character` is the definer helper from 20260818160000 — an inline
-- `exists` over public.characters would be a policy reading an RLS-protected
-- table, which is the shape that took the dashboard down once already.
drop policy if exists "Players read their own notes" on public.character_notes;
create policy "Players read their own notes"
  on public.character_notes for select to authenticated
  using (public.owns_character(character_id));

drop policy if exists "Players write their own notes" on public.character_notes;
create policy "Players write their own notes"
  on public.character_notes for insert to authenticated
  with check (public.owns_character(character_id));

-- No update policy and no delete policy: nothing in the app edits or removes a
-- note, and both come back in the migration that adds those.

-- ---------------------------------------------------------------------------
-- The party list, now carrying hit points.
-- ---------------------------------------------------------------------------
--
-- Re-declared in full rather than altered: this is the body from
-- 20260821120000_campaign_table.sql with two columns added, and running that
-- file after this one would silently drop them again. If the two are ever
-- pasted out of order, re-run this one.
--
-- `is_mine` is what lets the table tell a player which bar is theirs without
-- `user_id` ever leaving the database — the whole reason this function exists
-- rather than a policy. `current_hp` joins the display columns because the
-- Dungeon Master's board shows the whole party's health; it is a number every
-- one of them can already see across the table.
--
-- Dropped first, and that is not tidiness: `create or replace` refuses to
-- change a function's OUT parameters (SQLSTATE 42P13), and the whole point here
-- is two more of them. Nothing depends on it — the data layer calls it by name
-- through PostgREST — and the grants are restated below, which a drop takes
-- with it.
drop function if exists public.campaign_party(uuid);

create function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text,
  current_hp integer,
  is_mine boolean,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.color_theme,
         c.current_hp, public.owns_character(c.id), m.added_at
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    )
  order by m.added_at;
$$;

revoke all on function public.campaign_party(uuid) from public;
revoke all on function public.campaign_party(uuid) from anon;
grant execute on function public.campaign_party(uuid) to authenticated;
