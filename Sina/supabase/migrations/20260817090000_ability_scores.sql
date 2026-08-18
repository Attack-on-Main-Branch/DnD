-- Ability scores: the six values a player buys, and the six totals they play
-- with once their race has been added.
--
-- Both are stored, but only one is written. The totals are GENERATED columns:
-- base plus the racial bonus, computed by Postgres on every write. Storing them
-- as ordinary columns would mean two facts that have to agree — and they would
-- stop agreeing the first time a character's race changed without the totals
-- being recomputed, which is exactly the sort of drift nobody notices because
-- the number still looks plausible. Generated, they cannot disagree.
--
-- The bonus table mirrors RACE_ABILITY_BONUSES in Sina/src/rules/character.js,
-- the same pairing `race` already has with characters_race_check. Changing one
-- means changing the other.
--
-- Wisdom gets no bonus from any of the nine races. Its total column is
-- therefore a copy of its base, and it exists anyway: a character sheet with
-- five abilities on it is not a character sheet, and the day a race grants WIS
-- the column is already there to carry it.

alter table public.characters
  add column if not exists ability_str integer not null default 10,
  add column if not exists ability_dex integer not null default 10,
  add column if not exists ability_con integer not null default 10,
  add column if not exists ability_int integer not null default 10,
  add column if not exists ability_wis integer not null default 10,
  add column if not exists ability_cha integer not null default 10;

alter table public.characters
  add column if not exists ability_str_total integer generated always as (
    ability_str + case race
      when 'Human' then 1
      when 'Dwarf' then 1
      when 'Half-Orc' then 2
      when 'Dragonborn' then 2
      else 0
    end
  ) stored,
  add column if not exists ability_dex_total integer generated always as (
    ability_dex + case race
      when 'Human' then 1
      when 'Elf' then 2
      when 'Halfling' then 2
      when 'Gnome' then 1
      when 'Half-Elf' then 1
      else 0
    end
  ) stored,
  add column if not exists ability_con_total integer generated always as (
    ability_con + case race
      when 'Human' then 1
      when 'Dwarf' then 2
      when 'Half-Orc' then 1
      else 0
    end
  ) stored,
  add column if not exists ability_int_total integer generated always as (
    ability_int + case race
      when 'Elf' then 1
      when 'Gnome' then 2
      when 'Tiefling' then 1
      else 0
    end
  ) stored,
  add column if not exists ability_wis_total integer generated always as (
    ability_wis
  ) stored,
  add column if not exists ability_cha_total integer generated always as (
    ability_cha + case race
      when 'Halfling' then 1
      when 'Tiefling' then 2
      when 'Dragonborn' then 1
      when 'Half-Elf' then 2
      else 0
    end
  ) stored;

-- The bought range, before any racial bonus.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_ability_range_check'
  ) then
    alter table public.characters
      add constraint characters_ability_range_check check (
        ability_str between 7 and 15
        and ability_dex between 7 and 15
        and ability_con between 7 and 15
        and ability_int between 7 and 15
        and ability_wis between 7 and 15
        and ability_cha between 7 and 15
      );
  end if;
end;
$$;

-- The 15-point budget, in the database as well as in the rules, for the same
-- reason the three-character cap is: an authenticated request can reach
-- PostgREST directly, so a check that only ever runs in a Server Action is not
-- the thing that holds.
--
-- The cost curve is written here in closed form rather than as a second copy of
-- the lookup table in character.js:
--
--   cost(v) = (v - 10) + greatest(v - 13, 0)
--
-- which reproduces it exactly across 7..15 — -3 -2 -1 0 1 2 3 5 7 — with the
-- `greatest` term being the point where the last two steps start costing two
-- each. A test in character.test.js asserts the table and this formula agree,
-- so a change to one that is not made to the other fails there rather than
-- here.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_ability_budget_check'
  ) then
    alter table public.characters
      add constraint characters_ability_budget_check check (
        (ability_str - 10 + greatest(ability_str - 13, 0))
        + (ability_dex - 10 + greatest(ability_dex - 13, 0))
        + (ability_con - 10 + greatest(ability_con - 13, 0))
        + (ability_int - 10 + greatest(ability_int - 13, 0))
        + (ability_wis - 10 + greatest(ability_wis - 13, 0))
        + (ability_cha - 10 + greatest(ability_cha - 13, 0))
        <= 15
      );
  end if;
end;
$$;
