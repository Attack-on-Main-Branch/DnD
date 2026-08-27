-- The fifteen conditions, and who is under which.
--
-- A `text[]` and not a table, which is the whole design. Every one of these is
-- in the rulebook, none is a thing a campaign invents, and a character is either
-- under one or not — so there is nothing to store but the set, and a join table
-- would be four columns and a policy to say what an array already says.
--
-- Mirrors CONDITION_KEYS in Sina/src/rules/conditions.js. Changing one means
-- changing both.

alter table public.characters
  add column if not exists conditions text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------------
-- The list itself, asked as two questions.
-- ---------------------------------------------------------------------------
--
-- Written out here rather than read off the constraint: a CHECK is not
-- something a function can query, and both are re-run together from this file.
create or replace function public.is_condition(p_key text)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select p_key = any (array[
    'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
    'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
    'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion'
  ]::text[]);
$fn$;

revoke all on function public.is_condition(text) from public;
revoke all on function public.is_condition(text) from anon;
grant execute on function public.is_condition(text) to authenticated;

/*
 * A WHOLE COLUMN, and it has to be a function rather than an expression: a
 * CHECK may hold neither a subquery nor a set-returning call, and "each of
 * these once" needs one of the two. `skills_are_valid` in 20260824180000 is
 * written this way for the same reason.
 *
 * Two questions. Every name is one this schema knows, and no name appears
 * twice — the second matters because `conditions || key` would happily write a
 * duplicate if anything ever reached the column without going through the
 * toggles below.
 */
create or replace function public.conditions_are_valid(p_conditions text[])
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select p_conditions is not null
    and p_conditions <@ array[
      'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
      'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
      'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion'
    ]::text[]
    and coalesce(array_length(p_conditions, 1), 0)
        = (select count(distinct one) from unnest(p_conditions) as one);
$fn$;

revoke all on function public.conditions_are_valid(text[]) from public;
revoke all on function public.conditions_are_valid(text[]) from anon;
grant execute on function public.conditions_are_valid(text[]) to authenticated;

alter table public.characters
  drop constraint if exists characters_conditions_check;

alter table public.characters
  add constraint characters_conditions_check
  check (public.conditions_are_valid(conditions));

-- ---------------------------------------------------------------------------
-- One character.
-- ---------------------------------------------------------------------------
--
-- TOGGLED AGAINST THE ROW IT HAS LOCKED and never against a set the browser
-- sent: two chairs calling out "prone" in the same breath would otherwise both
-- read the same before-state and the second would take it straight back off.
--
-- The answer says which way it went, because the log entry and the toast both
-- need to know and neither can work it out from the array alone.
--
-- `may_move_character` is the permission every other deed at a card asks — the
-- owner, or the Dungeon Master of a table this character plays at.
create or replace function public.toggle_character_condition(
  p_char_id uuid,
  p_key text,
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
  v_held text[];
  v_applied boolean;
  v_next text[];
begin
  if p_key is null or not public.is_condition(p_key) then
    return null;
  end if;

  if not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.conditions into v_held
    from public.characters c
    where c.id = p_char_id
    for update;

  -- No row reads back exactly as a refusal does.
  if v_held is null then
    return null;
  end if;

  v_applied := not (p_key = any (v_held));

  v_next := case
    when v_applied then v_held || p_key
    else array_remove(v_held, p_key)
  end;

  update public.characters c
    set conditions = v_next
    where c.id = p_char_id;

  perform public.log_condition(
    p_campaign, p_seat, p_char_id, p_key, v_applied
  );

  return jsonb_build_object(
    'applied', v_applied,
    'conditions', to_jsonb(v_next),
    'characterIds', to_jsonb(array[p_char_id])
  );
end;
$fn$;

revoke all on function public.toggle_character_condition(uuid, text, uuid, uuid) from public;
revoke all on function public.toggle_character_condition(uuid, text, uuid, uuid) from anon;
grant execute on function public.toggle_character_condition(uuid, text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The whole party.
-- ---------------------------------------------------------------------------
--
-- THE HEAD OF THE TABLE'S ALONE. "Everybody is frightened" is a thing a session
-- announces, not something a player decides for the party, so this asks
-- `owns_campaign` rather than `may_move_character`.
--
-- APPLY IF ANYBODY LACKS IT, REMOVE ONLY WHEN EVERYBODY HAS IT. A per-character
-- toggle run six times would leave the party split down the middle on one press,
-- which is never what "all party" meant. So the set is read first and one
-- direction is chosen for everybody.
--
-- ONE LINE IN THE LOG for the whole press, named the way `trigger_rest` names
-- its own: six entries saying the same thing is not a log, it is a wall.
create or replace function public.toggle_party_condition(
  p_campaign uuid,
  p_key text,
  p_seat uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_who uuid[];
  v_missing integer;
  v_applied boolean;
begin
  if p_key is null or not public.is_condition(p_key) then
    return null;
  end if;

  if p_campaign is null or not public.owns_campaign(p_campaign) then
    return null;
  end if;

  select coalesce(array_agg(m.character_id), '{}'::uuid[])
    into v_who
  from public.campaign_members m
  where m.campaign_id = p_campaign;

  if coalesce(array_length(v_who, 1), 0) = 0 then
    return null;
  end if;

  select count(*) into v_missing
  from public.characters c
  where c.id = any (v_who)
    and not (p_key = any (c.conditions));

  v_applied := v_missing > 0;

  update public.characters c
    set conditions = case
      when v_applied then
        case when p_key = any (c.conditions)
          then c.conditions
          else c.conditions || p_key
        end
      else array_remove(c.conditions, p_key)
    end
    where c.id = any (v_who);

  perform public.log_condition(
    p_campaign, p_seat, null, p_key, v_applied
  );

  return jsonb_build_object(
    'applied', v_applied,
    'characterIds', to_jsonb(v_who)
  );
end;
$fn$;

revoke all on function public.toggle_party_condition(uuid, text, uuid) from public;
revoke all on function public.toggle_party_condition(uuid, text, uuid) from anon;
grant execute on function public.toggle_party_condition(uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The line it leaves.
-- ---------------------------------------------------------------------------
--
-- `write_table_log` builds the actor from whatever seat it is handed and says
-- nothing about whether that seat is the caller's — so the chair is asked again
-- here, the way `apply_damage` and `roll_death_save` ask it. PostgREST is
-- reachable directly with the anon key.
--
-- A NULL TARGET IS THE PARTY, and `write_table_log` writes no `targetName` for
-- one, so the sentence is completed by a key of this function's own. Maria's
-- activity-presentation.jsx is where both become English.
create or replace function public.log_condition(
  p_campaign uuid,
  p_seat uuid,
  p_target uuid,
  p_key text,
  p_applied boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
begin
  if p_campaign is null then
    return;
  end if;

  if not public.my_seat_at_table(p_campaign, p_seat) then
    return;
  end if;

  perform public.write_table_log(
    p_campaign,
    p_seat,
    case when p_applied then 'condition_applied' else 'condition_removed' end,
    p_target,
    case
      when p_target is null then
        jsonb_build_object('condition', p_key, 'targetName', 'the party')
      else jsonb_build_object('condition', p_key)
    end
  );
end;
$fn$;

revoke all on function public.log_condition(uuid, uuid, uuid, text, boolean) from public;
revoke all on function public.log_condition(uuid, uuid, uuid, text, boolean) from anon;
revoke all on function public.log_condition(uuid, uuid, uuid, text, boolean) from authenticated;

-- ---------------------------------------------------------------------------
-- Two more things the log can say.
-- ---------------------------------------------------------------------------
--
-- The whole list again rather than a patch: this constraint is dropped and
-- re-added by every file that adds to it, so this is now the one to re-run after
-- an out-of-order paste. Mirrors ACTION_TYPES in rules/activity.js.
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
      'max_hp_change',
      'instant_death',
      'death_save',
      'character_died',
      'character_revived',
      'condition_applied',
      'condition_removed'
    )
  );

-- ---------------------------------------------------------------------------
-- The party, now saying what everybody is under.
-- ---------------------------------------------------------------------------
--
-- 20260909090000's function with one column added. Dropped first because the
-- RETURN TYPE grows, which `create or replace` refuses outright.
--
-- NOT NARROWED, and deliberately: a character standing there poisoned in front
-- of the party is not a secret, and every chair draws the badges on every card.
drop function if exists public.campaign_party(uuid);

create function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text,
  level integer,
  xp integer,
  inspiration integer,
  current_hp integer,
  max_hp integer,
  armor_class integer,
  death_saves jsonb,
  is_dead boolean,
  conditions text[],
  is_mine boolean,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.color_theme,
         c.level, c.xp,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.inspiration
         end,
         c.current_hp, c.max_hp,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.armor_class
         end,
         c.death_saves, c.is_dead, c.conditions,
         public.owns_character(c.id), m.added_at
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    )
  order by m.added_at;
$$;

revoke all on function public.campaign_party(uuid) from public;
revoke all on function public.campaign_party(uuid) from anon;
grant execute on function public.campaign_party(uuid) to authenticated;
