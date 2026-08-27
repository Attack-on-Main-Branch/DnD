-- An armour class you start with rather than one everybody starts at ten.
--
-- 20260909090000 gave the column a flat default, which made every character on
-- the rail equally hard to hit until somebody moved the stepper. 5e already
-- answers this: ten plus dexterity, and for the two paths with Unarmored
-- Defense a second modifier on top — Constitution for a Barbarian, Wisdom for a
-- Monk.
--
-- A BASE AND NOT A VALUE, which is the whole difference between this and
-- `max_hp`. Nobody types a maximum any more because there is no such thing as a
-- maximum somebody chose; an armour class is different — plate is 18 whatever
-- your dexterity — so the stepper on the shield stays, and this only answers for
-- a row nobody has touched. The trigger below is what draws that line.
--
-- Mirrors `baseArmorClass` in Sina/src/rules/death.js. Changing one means
-- changing both.

-- ---------------------------------------------------------------------------
-- What a race adds, for any of the six.
-- ---------------------------------------------------------------------------
--
-- 20260907090000 needed Constitution alone and wrote `race_con_bonus` for it.
-- This one needs Dexterity and Wisdom as well, so the whole table goes in —
-- mirrors RACE_ABILITY_BONUSES in Sina/src/rules/character.js.
--
-- It exists for the reason that one does: a BEFORE trigger cannot read a STORED
-- generated column, so `new.ability_dex_total` there is last statement's answer
-- or nothing at all. The bonus is added by hand instead.
create or replace function public.race_ability_bonus(
  p_race text,
  p_ability text
)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select coalesce(
    case p_race
      when 'Human' then case p_ability
        when 'str' then 1 when 'dex' then 1 when 'con' then 1 end
      when 'Dragonborn' then case p_ability
        when 'str' then 2 when 'cha' then 1 end
      when 'Dwarf' then case p_ability
        when 'con' then 2 when 'str' then 1 end
      when 'Elf' then case p_ability
        when 'dex' then 2 when 'int' then 1 end
      when 'Gnome' then case p_ability
        when 'int' then 2 when 'dex' then 1 end
      when 'Half-Elf' then case p_ability
        when 'cha' then 2 when 'dex' then 1 end
      when 'Half-Orc' then case p_ability
        when 'str' then 2 when 'con' then 1 end
      when 'Halfling' then case p_ability
        when 'dex' then 2 when 'cha' then 1 end
      when 'Tiefling' then case p_ability
        when 'cha' then 2 when 'int' then 1 end
    end,
    0
  );
$fn$;

revoke all on function public.race_ability_bonus(text, text) from public;
revoke all on function public.race_ability_bonus(text, text) from anon;
grant execute on function public.race_ability_bonus(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The figure itself.
-- ---------------------------------------------------------------------------
--
-- The scores are TOTALS, race counted in, because that is what the sheet prints
-- a modifier from. Bounded by the column's own ends, so a Barbarian with two
-- terrible scores lands on the floor rather than under it.
create or replace function public.base_armor_class(
  p_class_id text,
  p_dex_total integer,
  p_con_total integer,
  p_wis_total integer
)
returns integer
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_path text := lower(btrim(coalesce(p_class_id, '')));
  v_total integer;
begin
  v_total := 10 + floor((coalesce(p_dex_total, 10) - 10) / 2.0);

  if v_path = 'barbarian' then
    v_total := v_total + floor((coalesce(p_con_total, 10) - 10) / 2.0);
  elsif v_path = 'monk' then
    v_total := v_total + floor((coalesce(p_wis_total, 10) - 10) / 2.0);
  end if;

  return greatest(0, least(99, v_total));
end;
$fn$;

revoke all on function public.base_armor_class(text, integer, integer, integer) from public;
revoke all on function public.base_armor_class(text, integer, integer, integer) from anon;
grant execute on function public.base_armor_class(text, integer, integer, integer) to authenticated;

-- The same figure for a row, so the trigger and the backfill cannot disagree.
create or replace function public.row_base_armor_class(c public.characters)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select public.base_armor_class(
    c.class_id,
    c.ability_dex + public.race_ability_bonus(c.race, 'dex'),
    c.ability_con + public.race_ability_bonus(c.race, 'con'),
    c.ability_wis + public.race_ability_bonus(c.race, 'wis')
  );
$fn$;

revoke all on function public.row_base_armor_class(public.characters) from public;
revoke all on function public.row_base_armor_class(public.characters) from anon;
grant execute on function public.row_base_armor_class(public.characters) to authenticated;

-- ---------------------------------------------------------------------------
-- Keeping it true, up to the point somebody disagrees with it.
-- ---------------------------------------------------------------------------
--
-- ON INSERT the row starts at its base.
--
-- ON UPDATE there are two questions, and both have to be yes before anything is
-- written:
--
--   is this statement leaving `armor_class` alone?   — otherwise it IS the
--     stepper, or `update_armor_class`, and overwriting it with a derived
--     figure would make the shield unmovable.
--
--   is the standing value still the OLD base?        — otherwise somebody has
--     already set it by hand, and a dexterity raised at eighth level must not
--     take their plate off.
--
-- So an untouched armour class follows the sheet, and a chosen one is theirs.
-- There is no "has been set" column and there does not need to be: the two
-- questions between them are that column.
create or replace function public.sync_armor_class()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'INSERT' then
    new.armor_class := public.row_base_armor_class(new);

    return new;
  end if;

  if new.armor_class is distinct from old.armor_class then
    return new;
  end if;

  if old.armor_class = public.row_base_armor_class(old) then
    new.armor_class := public.row_base_armor_class(new);
  end if;

  return new;
end;
$fn$;

revoke all on function public.sync_armor_class() from public;
revoke all on function public.sync_armor_class() from anon;
revoke all on function public.sync_armor_class() from authenticated;

drop trigger if exists characters_sync_armor_class on public.characters;
create trigger characters_sync_armor_class
  before insert or update of
    class_id, race, ability_dex, ability_con, ability_wis, armor_class
  on public.characters
  for each row
  execute function public.sync_armor_class();

-- ---------------------------------------------------------------------------
-- Every row that was written before there was a figure to give it.
-- ---------------------------------------------------------------------------
--
-- Only the ones still standing on the flat default that 20260909090000 handed
-- out. A ten that a table has since chosen for itself is indistinguishable from
-- one nobody touched, and this runs once, the day after that file: there has
-- been no time for anybody to choose one.
update public.characters c
  set armor_class = public.row_base_armor_class(c)
  where c.armor_class = 10
    and public.row_base_armor_class(c) <> 10;
