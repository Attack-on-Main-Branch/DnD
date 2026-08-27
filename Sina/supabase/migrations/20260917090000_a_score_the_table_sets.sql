-- A score the table sets, as opposed to one the player bought.
--
-- The head of the table needs to be able to write 18 on somebody's sheet, and
-- until now nothing could — not for want of a button, but because of two CHECK
-- constraints in 20260817090000 that are right about the question they answer:
--
--   characters_ability_range_check   every bought score is 7..15
--   characters_ability_budget_check  the six of them cost 15 points or fewer
--
-- Those bound a PURCHASE. `update_character` does not re-state either of them
-- in SQL and PostgREST hands that function to any authenticated caller, so the
-- constraints are the only thing between a player and six eighteens. Widening
-- them for a Dungeon Master would take that away from every player at once.
--
-- SO THE AWARD IS ITS OWN COLUMN, and no budget touches it. `ability_X` stays
-- what was bought; `ability_X_bonus` is what the table has handed over since,
-- written by `set_ability_score` and by nothing else; the generated
-- `ability_X_total` is the three added.
--
-- WHICH IS WHY ALMOST NOTHING ELSE HAS TO KNOW. Every derived figure on a sheet
-- reads a `_total` — the modifier, the saves, the skills, passive perception,
-- initiative, a caster's DC — so all of them follow an awarded point exactly as
-- they follow a bought one. The exceptions are the three functions that add the
-- racial bonus by hand because a BEFORE trigger cannot read a STORED generated
-- column: `sync_max_hp` below, and `row_base_armor_class` and `spend_hit_die`
-- in 20260918090000.
--
-- Mirrors Sina/src/rules/ability-scores.js.

-- ---------------------------------------------------------------------------
-- What the table has handed over.
-- ---------------------------------------------------------------------------
alter table public.characters
  add column if not exists ability_str_bonus integer not null default 0,
  add column if not exists ability_dex_bonus integer not null default 0,
  add column if not exists ability_con_bonus integer not null default 0,
  add column if not exists ability_int_bonus integer not null default 0,
  add column if not exists ability_wis_bonus integer not null default 0,
  add column if not exists ability_cha_bonus integer not null default 0;

-- -20..25 covers the whole rectangle: a total of 1 against a bought 15 with a
-- racial 2 is -16, and a total of 30 against a bought 7 with none is +23.
alter table public.characters
  drop constraint if exists characters_ability_award_check;

alter table public.characters
  add constraint characters_ability_award_check check (
    ability_str_bonus between -20 and 25
    and ability_dex_bonus between -20 and 25
    and ability_con_bonus between -20 and 25
    and ability_int_bonus between -20 and 25
    and ability_wis_bonus between -20 and 25
    and ability_cha_bonus between -20 and 25
  );

-- ---------------------------------------------------------------------------
-- The totals, with the third term in them.
-- ---------------------------------------------------------------------------
--
-- Dropped and re-added rather than altered in place. Nothing depends on these
-- columns but `campaign_sheets`, whose body is an old-style SQL string and so
-- carries no dependency to refuse the drop; it re-resolves the names the next
-- time it runs. The racial CASE arms are 20260817090000's own, unchanged.
alter table public.characters
  drop column if exists ability_str_total,
  drop column if exists ability_dex_total,
  drop column if exists ability_con_total,
  drop column if exists ability_int_total,
  drop column if exists ability_wis_total,
  drop column if exists ability_cha_total;

alter table public.characters
  add column ability_str_total integer generated always as (
    ability_str + ability_str_bonus + case race
      when 'Human' then 1
      when 'Dwarf' then 1
      when 'Half-Orc' then 2
      when 'Dragonborn' then 2
      else 0
    end
  ) stored,
  add column ability_dex_total integer generated always as (
    ability_dex + ability_dex_bonus + case race
      when 'Human' then 1
      when 'Elf' then 2
      when 'Halfling' then 2
      when 'Gnome' then 1
      when 'Half-Elf' then 1
      else 0
    end
  ) stored,
  add column ability_con_total integer generated always as (
    ability_con + ability_con_bonus + case race
      when 'Human' then 1
      when 'Dwarf' then 2
      when 'Half-Orc' then 1
      else 0
    end
  ) stored,
  add column ability_int_total integer generated always as (
    ability_int + ability_int_bonus + case race
      when 'Elf' then 1
      when 'Gnome' then 2
      when 'Tiefling' then 1
      else 0
    end
  ) stored,
  add column ability_wis_total integer generated always as (
    ability_wis + ability_wis_bonus
  ) stored,
  add column ability_cha_total integer generated always as (
    ability_cha + ability_cha_bonus + case race
      when 'Halfling' then 1
      when 'Tiefling' then 2
      when 'Dragonborn' then 1
      when 'Half-Elf' then 2
      else 0
    end
  ) stored;

-- ---------------------------------------------------------------------------
-- Hit points, which cannot read a total.
-- ---------------------------------------------------------------------------
--
-- 20260907090000's trigger with the award added and its column list widened to
-- fire on it. Everything else about it is untouched.
create or replace function public.sync_max_hp()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  v_max integer;
begin
  v_max := public.max_hp_for(
    new.class_id,
    new.level,
    new.ability_con + new.ability_con_bonus + public.race_con_bonus(new.race)
  );

  if v_max is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.max_hp := v_max;
    new.current_hp := v_max;

    return new;
  end if;

  if v_max is distinct from old.max_hp then
    new.max_hp := v_max;
    new.current_hp := least(
      v_max,
      greatest(0, old.current_hp + (v_max - old.max_hp))
    );
  end if;

  return new;
end;
$fn$;

drop trigger if exists characters_sync_max_hp on public.characters;
create trigger characters_sync_max_hp
  before insert or update of
    class_id, level, ability_con, ability_con_bonus, race
  on public.characters
  for each row
  execute function public.sync_max_hp();

-- ---------------------------------------------------------------------------
-- Who may write one, and what happens when they do.
-- ---------------------------------------------------------------------------
--
-- THE HEAD OF THE TABLE ALONE, which is where this differs from
-- `update_armor_class`: that admits `may_move_character`, so the character's
-- own player passes it. Right for a shield, wrong for a score — a player
-- raising their own Strength is the budget being walked around. The predicate
-- is `set_character_level`'s instead.
--
-- THE ARGUMENT IS A TOTAL AND THE COLUMN HOLDS A DIFFERENCE, taken here against
-- the row being written rather than by the caller against one that may have
-- moved since it was rendered.
--
-- No line in the activity log: an ability score is a fact about a character
-- rather than something that happens at a table. A max_hp that moves because of
-- one still writes its own, from `characters_log_max_hp`.
create or replace function public.set_ability_score(
  p_char_id uuid,
  p_ability text,
  p_total integer,
  p_campaign uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_key text := lower(btrim(coalesce(p_ability, '')));
  v_landed integer;
begin
  if p_total is null or p_total < 1 or p_total > 30 then
    return null;
  end if;

  if v_key not in ('str', 'dex', 'con', 'int', 'wis', 'cha') then
    return null;
  end if;

  if not (
    public.owns_campaign(p_campaign)
    and exists (
      select 1 from public.campaign_members m
      where m.campaign_id = p_campaign
        and m.character_id = p_char_id
    )
  ) then
    return null;
  end if;

  /* One statement per column rather than one dynamic UPDATE: an identifier
     built from an argument is an injection to get right, and six branches over
     a fixed list is a thing that cannot be got wrong. The clamp keeps
     `characters_ability_award_check` from turning a stray bought score into a
     refusal; the bounds above are what actually decide the range. */
  if v_key = 'str' then
    update public.characters c
      set ability_str_bonus = greatest(-20, least(25,
        p_total - c.ability_str - public.race_ability_bonus(c.race, 'str')))
      where c.id = p_char_id
      returning c.ability_str_total into v_landed;
  elsif v_key = 'dex' then
    update public.characters c
      set ability_dex_bonus = greatest(-20, least(25,
        p_total - c.ability_dex - public.race_ability_bonus(c.race, 'dex')))
      where c.id = p_char_id
      returning c.ability_dex_total into v_landed;
  elsif v_key = 'con' then
    update public.characters c
      set ability_con_bonus = greatest(-20, least(25,
        p_total - c.ability_con - public.race_ability_bonus(c.race, 'con')))
      where c.id = p_char_id
      returning c.ability_con_total into v_landed;
  elsif v_key = 'int' then
    update public.characters c
      set ability_int_bonus = greatest(-20, least(25,
        p_total - c.ability_int - public.race_ability_bonus(c.race, 'int')))
      where c.id = p_char_id
      returning c.ability_int_total into v_landed;
  elsif v_key = 'wis' then
    update public.characters c
      set ability_wis_bonus = greatest(-20, least(25,
        p_total - c.ability_wis - public.race_ability_bonus(c.race, 'wis')))
      where c.id = p_char_id
      returning c.ability_wis_total into v_landed;
  else
    update public.characters c
      set ability_cha_bonus = greatest(-20, least(25,
        p_total - c.ability_cha - public.race_ability_bonus(c.race, 'cha')))
      where c.id = p_char_id
      returning c.ability_cha_total into v_landed;
  end if;

  return v_landed;
end;
$fn$;

revoke all on function public.set_ability_score(uuid, text, integer, uuid)
  from public;
revoke all on function public.set_ability_score(uuid, text, integer, uuid)
  from anon;
grant execute on function public.set_ability_score(uuid, text, integer, uuid)
  to authenticated;
