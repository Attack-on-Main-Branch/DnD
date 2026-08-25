-- What a character has learned, and the shelf each spell sits on.
--
-- A shelf, not a stack. `(character_id, spell_slug)` is unique for the reason
-- the pack's key is -- but where a second Potion of Healing is a quantity of
-- two, a second Fireball is nothing at all. A spell is known or it is not, so
-- this table has no `quantity` column and never will.
--
-- The spellbook belongs to the CHARACTER and not to the campaign, exactly as
-- the pack does: a character can sit at more than one table and what they know
-- travels with them.
--
-- Every column but `is_prepared` is a COPY of what the SRD said when the spell
-- was learned, written through Sina/src/rules/spells.js. The same trade
-- 20260822160000 makes for items and for the same reason: the table plays on
-- what it read at the time, not on whatever an external API answers tonight.

create table if not exists public.character_spells (
  id uuid primary key default gen_random_uuid(),

  character_id uuid not null
    references public.characters (id) on delete cascade,

  -- The shelf key. Derived from the SRD's own index in
  -- Sina/src/rules/spells.js and never chosen by the browser, or a caller could
  -- land a learn on another row.
  spell_slug text not null,

  name text not null,

  -- 0 is a cantrip, 1 through 9 are the levels. Mirrors CANTRIP_LEVEL and
  -- MAX_SPELL_LEVEL in the rules layer.
  level integer not null,

  school text not null default '',

  -- What a caster reads first, in the order they read it: can I cast it now,
  -- how far does it reach, how long does it last.
  casting_time text not null default '',
  -- `range_text` and not `range`: RANGE is a keyword in a window frame clause,
  -- and a column that has to be quoted in half the places it appears is a
  -- column that will one day be quoted in only half of them.
  range_text text not null default '',
  duration text not null default '',

  components text not null default '',
  material text not null default '',

  concentration boolean not null default false,
  ritual boolean not null default false,

  -- "DEX save" or "Ranged spell attack", and "8d6 Fire". Two phrases rather
  -- than one, because a spell can carry both and a table reads them apart.
  attack_save text not null default '',
  damage text not null default '',

  description text not null default '',
  higher_level text not null default '',
  classes text not null default '',

  -- 5e's own rule: a levelled spell is prepared for the day, a cantrip always
  -- is. Nothing here enforces that -- `isAlwaysPrepared` in the rules layer is
  -- what stops the toggle being offered on a cantrip at all.
  is_prepared boolean not null default false,

  created_at timestamptz not null default now(),

  unique (character_id, spell_slug)
);

-- Mirrors Sina/src/rules/spells.js. `char_length` counts code points, which is
-- what the rules layer counts too -- JS `.length` counts UTF-16 units and would
-- let an emoji-heavy name past here.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'character_spells_bounds_check'
  ) then
    alter table public.character_spells
      add constraint character_spells_bounds_check
      check (
        level between 0 and 9
        and char_length(btrim(name)) between 1 and 80
        and char_length(spell_slug) between 1 and 100
        and char_length(school) <= 40
        and char_length(casting_time) <= 80
        and char_length(range_text) <= 80
        and char_length(duration) <= 80
        and char_length(components) <= 80
        and char_length(material) <= 300
        and char_length(attack_save) <= 120
        and char_length(damage) <= 120
        and char_length(description) <= 2000
        and char_length(higher_level) <= 600
        and char_length(classes) <= 120
      );
  end if;
end;
$ck$;

-- No index beyond the unique constraint's, for the reason the pack has none:
-- every read here is "this character's spellbook" or "these characters'", and
-- `character_id` is that index's leading column.

-- The whole old row on the wire for an update or a delete, not just the key.
-- Realtime evaluates the SELECT policy below against what it is given, and a
-- delete carrying only `id` has no `character_id` for that policy to read -- so
-- without this a forgotten spell would stay in every other browser until it
-- reloaded.
alter table public.character_spells replica identity full;

alter table public.character_spells enable row level security;

-- ---------------------------------------------------------------------------
-- Who may read a spellbook, and write in it.
-- ---------------------------------------------------------------------------
--
-- Its owner, and the Dungeon Master of a campaign the character is playing in.
-- The same pair the pack admits, through the same two definer functions --
-- `owns_character` from 20260818160000 and `character_at_my_table` from
-- 20260822120000 -- so a policy here reads no RLS-protected table inline and no
-- cycle can form.
--
-- Note what this does NOT grant: one player reading another's spellbook. A
-- party member is in neither branch. Unlike an item there is nothing to hand
-- over, so no definer function reaches across that line either.

drop policy if exists "Owners and their DM read a spellbook" on public.character_spells;
create policy "Owners and their DM read a spellbook"
  on public.character_spells for select to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

drop policy if exists "Owners and their DM teach a spell" on public.character_spells;
create policy "Owners and their DM teach a spell"
  on public.character_spells for insert to authenticated
  with check (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

drop policy if exists "Owners and their DM prepare a spell" on public.character_spells;
create policy "Owners and their DM prepare a spell"
  on public.character_spells for update to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  )
  with check (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

drop policy if exists "Owners and their DM forget a spell" on public.character_spells;
create policy "Owners and their DM forget a spell"
  on public.character_spells for delete to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

-- ---------------------------------------------------------------------------
-- How many one character may know.
-- ---------------------------------------------------------------------------
--
-- Sixty, the same ceiling the campaign's item catalogue keeps, and enforced the
-- same way: an advisory lock on the character so two browsers cannot both pass
-- the count, and a raise the data layer matches on by message.
--
-- The Dungeon Master stands aside from it, as `enforce_party_limit` does for a
-- caller who does not own the campaign: teaching the party a spell each must
-- not fail on somebody else's shelf being full -- the owner's own next insert
-- is where that is felt.
create or replace function public.enforce_spell_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if (select auth.uid()) is not null
     and not public.owns_character(new.character_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.character_id::text, 3));

  if (
    select count(*) from public.character_spells
    where character_id = new.character_id
  ) >= 60 then
    raise exception 'spell_limit_reached';
  end if;

  return new;
end;
$fn$;

-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise,
-- and this one counts rows across every character. Nothing should be able to
-- call it except the trigger that owns it.
revoke all on function public.enforce_spell_limit() from public;
revoke all on function public.enforce_spell_limit() from anon;
revoke all on function public.enforce_spell_limit() from authenticated;

drop trigger if exists character_spells_enforce_limit on public.character_spells;
create trigger character_spells_enforce_limit
  before insert on public.character_spells
  for each row execute function public.enforce_spell_limit();

-- Realtime. Without the table in this publication a browser subscription
-- connects, reports SUBSCRIBED, and then never delivers anything -- the hardest
-- version of this to debug. Guarded on both sides so the file stays safe to
-- re-run, and so a database without Supabase's own publication does not fail on
-- this line.
--
-- Row Level Security still decides what is delivered: the socket carries the
-- subscriber's JWT and "Owners and their DM read a spellbook" is evaluated
-- against it, so one player is never told what another has learned.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'character_spells'
     )
  then
    alter publication supabase_realtime add table public.character_spells;
  end if;
end;
$pub$;
