-- The two figures 20260917090000 left behind.
--
-- Every derived number on a sheet reads an `ability_X_total`, so the award
-- column reached all of them the day it was added — except in the three places
-- that add the racial bonus BY HAND, because a BEFORE trigger cannot read a
-- STORED generated column. `sync_max_hp` was fixed in that file. These two were
-- not, and they were wrong from the moment the column existed:
--
--   row_base_armor_class  20260910090000. An armour class nobody has typed over
--                         follows the sheet, and it was following the bought
--                         Dexterity — so a table raising somebody's DEX to 20
--                         left their AC where it was.
--
--   spend_hit_die         20260911090000. A die spent on a short rest heals by
--                         the roll plus the Constitution modifier, and it was
--                         reading the bought score.
--
-- Both keep their signatures, so nothing that calls them has to change.

-- ---------------------------------------------------------------------------
-- The armour class an untouched row stands at.
-- ---------------------------------------------------------------------------
--
-- 20260910090000's function with the award in each of the three totals. Still
-- by hand rather than through `ability_dex_total`: the trigger passes `new`,
-- where the generated columns are not yet computed.
create or replace function public.row_base_armor_class(c public.characters)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select public.base_armor_class(
    c.class_id,
    c.ability_dex + c.ability_dex_bonus
      + public.race_ability_bonus(c.race, 'dex'),
    c.ability_con + c.ability_con_bonus
      + public.race_ability_bonus(c.race, 'con'),
    c.ability_wis + c.ability_wis_bonus
      + public.race_ability_bonus(c.race, 'wis')
  );
$fn$;

-- The same trigger, firing on the three award columns as well. Without them a
-- statement that only names `ability_dex_bonus` never wakes it.
drop trigger if exists characters_sync_armor_class on public.characters;
create trigger characters_sync_armor_class
  before insert or update of
    class_id, race, ability_dex, ability_con, ability_wis,
    ability_dex_bonus, ability_con_bonus, ability_wis_bonus, armor_class
  on public.characters
  for each row
  execute function public.sync_armor_class();

-- Every row standing on a base that has since moved. The trigger's own rule:
-- an armour class somebody chose is theirs, and only one still equal to what
-- the arithmetic used to say is safe to bring forward.
update public.characters c
  set armor_class = public.row_base_armor_class(c)
  where c.armor_class = public.base_armor_class(
    c.class_id,
    c.ability_dex + public.race_ability_bonus(c.race, 'dex'),
    c.ability_con + public.race_ability_bonus(c.race, 'con'),
    c.ability_wis + public.race_ability_bonus(c.race, 'wis')
  )
  and c.armor_class is distinct from public.row_base_armor_class(c);

-- ---------------------------------------------------------------------------
-- The die a short rest spends.
-- ---------------------------------------------------------------------------
--
-- 20260911090000's function with one column read differently: `ability_con` and
-- a racial bonus added by hand becomes `ability_con_total`, which is the same
-- three terms and cannot fall behind a fourth. It reads a STORED row rather
-- than `new`, so the generated column is there to be read.
create or replace function public.spend_hit_die(
  p_char_id uuid,
  p_roll_override integer default null,
  p_campaign uuid default null,
  p_seat uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_level integer;
  v_spent integer;
  v_class text;
  v_con integer;
  v_dead boolean;
  v_faces integer;
  v_roll integer;
  v_mod integer;
  v_gain integer;
  v_healed jsonb;
begin
  if not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.level, c.hit_dice_spent, c.class_id, c.ability_con_total, c.is_dead
    into v_level, v_spent, v_class, v_con, v_dead
    from public.characters c
    where c.id = p_char_id
    for update;

  -- No row reads back exactly as a refusal does, and nothing is spent by
  -- somebody who is already gone.
  if v_level is null or v_dead then
    return null;
  end if;

  v_faces := public.hit_die(v_class);

  -- No die this catalogue knows how to roll, or none left in the pool.
  if v_faces is null or v_spent >= v_level then
    return null;
  end if;

  v_roll := case
    when p_roll_override between 1 and v_faces then p_roll_override
    else 1 + floor(random() * v_faces)::integer
  end;

  v_mod := floor((coalesce(v_con, 10) - 10) / 2.0);
  v_gain := greatest(0, v_roll + v_mod);

  update public.characters c
    set hit_dice_spent = v_spent + 1
    where c.id = p_char_id;

  if v_gain > 0 then
    v_healed := public.apply_heal(p_char_id, v_gain, p_campaign, p_seat);
  end if;

  return jsonb_build_object(
    'roll', v_roll,
    'faces', v_faces,
    'modifier', v_mod,
    'gained', v_gain,
    'hit_dice_spent', v_spent + 1,
    'current_hp', coalesce(
      (v_healed ->> 'current_hp')::integer,
      (select c.current_hp from public.characters c where c.id = p_char_id)
    )
  );
end;
$fn$;
