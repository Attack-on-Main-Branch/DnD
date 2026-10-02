-- The Artificer: a fourth path for the Mage.
--
-- Three things in the database are keyed on a path, and each learns it here:
-- the pair a row may hold, the die its hit points are worked from, and the
-- table its spell slots are read off. Saving throws and proficiencies are
-- derived on read in Sina and have nothing to change down here.
--
-- This is now the highest-numbered file that defines `hit_die` and
-- `spell_slot_maximum`, and the one to re-run after an out-of-order paste.

-- ---------------------------------------------------------------------------
-- The pair.
-- ---------------------------------------------------------------------------
--
-- 20260814195921's tuple check with one more pair. Dropped and re-added rather
-- than guarded by `if not exists`, which would leave the old list standing.
alter table public.characters
  drop constraint if exists characters_class_check;

alter table public.characters
  add constraint characters_class_check check (
    (archetype is null and class_id is null)
    or (
      archetype is not null
      and class_id is not null
      and (archetype, class_id) in (
        ('warrior', 'barbarian'),
        ('warrior', 'fighter'),
        ('warrior', 'paladin'),
        ('mage', 'wizard'),
        ('mage', 'sorcerer'),
        ('mage', 'warlock'),
        ('mage', 'artificer'),
        ('archer', 'ranger'),
        ('archer', 'arcane_archer'),
        ('assassin', 'rogue'),
        ('assassin', 'monk'),
        ('priest', 'cleric'),
        ('priest', 'druid'),
        ('priest', 'bard')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- The die. Mirrors HIT_DICE in Sina/src/rules/hp.js.
-- ---------------------------------------------------------------------------
create or replace function public.hit_die(p_class_id text)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select case lower(btrim(coalesce(p_class_id, '')))
    when 'barbarian' then 12
    when 'fighter' then 10
    when 'paladin' then 10
    when 'wizard' then 6
    when 'sorcerer' then 6
    when 'warlock' then 8
    when 'artificer' then 8
    when 'ranger' then 10
    when 'arcane_archer' then 10
    when 'arcane archer' then 10
    when 'rogue' then 8
    when 'thief' then 8
    when 'thief / rogue' then 8
    when 'thief/rogue' then 8
    when 'monk' then 8
    when 'cleric' then 8
    when 'druid' then 8
    when 'bard' then 8
  end;
$fn$;

revoke all on function public.hit_die(text) from public;
revoke all on function public.hit_die(text) from anon;
grant execute on function public.hit_die(text) to authenticated;

-- ---------------------------------------------------------------------------
-- The slots. Mirrors Sina/src/rules/spellcasting.js.
-- ---------------------------------------------------------------------------
--
-- 20260826090000's function with a fifth table: `half_up`, the half caster
-- that rounds up. It is the half table with two slots at 1st level instead of
-- none.
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
    when 'artificer' then 'half_up'
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
    when 'half_up' then
      ('[[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],'
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

revoke all on function public.spell_slot_maximum(text, integer, integer) from public;
revoke all on function public.spell_slot_maximum(text, integer, integer) from anon;
grant execute on function public.spell_slot_maximum(text, integer, integer) to authenticated;
