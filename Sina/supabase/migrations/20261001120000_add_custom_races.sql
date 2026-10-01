-- Migration: Add custom races (Changeling, Erina, Kipir)
-- 1. Update race check constraint to include all 12 races.
alter table public.characters
  drop constraint if exists characters_race_check;

alter table public.characters
  add constraint characters_race_check check (race in (
    'Human',
    'Dragonborn',
    'Dwarf',
    'Elf',
    'Gnome',
    'Half-Elf',
    'Half-Orc',
    'Halfling',
    'Tiefling',
    'Changeling',
    'Erina',
    'Kipir'
  ));

-- 2. Drop existing generated total columns to allow updating their expressions.
alter table public.characters
  drop column if exists ability_str_total,
  drop column if exists ability_dex_total,
  drop column if exists ability_con_total,
  drop column if exists ability_int_total,
  drop column if exists ability_wis_total,
  drop column if exists ability_cha_total;

-- 3. Re-create generated total columns matching RACE_ABILITY_BONUSES.
alter table public.characters
  add column ability_str_total integer generated always as (
    ability_str + case race
      when 'Human'      then 1
      when 'Dwarf'      then 1
      when 'Half-Orc'   then 2
      when 'Dragonborn' then 2
      when 'Kipir'      then 1
      else 0
    end
  ) stored,

  add column ability_dex_total integer generated always as (
    ability_dex + case race
      when 'Human'    then 1
      when 'Elf'      then 2
      when 'Halfling' then 2
      when 'Gnome'    then 1
      when 'Half-Elf' then 1
      when 'Erina'    then 2
      else 0
    end
  ) stored,

  add column ability_con_total integer generated always as (
    ability_con + case race
      when 'Human'    then 1
      when 'Dwarf'    then 2
      when 'Half-Orc' then 1
      when 'Kipir'    then 1
      else 0
    end
  ) stored,

  add column ability_int_total integer generated always as (
    ability_int + case race
      when 'Elf'        then 1
      when 'Gnome'      then 2
      when 'Tiefling'   then 1
      when 'Changeling' then 1
      else 0
    end
  ) stored,

  add column ability_wis_total integer generated always as (
    ability_wis + case race
      when 'Erina' then 1
      else 0
    end
  ) stored,

  add column ability_cha_total integer generated always as (
    ability_cha + case race
      when 'Halfling'   then 1
      when 'Tiefling'   then 2
      when 'Dragonborn' then 1
      when 'Half-Elf'   then 2
      when 'Changeling' then 2
      when 'Kipir'      then 1
      else 0
    end
  ) stored;