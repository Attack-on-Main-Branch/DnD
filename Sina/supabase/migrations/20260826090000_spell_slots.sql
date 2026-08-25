-- Spell slots: what a caster has, what they have spent, and the long rest.
--
-- The counters live on `characters` and not in a table of their own, for the
-- reason the purse does: it is five to nine small integers that are read every
-- time the sheet is, and a row per slot level would be a join for a number the
-- class table already implies.
--
--   { "1": { "used": 1, "max": 4 }, "2": { "used": 0, "max": 3 }, ... }
--
-- `max` is a SNAPSHOT and never the authority. It is written here so a reader
-- has the whole shape in one column, and it is RE-DERIVED from the character's
-- own class and level on every write below -- a character who levels up gets a
-- new maximum the next time they touch a slot, and the bar in the browser
-- derives its own from the same table meanwhile. Nothing believes the stored
-- one, which is what keeps a stale snapshot from being a wrong rule.
--
-- The four progression tables are mirrored from Sina/src/rules/spellcasting.js.
-- Changing one means changing both.

alter table public.characters
  add column if not exists spell_slots jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- What may be written into that column.
-- ---------------------------------------------------------------------------
--
-- A function because a CHECK constraint may not contain a subquery, and every
-- honest test of a jsonb object's entries is one. IMMUTABLE so the constraint
-- can call it.
--
-- The ceiling is 9 rather than the 4 any 5e table actually grants: this is a
-- sanity bound on the column, and the RULE is `spell_slot_maximum` below.
create or replace function public.valid_spell_slots(slots jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select slots is not null
     and jsonb_typeof(slots) = 'object'
     and not exists (
       select 1
       from jsonb_each(slots) as entry(slot, counts)
       where entry.slot !~ '^[1-9]$'
          or jsonb_typeof(entry.counts) <> 'object'
          or jsonb_typeof(entry.counts -> 'used') <> 'number'
          or jsonb_typeof(entry.counts -> 'max') <> 'number'
          or (entry.counts ->> 'used')::numeric < 0
          or (entry.counts ->> 'used')::numeric > 9
          or (entry.counts ->> 'max')::numeric < 0
          or (entry.counts ->> 'max')::numeric > 9
     );
$fn$;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_spell_slots_check'
  ) then
    alter table public.characters
      add constraint characters_spell_slots_check
      check (public.valid_spell_slots(spell_slots));
  end if;
end;
$ck$;

-- ---------------------------------------------------------------------------
-- The 5e progression tables.
-- ---------------------------------------------------------------------------
--
-- Rows are character levels 1 to 20; each row is how many slots that level has
-- at spell levels 1, 2, 3... A short row is the rest zero. Pact Magic is a
-- different shape -- `[how many, at what level]` -- because a Warlock's slots
-- are all at one level.
--
-- Written out as jsonb rather than as a hundred-branch CASE so the arrays are
-- the same arrays Sina/src/rules/spellcasting.js holds, and a diff between the
-- two files is readable.
create or replace function public.spell_slot_maximum(
  p_class_id text,
  p_level integer,
  p_slot integer
)
returns integer
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_kind text;
  v_row jsonb;
begin
  if p_level is null or p_level < 1 or p_level > 20
     or p_slot is null or p_slot < 1 or p_slot > 9 then
    return 0;
  end if;

  v_kind := case p_class_id
    when 'wizard' then 'full'
    when 'sorcerer' then 'full'
    when 'cleric' then 'full'
    when 'druid' then 'full'
    when 'bard' then 'full'
    when 'paladin' then 'half'
    when 'ranger' then 'half'
    when 'arcane_archer' then 'third'
    when 'warlock' then 'pact'
  end;

  if v_kind is null then
    return 0;
  end if;

  if v_kind = 'pact' then
    v_row := ('[[1,1],[2,1],[2,2],[2,2],[2,3],[2,3],[2,4],[2,4],[2,5],[2,5],'
      || '[3,5],[3,5],[3,5],[3,5],[3,5],[3,5],[4,5],[4,5],[4,5],[4,5]]')::jsonb
      -> (p_level - 1);

    return case
      when (v_row ->> 1)::integer = p_slot then (v_row ->> 0)::integer
      else 0
    end;
  end if;

  v_row := case v_kind
    when 'full' then
      ('[[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],'
       || '[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],'
       || '[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],'
       || '[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],'
       || '[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]]')::jsonb
    when 'half' then
      ('[[],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],'
       || '[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],'
       || '[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]]')::jsonb
    when 'third' then
      ('[[],[],[2],[3],[3],[3],[4,2],[4,2],[4,2],[4,3],'
       || '[4,3],[4,3],[4,3,2],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3],'
       || '[4,3,3,1],[4,3,3,1]]')::jsonb
  end -> (p_level - 1);

  return coalesce((v_row ->> (p_slot - 1))::integer, 0);
end;
$fn$;

-- ---------------------------------------------------------------------------
-- The whole column, rebuilt.
-- ---------------------------------------------------------------------------
--
-- Every write below goes through this rather than editing one key in place, and
-- that is what keeps the snapshot honest: a level gained adds the slots it
-- brought, a level taken back drops the ones it did not, and a `used` count
-- left above its new maximum is clamped rather than left to read as -1
-- remaining.
create or replace function public.spell_slots_for(
  p_class_id text,
  p_level integer,
  p_current jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_out jsonb := '{}'::jsonb;
  v_slot integer;
  v_max integer;
  v_used integer;
  v_held jsonb;
begin
  for v_slot in 1..9 loop
    v_max := public.spell_slot_maximum(p_class_id, p_level, v_slot);

    if v_max > 0 then
      v_held := (coalesce(p_current, '{}'::jsonb)) -> v_slot::text;

      v_used := case
        when jsonb_typeof(v_held -> 'used') = 'number'
          then (v_held ->> 'used')::integer
        else 0
      end;

      v_out := v_out || jsonb_build_object(
        v_slot::text,
        jsonb_build_object('used', least(v_max, greatest(0, v_used)), 'max', v_max)
      );
    end if;
  end loop;

  return v_out;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Spending one, getting one back, and the long rest.
-- ---------------------------------------------------------------------------
--
-- SECURITY DEFINER, and the guard inside IS the permission -- `characters` has
-- no UPDATE policy at all, so this is the only door. The pair admitted is the
-- pair the spellbook's own policies admit in 20260825090000: the character's
-- owner, and the Dungeon Master of a table they sit at. Not campaign-scoped
-- like `set_character_health`, because `character_at_my_table` already asks
-- exactly this question and the spellbook is already written against it.
--
-- FOR UPDATE is what makes the count atomic: two browsers casting the last
-- 3rd-level slot cannot both pass the `used < max` test, which is the whole
-- reason this is a function and not a PostgREST update.
--
-- Null is a refusal -- no such character, no such slot, none left, or not the
-- caller's to spend -- and a caller must not be able to tell those apart.
create or replace function public.consume_spell_slot(
  target_character uuid,
  p_slot integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_class text;
  v_level integer;
  v_slots jsonb;
  v_max integer;
  v_used integer;
begin
  if p_slot is null or p_slot < 1 or p_slot > 9 then
    return null;
  end if;

  if not (
    public.owns_character(target_character)
    or public.character_at_my_table(target_character)
  ) then
    return null;
  end if;

  select c.class_id, c.level, coalesce(c.spell_slots, '{}'::jsonb)
    into v_class, v_level, v_slots
  from public.characters c
  where c.id = target_character
  for update;

  if not found then
    return null;
  end if;

  v_slots := public.spell_slots_for(v_class, v_level, v_slots);
  v_max := public.spell_slot_maximum(v_class, v_level, p_slot);

  if v_max = 0 then
    return null;
  end if;

  v_used := (v_slots -> p_slot::text ->> 'used')::integer;

  -- The one test this function exists for. Refused rather than clamped: a cast
  -- with nothing to pay for it is a cast that must not happen.
  if v_used >= v_max then
    return null;
  end if;

  v_slots := jsonb_set(
    v_slots, array[p_slot::text, 'used'], to_jsonb(v_used + 1)
  );

  update public.characters set spell_slots = v_slots where id = target_character;

  return v_slots;
end;
$fn$;

-- Clamped at zero rather than refused, unlike spending: giving back a slot that
-- was never spent is a miscount being corrected, and the bar is where somebody
-- corrects it.
create or replace function public.restore_spell_slot(
  target_character uuid,
  p_slot integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_class text;
  v_level integer;
  v_slots jsonb;
  v_max integer;
  v_used integer;
begin
  if p_slot is null or p_slot < 1 or p_slot > 9 then
    return null;
  end if;

  if not (
    public.owns_character(target_character)
    or public.character_at_my_table(target_character)
  ) then
    return null;
  end if;

  select c.class_id, c.level, coalesce(c.spell_slots, '{}'::jsonb)
    into v_class, v_level, v_slots
  from public.characters c
  where c.id = target_character
  for update;

  if not found then
    return null;
  end if;

  v_slots := public.spell_slots_for(v_class, v_level, v_slots);
  v_max := public.spell_slot_maximum(v_class, v_level, p_slot);

  if v_max = 0 then
    return null;
  end if;

  v_used := (v_slots -> p_slot::text ->> 'used')::integer;

  v_slots := jsonb_set(
    v_slots, array[p_slot::text, 'used'], to_jsonb(greatest(0, v_used - 1))
  );

  update public.characters set spell_slots = v_slots where id = target_character;

  return v_slots;
end;
$fn$;

-- Every counter back to nothing, and the shape rebuilt while it is there: a
-- long rest is the one moment a character's slots are certainly correct.
create or replace function public.long_rest_spell_slots(target_character uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_class text;
  v_level integer;
  v_slots jsonb;
begin
  if not (
    public.owns_character(target_character)
    or public.character_at_my_table(target_character)
  ) then
    return null;
  end if;

  select c.class_id, c.level into v_class, v_level
  from public.characters c
  where c.id = target_character
  for update;

  if not found then
    return null;
  end if;

  -- `'{}'` and not the row's own: nothing is carried over a rest.
  v_slots := public.spell_slots_for(v_class, v_level, '{}'::jsonb);

  update public.characters set spell_slots = v_slots where id = target_character;

  return v_slots;
end;
$fn$;

revoke all on function public.valid_spell_slots(jsonb) from public;
revoke all on function public.valid_spell_slots(jsonb) from anon;

revoke all on function public.spell_slot_maximum(text, integer, integer) from public;
revoke all on function public.spell_slot_maximum(text, integer, integer) from anon;
grant execute on function public.spell_slot_maximum(text, integer, integer) to authenticated;

revoke all on function public.spell_slots_for(text, integer, jsonb) from public;
revoke all on function public.spell_slots_for(text, integer, jsonb) from anon;

revoke all on function public.consume_spell_slot(uuid, integer) from public;
revoke all on function public.consume_spell_slot(uuid, integer) from anon;
grant execute on function public.consume_spell_slot(uuid, integer) to authenticated;

revoke all on function public.restore_spell_slot(uuid, integer) from public;
revoke all on function public.restore_spell_slot(uuid, integer) from anon;
grant execute on function public.restore_spell_slot(uuid, integer) to authenticated;

revoke all on function public.long_rest_spell_slots(uuid) from public;
revoke all on function public.long_rest_spell_slots(uuid) from anon;
grant execute on function public.long_rest_spell_slots(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The party's slots, for the head of the table.
-- ---------------------------------------------------------------------------
--
-- 20260824200000's function again with two more columns. A player reads their
-- own `characters` row; a Dungeon Master has no such door, and the slot bar has
-- to draw for whoever they have selected in the drawer.
--
-- `class_id` comes too, even though `campaign_party` already carries it: the
-- maximum is derived from the class AND the level together, and a function that
-- answers one without the other invites the two being read from different
-- rows.
--
-- Dropped first because the RETURN TYPE changes, which `create or replace`
-- cannot do.
drop function if exists public.campaign_sheets(uuid);

create or replace function public.campaign_sheets(target_campaign uuid)
returns table (
  id uuid,
  class_id text,
  level integer,
  skills jsonb,
  spell_slots jsonb,
  ability_str integer,
  ability_dex integer,
  ability_con integer,
  ability_int integer,
  ability_wis integer,
  ability_cha integer,
  ability_str_total integer,
  ability_dex_total integer,
  ability_con_total integer,
  ability_int_total integer,
  ability_wis_total integer,
  ability_cha_total integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.class_id, c.level, c.skills, c.spell_slots,
         c.ability_str, c.ability_dex, c.ability_con,
         c.ability_int, c.ability_wis, c.ability_cha,
         c.ability_str_total, c.ability_dex_total, c.ability_con_total,
         c.ability_int_total, c.ability_wis_total, c.ability_cha_total
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and public.owns_campaign(target_campaign)
  order by m.added_at;
$$;

revoke all on function public.campaign_sheets(uuid) from public;
revoke all on function public.campaign_sheets(uuid) from anon;
grant execute on function public.campaign_sheets(uuid) to authenticated;
