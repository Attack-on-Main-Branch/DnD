-- Nobody types a maximum any more.
--
-- Max HP was a box on the character sheet, and a box drifts: a Barbarian written
-- down as 20 and a Wizard as 80, neither of them anything 5e would produce. It
-- is arithmetic — the die a path rolls, the rung it stands on, and its
-- Constitution — so this file makes it arithmetic, and takes the box away.
--
-- A TRIGGER AND NOT A SERVER ACTION, which is the whole design. Three columns
-- decide the figure and four doors can move one of them: the sheet's own editor,
-- experience crossing a threshold, `set_character_level`, and whatever is
-- written next. A recomputation at each door is four chances to forget; one
-- BEFORE trigger on the row is none. Mirrors Sina/src/rules/hp.js, which is what
-- the sheet previews with — changing one means changing both.
--
-- THE AVERAGE AND NOT THE ROLL. 5e offers a die per level or its fixed average;
-- a table where one player rolls badly and carries it for twenty levels is why
-- the average exists, and it is the only one a shared sheet can hold.

-- ---------------------------------------------------------------------------
-- The ends move, because the arithmetic reaches further than a box did.
-- ---------------------------------------------------------------------------
--
-- 205 is a Barbarian at 20th with 17 Constitution — 15 bought and 2 for a Dwarf
-- — which is the largest figure this catalogue can produce. Derived in
-- Sina/src/rules/hp.js rather than chosen, and stated here because a CHECK
-- cannot compute it. The old ceiling was 100, so this widens and no standing row
-- can violate it.
alter table public.characters
  drop constraint if exists characters_current_hp_check;

alter table public.characters
  add constraint characters_current_hp_check
  check (current_hp between 0 and 205);

alter table public.characters
  drop constraint if exists characters_max_hp_check;

alter table public.characters
  add constraint characters_max_hp_check
  check (max_hp between 1 and 205);

-- ---------------------------------------------------------------------------
-- Which die a path rolls.
-- ---------------------------------------------------------------------------
--
-- Mirrors HIT_DICE in Sina/src/rules/hp.js, under the five archetypes:
--
--   Warrior    barbarian d12, fighter and paladin d10
--   Mage       wizard and sorcerer d6, warlock d8
--   Archer     ranger and arcane archer d10
--   Assassin   rogue and monk d8
--   Priest     cleric, druid and bard d8
--
-- NULL for a path the catalogue does not hold, which is what the trigger reads
-- as "leave this row's maximum where it is" rather than inventing one.
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
-- What a race adds to Constitution.
-- ---------------------------------------------------------------------------
--
-- The same three lines the `ability_con_total` generated column carries in
-- 20260817090000, written out again because a BEFORE trigger cannot read a
-- STORED generated column: Postgres computes those AFTER the triggers have run,
-- so `new.ability_con_total` there is last statement's answer or nothing at all.
-- Changing one means changing both, and RACE_ABILITY_BONUSES beside them.
create or replace function public.race_con_bonus(p_race text)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select case p_race
    when 'Human' then 1
    when 'Dwarf' then 2
    when 'Half-Orc' then 1
    else 0
  end;
$fn$;

revoke all on function public.race_con_bonus(text) from public;
revoke all on function public.race_con_bonus(text) from anon;
grant execute on function public.race_con_bonus(text) to authenticated;

-- ---------------------------------------------------------------------------
-- The figure itself.
-- ---------------------------------------------------------------------------
--
-- The whole of it, from scratch, every time — which is what makes Constitution
-- RETROACTIVE. A score raised at 8th level is worth its modifier on all eight
-- rungs, because none of them was ever banked; there is no running total here to
-- disagree with the sheet.
--
-- `p_con_total` is the score AFTER the racial bonus, which is what the rest of
-- the sheet prints a modifier from.
--
-- The per-level gain is floored at one: a d6 caster with a Constitution of 7
-- would otherwise gain nothing for a level, or lose hit points by climbing, and
-- 5e's own errata draws the line at one. Mirrors `calculateMaxHP`.
create or replace function public.max_hp_for(
  p_class_id text,
  p_level integer,
  p_con_total integer
)
returns integer
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_faces integer := public.hit_die(p_class_id);
  v_rung integer := least(20, greatest(1, coalesce(p_level, 1)));
  v_mod integer := floor((coalesce(p_con_total, 10) - 10) / 2.0);
  v_gain integer;
begin
  if v_faces is null then
    return null;
  end if;

  v_gain := greatest(1, v_faces / 2 + 1 + v_mod);

  return greatest(1, least(205, v_faces + v_mod + (v_rung - 1) * v_gain));
end;
$fn$;

revoke all on function public.max_hp_for(text, integer, integer) from public;
revoke all on function public.max_hp_for(text, integer, integer) from anon;
grant execute on function public.max_hp_for(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Keeping it true.
-- ---------------------------------------------------------------------------
--
-- BEFORE, so the row lands correct rather than being corrected afterwards, and
-- so `max_hp` and `current_hp` move in the one statement the caller asked for.
--
-- ON INSERT the character starts whole. ON UPDATE the bar keeps what the change
-- was worth — a Constitution raised at 8th hands over eight rungs at once — and
-- is then held inside its new ends rather than clamped to the top. Mirrors
-- `currentAfterMaxChange`.
--
-- A path the catalogue does not hold leaves the row alone: there is no figure to
-- put there, and refusing the write would take a name change down with it.
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
    new.ability_con + public.race_con_bonus(new.race)
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
  before insert or update of class_id, level, ability_con, race
  on public.characters
  for each row
  execute function public.sync_max_hp();

-- Every sheet written before this file, brought to what the arithmetic says.
-- `class_id` is named so the trigger above fires and carries the bar with it.
update public.characters
  set class_id = class_id
  where public.hit_die(class_id) is not null;

-- ---------------------------------------------------------------------------
-- The sheet's own editor, with nothing left to get wrong.
-- ---------------------------------------------------------------------------
--
-- 20260824180000's function without `new_max_hp`, and without the clamp that
-- went with it: the trigger above owns both columns now. Dropped first because
-- the signature SHRINKS, for the reason 20260823120000 gives — PostgREST
-- resolves an overload by the exact set of keys it is handed, so the nineteen-
-- argument version would go on answering anyone still sending a maximum.
drop function if exists public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
);

create or replace function public.update_character(
  target_character uuid,
  new_name text,
  new_discriminator text,
  new_race text,
  new_archetype text,
  new_class_id text,
  new_alignment text,
  new_color_theme text,
  new_ability_str integer,
  new_ability_dex integer,
  new_ability_con integer,
  new_ability_int integer,
  new_ability_wis integer,
  new_ability_cha integer,
  new_skills jsonb,
  new_backstory text,
  new_personality text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_character(target_character) then
    return false;
  end if;

  update public.characters
    set name = new_name,
        discriminator = new_discriminator,
        race = new_race,
        archetype = new_archetype,
        class_id = new_class_id,
        alignment = new_alignment,
        color_theme = new_color_theme,
        ability_str = new_ability_str,
        ability_dex = new_ability_dex,
        ability_con = new_ability_con,
        ability_int = new_ability_int,
        ability_wis = new_ability_wis,
        ability_cha = new_ability_cha,
        -- The whole object, not a merge: the grid submits every skill it knows
        -- about, so an entry that is gone from the payload is one the player
        -- cleared.
        skills = coalesce(new_skills, '{}'::jsonb),
        backstory = new_backstory,
        personality = new_personality
    where id = target_character;

  return found;
end;
$$;

revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from public;
revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from anon;
grant execute on function public.update_character(
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- What the table is told.
-- ---------------------------------------------------------------------------
--
-- One more thing the log can say. The whole list again rather than a patch, so
-- this is now the file to re-run after an out-of-order paste. Mirrors
-- ACTION_TYPES in rules/activity.js.
alter table public.campaign_activity_logs
  drop constraint if exists campaign_activity_logs_kind_check;

alter table public.campaign_activity_logs
  add constraint campaign_activity_logs_kind_check
  check (
    actor_type in ('dm', 'player')
    and action_type in (
      'dice_roll',
      'secret_dice_roll',
      'hp_change',
      'level_change',
      'item_used',
      'item_dropped',
      'item_transferred',
      'item_granted',
      'item_revoked',
      'coin_spent',
      'coin_transferred',
      'coin_granted',
      'coin_revoked',
      'spell_cast',
      'chest_revealed',
      'chest_looted',
      'bag_transferred',
      'xp_change',
      'rest_taken',
      'max_hp_change'
    )
  );

-- ---------------------------------------------------------------------------
-- A frame that moved, written down once.
-- ---------------------------------------------------------------------------
--
-- Armed the way every trigger-written line is, so a sheet edited away from a
-- table leaves nothing: a note in the log happened AT A TABLE. What does reach
-- it is a rung climbed on experience, which is armed by `modify_character_xp`.
create or replace function public.log_max_hp_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
begin
  if v_campaign is null then
    return null;
  end if;

  if new.max_hp < 1 or new.max_hp > 205 then
    return null;
  end if;

  perform public.write_table_log(
    v_campaign,
    public.armed_uuid('grimoire.seat'),
    'max_hp_change',
    new.id,
    jsonb_build_object('maxHp', new.max_hp, 'level', new.level)
  );

  return null;
end;
$fn$;

revoke all on function public.log_max_hp_change() from public;
revoke all on function public.log_max_hp_change() from anon;
revoke all on function public.log_max_hp_change() from authenticated;

-- `AFTER UPDATE` with no column list, deliberately. `UPDATE OF max_hp` fires on
-- the columns a STATEMENT NAMES, not on the ones that changed — and the statement
-- that moves this one names `level`, the maximum being the BEFORE trigger's
-- doing. The `WHEN` clause is evaluated after that trigger has run, so it sees
-- what actually landed.
drop trigger if exists characters_log_max_hp on public.characters;
create trigger characters_log_max_hp
  after update on public.characters
  for each row
  when (old.max_hp is distinct from new.max_hp)
  execute function public.log_max_hp_change();

-- ---------------------------------------------------------------------------
-- The bar's own writer, at the new ends.
-- ---------------------------------------------------------------------------
--
-- 20260830090000's function with one number changed: a hundred was the old
-- ceiling, and a table calling out damage at 20th level can now exceed it. The
-- clamp below it was always the row's own `max_hp` and is untouched.
create or replace function public.change_character_health(
  target_character uuid,
  hp_delta integer,
  target_campaign uuid,
  acting_seat uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_next integer;
begin
  if hp_delta is null or abs(hp_delta) > 205 then
    return null;
  end if;

  if not (
    public.owns_character(target_character)
    or (
      public.owns_campaign(target_campaign)
      and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = target_campaign
          and m.character_id = target_character
      )
    )
  ) then
    return null;
  end if;

  perform public.arm_table_log(
    target_campaign, acting_seat, null, target_character, target_character
  );

  update public.characters c
    set current_hp = least(c.max_hp, greatest(0, c.current_hp + hp_delta))
    where c.id = target_character
    returning c.current_hp into v_next;

  return v_next;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- And the bar's own line, which must not double up with the frame's.
-- ---------------------------------------------------------------------------
--
-- 20260830090000's function with one clause added. A level climbed moves BOTH
-- columns in one statement, and two lines for one event in a log that keeps ten
-- is one line too many — so a bar that moved because its FRAME moved says
-- nothing, and the entry above speaks for the pair. Damage and healing are
-- untouched: those move `current_hp` alone.
--
-- The bound is the ends' now, not the old hundred.
create or replace function public.log_health_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
  v_delta integer;
begin
  -- Nothing armed this: a sheet's own editor, or a migration. Not a table.
  if v_campaign is null then
    return null;
  end if;

  -- The frame moved and took the bar with it. `characters_log_max_hp` has that.
  if new.max_hp is distinct from old.max_hp then
    return null;
  end if;

  v_delta := new.current_hp - old.current_hp;

  if v_delta = 0 or abs(v_delta) > 205 then
    return null;
  end if;

  perform public.write_table_log(
    v_campaign,
    public.armed_uuid('grimoire.seat'),
    'hp_change',
    new.id,
    jsonb_build_object('delta', v_delta)
  );

  return null;
end;
$fn$;
