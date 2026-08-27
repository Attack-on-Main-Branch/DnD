-- Hit dice, and the proficiencies a table writes down on top of a path's own.
--
-- `rules/rest.js` has said since 20260903090000 that "Action Surge, Second Wind,
-- Channel Divinity, Ki and Hit Dice have no column on `characters` — when one
-- arrives, it joins here." This is the one that arrives.
--
-- A SHORT REST IS NOT A PARTY DEED, which is the one place this parts company
-- with `trigger_rest`. That function aims a list of characters and gives each of
-- them the same thing; spending a hit die is one character, one die, one number
-- rolled on the board — so it is a door of its own, `spend_hit_die`, built the
-- way `roll_death_save` is. The long rest's half stays in `trigger_rest`, where
-- everything else a long rest hands back already lives.
--
-- Mirrors `hitDicePool` and `hitDiceRegained` in Sina/src/rules/character-stats.js.

-- ---------------------------------------------------------------------------
-- Two columns.
-- ---------------------------------------------------------------------------
--
-- `hit_dice_spent` is a TALLY and not a pool: the pool is the level, which
-- already has a column, and storing both would be two numbers that can disagree
-- the moment a rung moves.
alter table public.characters
  add column if not exists hit_dice_spent integer not null default 0;

alter table public.characters
  add column if not exists custom_proficiencies jsonb not null
  default '{"armor": [], "weapons": [], "tools": []}'::jsonb;

-- ---------------------------------------------------------------------------
-- Keeping the tally inside the pool.
-- ---------------------------------------------------------------------------
--
-- THE CLAMP COMES BEFORE THE CHECK, and it has to. A tally bounded by another
-- column is a constraint that can be broken WITHOUT ANYBODY TOUCHING IT: a
-- character on 5th with four dice spent who has experience taken back drops to
-- 4th, and `modify_character_xp` — which knows nothing about hit dice — would
-- fail on a row it never meant to write. The trigger below carries the tally
-- down with the rung, so the constraint only ever sees rows that hold.
create or replace function public.clamp_hit_dice()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.hit_dice_spent := greatest(
    0, least(coalesce(new.level, 1), coalesce(new.hit_dice_spent, 0))
  );

  return new;
end;
$fn$;

revoke all on function public.clamp_hit_dice() from public;
revoke all on function public.clamp_hit_dice() from anon;
revoke all on function public.clamp_hit_dice() from authenticated;

drop trigger if exists characters_clamp_hit_dice on public.characters;
create trigger characters_clamp_hit_dice
  before insert or update of level, hit_dice_spent
  on public.characters
  for each row
  execute function public.clamp_hit_dice();

-- Anything standing outside the ends before the trigger existed.
update public.characters
  set hit_dice_spent = greatest(0, least(level, hit_dice_spent))
  where hit_dice_spent < 0 or hit_dice_spent > level;

alter table public.characters
  drop constraint if exists characters_hit_dice_spent_check;

alter table public.characters
  add constraint characters_hit_dice_spent_check
  check (hit_dice_spent >= 0 and hit_dice_spent <= level);

-- The three lists, all present and all arrays. Mirrors `readCustomProficiencies`.
alter table public.characters
  drop constraint if exists characters_custom_proficiencies_check;

alter table public.characters
  add constraint characters_custom_proficiencies_check
  check (
    jsonb_typeof(custom_proficiencies) = 'object'
    and jsonb_typeof(custom_proficiencies -> 'armor') = 'array'
    and jsonb_typeof(custom_proficiencies -> 'weapons') = 'array'
    and jsonb_typeof(custom_proficiencies -> 'tools') = 'array'
  );

-- ---------------------------------------------------------------------------
-- Spending one.
-- ---------------------------------------------------------------------------
--
-- The face and the Constitution modifier, floored at nothing: 5e says a hit die
-- gives back the roll plus the modifier and never takes hit points away, so a
-- Wizard with a Constitution of 7 rolling a 1 gains nothing rather than losing
-- two.
--
-- `p_roll_override` is how the table's own die gets in, exactly as it is for a
-- death save: the board is a physics simulation and cannot be told what to land
-- on, so the face it comes to rest at is passed here and the arithmetic is done
-- against it. Called with nothing, this rolls its own.
--
-- The heal goes through `apply_heal` rather than an UPDATE of its own — one door
-- per column, the rule 20260909090000 is written under — so a hit die spent at
-- one hit point clears the death saves and writes its `hp_change` line without
-- this function knowing anything about either.
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

  select c.level, c.hit_dice_spent, c.class_id,
         c.ability_con + public.race_ability_bonus(c.race, 'con'),
         c.is_dead
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

revoke all on function public.spend_hit_die(uuid, integer, uuid, uuid) from public;
revoke all on function public.spend_hit_die(uuid, integer, uuid, uuid) from anon;
grant execute on function public.spend_hit_die(uuid, integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A long rest, now handing dice back too.
-- ---------------------------------------------------------------------------
--
-- 20260910090000's function with one column added to the UPDATE. Half the rung
-- and never none, which is 5e's own arithmetic and `hitDiceRegained`'s.
--
-- Same signature, so `create or replace` is enough and nothing that calls it
-- needs to know.
create or replace function public.trigger_rest(
  p_campaign_id uuid,
  p_target_char_ids uuid[],
  p_rest_type text,
  p_seat uuid default null
)
returns table (id uuid, current_hp integer, spell_slots jsonb)
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_head boolean := public.owns_campaign(p_campaign_id);
  v_long boolean := p_rest_type = 'long';
  v_who uuid[];
  v_reached integer;
  v_party integer;
begin
  -- Mirrors REST_TYPES in Sina/src/rules/rest.js.
  if p_rest_type is null or p_rest_type not in ('short', 'long') then
    return;
  end if;

  select coalesce(array_agg(distinct m.character_id), '{}'::uuid[])
    into v_who
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = p_campaign_id
    and m.character_id = any (coalesce(p_target_char_ids, '{}'::uuid[]))
    and not c.is_dead
    and (v_head or public.owns_character(m.character_id));

  v_reached := coalesce(array_length(v_who, 1), 0);

  if v_reached = 0 then
    return;
  end if;

  return query
  update public.characters c
    set current_hp = case when v_long then c.max_hp else c.current_hp end,
        -- `'{}'` and not the row's own: nothing is carried over a rest, exactly
        -- as `long_rest_spell_slots` has read it since 20260826090000.
        spell_slots = case
          when v_long or public.pact_caster(c.class_id)
            then public.spell_slots_for(c.class_id, c.level, '{}'::jsonb)
          else c.spell_slots
        end,
        -- A bar back at its top is nobody's spell of dying any more.
        death_saves = case
          when v_long then public.no_death_saves()
          else c.death_saves
        end,
        -- Half the rung back, and never none. A short rest hands back nothing:
        -- it is what the dice are SPENT on.
        hit_dice_spent = case
          when v_long
            then greatest(0, c.hit_dice_spent - greatest(1, c.level / 2))
          else c.hit_dice_spent
        end
    where c.id = any (v_who)
    returning c.id, c.current_hp, c.spell_slots;

  select count(*) into v_party
  from public.campaign_members m
  where m.campaign_id = p_campaign_id;

  if v_reached = 1 then
    perform public.write_table_log(
      p_campaign_id, p_seat, 'rest_taken', v_who[1],
      jsonb_build_object('restType', p_rest_type)
    );
  else
    perform public.write_table_log(
      p_campaign_id, p_seat, 'rest_taken', null,
      jsonb_build_object(
        'restType', p_rest_type,
        'targetName', case
          when v_reached >= v_party then 'the party'
          else v_reached || ' of the party'
        end
      )
    );
  end if;
end;
$fn$;

revoke all on function public.trigger_rest(uuid, uuid[], text, uuid) from public;
revoke all on function public.trigger_rest(uuid, uuid[], text, uuid) from anon;
grant execute on function public.trigger_rest(uuid, uuid[], text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The party's sheets, now carrying what the drawer needs.
-- ---------------------------------------------------------------------------
--
-- 20260826090000's function with four columns added. Dropped first because the
-- RETURN TYPE grows, which `create or replace` refuses outright.
--
-- `race` joins it because every figure in the vitals ribbon but one is derived
-- from the row, and two of them — the speed and the size — are derived from the
-- race. A player reads their own through `getCharacter`; this is the Dungeon
-- Master's read of the party's, and `owns_campaign` is still the whole of who
-- may call it.
drop function if exists public.campaign_sheets(uuid);

create function public.campaign_sheets(target_campaign uuid)
returns table (
  id uuid,
  race text,
  class_id text,
  level integer,
  skills jsonb,
  spell_slots jsonb,
  hit_dice_spent integer,
  custom_proficiencies jsonb,
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
  select c.id, c.race, c.class_id, c.level, c.skills, c.spell_slots,
         c.hit_dice_spent, c.custom_proficiencies,
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
