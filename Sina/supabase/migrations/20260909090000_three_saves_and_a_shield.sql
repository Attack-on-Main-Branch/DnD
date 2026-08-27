-- What happens at zero, and the number that decides whether you get there.
--
-- Until now a bar that reached zero was just an empty bar. This gives the table
-- the rest of 5e's answer: three death saves, the blow that skips them, a way
-- back for whoever runs the session, and an armour class to be missed by.
--
-- ONE DOOR PER COLUMN, which is the rule the rest of this schema is written
-- under, and it is why `change_character_health` is REDEFINED here rather than
-- left beside the new pair. `apply_damage` and `apply_heal` are the two halves
-- of a hit point moving and they carry the death rules; the old entry point now
-- forwards into them, so the party card, the rest, and anything else already
-- holding a delta keeps working and cannot take a different path through the
-- same column.
--
-- THE CAMPAIGN AND THE CHAIR RIDE ALONG as trailing arguments with defaults. A
-- character sits at more than one table, so "may the Dungeon Master do this" is
-- never a question about a character alone — and `arm_table_log` needs both to
-- leave a line. Called with the id and the amount alone, each of these is still
-- the character owner's own door and writes nothing to the log.
--
-- EVERY RULE BELOW IS MIRRORED BY Sina/src/rules/death.js, which is what the
-- card paints with before the answer lands. Changing one means changing both.

-- ---------------------------------------------------------------------------
-- Three columns.
-- ---------------------------------------------------------------------------
--
-- `death_saves` is jsonb and not two integers because it is one fact — where a
-- character stands between standing up and not — and every write sets both
-- halves at once. `is_dead` is a column of its own rather than a sentinel hit
-- point: zero is unconscious and zero is also dead, and the table needs to be
-- able to tell those apart at a glance.
alter table public.characters
  add column if not exists armor_class integer not null default 10;

alter table public.characters
  add column if not exists death_saves jsonb not null
  default '{"successes": 0, "failures": 0}'::jsonb;

alter table public.characters
  add column if not exists is_dead boolean not null default false;

-- Mirrors MIN_ARMOR_CLASS and MAX_ARMOR_CLASS in Sina/src/rules/death.js. The
-- ceiling is not in 5e; it is here because a column with no top is a column a
-- paste can put four thousand into.
alter table public.characters
  drop constraint if exists characters_armor_class_check;

alter table public.characters
  add constraint characters_armor_class_check
  check (armor_class between 0 and 99);

-- Both tallies present, both inside 0..3. Mirrors DEATH_SAVE_TARGET.
alter table public.characters
  drop constraint if exists characters_death_saves_check;

alter table public.characters
  add constraint characters_death_saves_check
  check (
    jsonb_typeof(death_saves) = 'object'
    and (death_saves -> 'successes') is not null
    and (death_saves -> 'failures') is not null
    and (death_saves ->> 'successes')::integer between 0 and 3
    and (death_saves ->> 'failures')::integer between 0 and 3
  );

-- ---------------------------------------------------------------------------
-- Who may move somebody else's bar.
-- ---------------------------------------------------------------------------
--
-- `change_character_health`'s predicate since 20260821160000, lifted out so the
-- five functions below cannot each grow their own version of it. Scoped by
-- campaign deliberately: the question is never "is this a Dungeon Master" but
-- "is this the Dungeon Master of a campaign this character is playing in".
create or replace function public.may_move_character(
  p_char_id uuid,
  p_campaign uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    public.owns_character(p_char_id)
    or (
      p_campaign is not null
      and public.owns_campaign(p_campaign)
      and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = p_campaign
          and m.character_id = p_char_id
      )
    );
$fn$;

revoke all on function public.may_move_character(uuid, uuid) from public;
revoke all on function public.may_move_character(uuid, uuid) from anon;
grant execute on function public.may_move_character(uuid, uuid) to authenticated;

-- The tallies, wiped. Written out once so five functions cannot disagree.
create or replace function public.no_death_saves()
returns jsonb
language sql
immutable
set search_path = ''
as $fn$
  select '{"successes": 0, "failures": 0}'::jsonb;
$fn$;

revoke all on function public.no_death_saves() from public;
revoke all on function public.no_death_saves() from anon;
grant execute on function public.no_death_saves() to authenticated;

-- ---------------------------------------------------------------------------
-- Damage.
-- ---------------------------------------------------------------------------
--
-- MASSIVE DAMAGE IS MEASURED ON THE OVERFLOW and not on the blow, which is 5e's
-- own rule and the one thing here that is easy to get wrong: a character on 3 of
-- 20 is killed outright by 23 and merely knocked out by 22. `isMassiveDamage`
-- says the same thing in JavaScript.
--
-- The row is locked before it is read. Two chairs calling out damage in the same
-- breath would otherwise both read the same starting figure, and the second
-- would decide "instant death" against hit points the first has already taken.
--
-- The log gets TWO lines for a killing blow — the damage, then the death — and
-- that is deliberate: the first is what somebody did and the second is what it
-- came to. The first is written by the `characters_log_health` trigger, which is
-- why the arming happens before the update rather than after it.
create or replace function public.apply_damage(
  p_char_id uuid,
  p_damage integer,
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
  v_current integer;
  v_max integer;
  v_dead boolean;
  v_next integer;
  v_killed boolean := false;
begin
  if p_damage is null or p_damage <= 0 or p_damage > 205 then
    return null;
  end if;

  if not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.current_hp, c.max_hp, c.is_dead
    into v_current, v_max, v_dead
    from public.characters c
    where c.id = p_char_id
    for update;

  -- No row reads back exactly as a refusal does, and a caller must not be able
  -- to tell them apart.
  if v_current is null then
    return null;
  end if;

  -- Nothing more can be done to them. Answered rather than refused, so a second
  -- press on a card that has just gone dark is not an error.
  if v_dead then
    return jsonb_build_object(
      'current_hp', 0, 'is_dead', true, 'instant_death', false
    ) || public.no_death_saves();
  end if;

  perform public.arm_table_log(
    p_campaign, p_seat, null, p_char_id, p_char_id
  );

  v_killed := v_current - p_damage <= -v_max;
  v_next := greatest(0, v_current - p_damage);

  update public.characters c
    set current_hp = v_next,
        is_dead = v_killed,
        -- Down is a clean slate either way: the tallies belong to the spell of
        -- unconsciousness they were rolled in, not to the character.
        death_saves = case
          when v_next = 0 then public.no_death_saves()
          else c.death_saves
        end
    where c.id = p_char_id;

  -- THE CHAIR IS ASKED AGAIN before a line is written under its name.
  -- `arm_table_log` above verifies it for the trigger's entry and then says
  -- nothing about the outcome; `write_table_log` builds an actor from whatever
  -- seat it is handed. PostgREST is reachable directly with the anon key, so
  -- without this a caller could file the death of a character they are nowhere
  -- near under any name at the table.
  if v_killed and public.my_seat_at_table(p_campaign, p_seat) then
    perform public.write_table_log(
      p_campaign, p_seat, 'instant_death', p_char_id,
      jsonb_build_object('damage', p_damage)
    );
  end if;

  return jsonb_build_object(
    'current_hp', v_next,
    'is_dead', v_killed,
    'instant_death', v_killed
  ) || (
    case when v_next = 0 then public.no_death_saves()
    else (select c.death_saves from public.characters c where c.id = p_char_id)
    end
  );
end;
$fn$;

revoke all on function public.apply_damage(uuid, integer, uuid, uuid) from public;
revoke all on function public.apply_damage(uuid, integer, uuid, uuid) from anon;
grant execute on function public.apply_damage(uuid, integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Healing.
-- ---------------------------------------------------------------------------
--
-- A HEAL DOES NOT RAISE THE DEAD. 5e is explicit about it and so is this: the
-- only way back from `is_dead` is `revive_character`, which is the head of the
-- table's alone. A heal aimed at a dead character is answered rather than
-- refused, for the reason damage is.
--
-- Anything that puts a hit point back clears the tallies, whether or not the
-- character was at zero when it landed: being healed is what ends the spell of
-- dying, and a character standing on two successes is not still holding them.
create or replace function public.apply_heal(
  p_char_id uuid,
  p_heal integer,
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
  v_current integer;
  v_max integer;
  v_dead boolean;
  v_next integer;
begin
  if p_heal is null or p_heal <= 0 or p_heal > 205 then
    return null;
  end if;

  if not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.current_hp, c.max_hp, c.is_dead
    into v_current, v_max, v_dead
    from public.characters c
    where c.id = p_char_id
    for update;

  if v_current is null then
    return null;
  end if;

  if v_dead then
    return jsonb_build_object(
      'current_hp', 0, 'is_dead', true, 'instant_death', false
    ) || public.no_death_saves();
  end if;

  perform public.arm_table_log(
    p_campaign, p_seat, null, p_char_id, p_char_id
  );

  v_next := least(v_max, v_current + p_heal);

  update public.characters c
    set current_hp = v_next,
        death_saves = public.no_death_saves()
    where c.id = p_char_id;

  return jsonb_build_object(
    'current_hp', v_next,
    'is_dead', false,
    'instant_death', false
  ) || public.no_death_saves();
end;
$fn$;

revoke all on function public.apply_heal(uuid, integer, uuid, uuid) from public;
revoke all on function public.apply_heal(uuid, integer, uuid, uuid) from anon;
grant execute on function public.apply_heal(uuid, integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The old door, forwarding.
-- ---------------------------------------------------------------------------
--
-- 20260830090000's signature and return type exactly — an integer, the hit
-- points the bar landed on — so `updateCharacterHealth` and the party card need
-- no idea any of this happened. What changed is that it no longer writes to
-- `current_hp` itself: a delta is damage or a heal, and both of those now carry
-- rules a bare `least/greatest` cannot express.
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
  v_answer jsonb;
begin
  if hp_delta is null or hp_delta = 0 or abs(hp_delta) > 205 then
    return null;
  end if;

  if hp_delta < 0 then
    v_answer := public.apply_damage(
      target_character, -hp_delta, target_campaign, acting_seat
    );
  else
    v_answer := public.apply_heal(
      target_character, hp_delta, target_campaign, acting_seat
    );
  end if;

  if v_answer is null then
    return null;
  end if;

  return (v_answer ->> 'current_hp')::integer;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- The three rolls.
-- ---------------------------------------------------------------------------
--
-- `p_roll_override` is how the table's own d20 gets in. The board's dice are a
-- physics simulation and cannot be told what to land on, so the face they come
-- to rest at is passed in here and the rules are applied to it — one number,
-- seen by every chair, recorded once. Called with nothing, this rolls its own,
-- which is what a table with the board switched off gets.
--
-- ONLY WHILE DYING. A character on their feet has no save to make and a dead one
-- has nothing left to roll for; both are refused rather than answered, because
-- unlike a second press on a dead card this is a button that should not have
-- been there at all.
--
-- The hit point that a stabilised character stands up on is written with the log
-- DISARMED, so the panel says "stabilised" once rather than saying it beside a
-- line about one hit point being restored.
create or replace function public.roll_death_save(
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
  v_current integer;
  v_dead boolean;
  v_saves jsonb;
  v_roll integer;
  v_successes integer;
  v_failures integer;
  v_revived boolean := false;
  v_died boolean := false;
  v_outcome text;
begin
  if not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.current_hp, c.is_dead, c.death_saves
    into v_current, v_dead, v_saves
    from public.characters c
    where c.id = p_char_id
    for update;

  if v_current is null or v_dead or v_current <> 0 then
    return null;
  end if;

  v_roll := case
    when p_roll_override between 1 and 20 then p_roll_override
    else 1 + floor(random() * 20)::integer
  end;

  v_successes := coalesce((v_saves ->> 'successes')::integer, 0);
  v_failures := coalesce((v_saves ->> 'failures')::integer, 0);

  if v_roll = 20 then
    v_outcome := 'revived';
    v_revived := true;
    v_successes := 0;
    v_failures := 0;
  elsif v_roll >= 10 then
    v_outcome := 'success';
    v_successes := v_successes + 1;

    if v_successes >= 3 then
      v_revived := true;
      v_successes := 0;
      v_failures := 0;
    end if;
  else
    v_outcome := case when v_roll = 1 then 'critical_failure' else 'failure' end;
    v_failures := least(3, v_failures + case when v_roll = 1 then 2 else 1 end);

    if v_failures >= 3 then
      v_died := true;
      v_successes := 0;
      v_failures := 0;
    end if;
  end if;

  -- Disarmed, so the hit point a stabilised character stands up on writes no
  -- line of its own. The sentence for this is the one written below.
  perform public.arm_table_log(null, null, null, null, null);

  update public.characters c
    set current_hp = case when v_revived then 1 else 0 end,
        is_dead = v_died,
        death_saves = jsonb_build_object(
          'successes', v_successes, 'failures', v_failures
        )
    where c.id = p_char_id;

  -- The chair, asked the way `arm_table_log` asks it — see the note in
  -- `apply_damage`. A save rolled from nowhere moves the tallies of a character
  -- the caller is entitled to and leaves no line under anybody's name.
  if public.my_seat_at_table(p_campaign, p_seat) then
    perform public.write_table_log(
      p_campaign, p_seat, 'death_save', p_char_id,
      jsonb_build_object('roll', v_roll, 'outcome', v_outcome)
    );

    if v_died then
      perform public.write_table_log(
        p_campaign, p_seat, 'character_died', p_char_id, '{}'::jsonb
      );
    end if;
  end if;

  return jsonb_build_object(
    'roll', v_roll,
    'successes', v_successes,
    'failures', v_failures,
    'is_dead', v_died,
    'revived', v_revived,
    'outcome', v_outcome,
    'current_hp', case when v_revived then 1 else 0 end
  );
end;
$fn$;

revoke all on function public.roll_death_save(uuid, integer, uuid, uuid) from public;
revoke all on function public.roll_death_save(uuid, integer, uuid, uuid) from anon;
grant execute on function public.roll_death_save(uuid, integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Back on their feet.
-- ---------------------------------------------------------------------------
--
-- THE HEAD OF THE TABLE'S ALONE, and `may_move_character` is the wrong question
-- for it: that one admits the character's owner, and a player must not be able
-- to undo their own death. `owns_campaign` and a membership, exactly as
-- `record_campaign_activity` draws the same line for a grant to the party.
create or replace function public.revive_character(
  p_char_id uuid,
  p_campaign uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_permitted boolean;
begin
  select
    p_campaign is not null
    and public.owns_campaign(p_campaign)
    and exists (
      select 1 from public.campaign_members m
      where m.campaign_id = p_campaign
        and m.character_id = p_char_id
    )
  into v_permitted;

  if not v_permitted then
    return null;
  end if;

  -- Disarmed: the line this leaves is written below, and the hit point it puts
  -- back is not a heal anybody called out.
  perform public.arm_table_log(null, null, null, null, null);

  update public.characters c
    set is_dead = false,
        current_hp = 1,
        death_saves = public.no_death_saves()
    where c.id = p_char_id;

  if not found then
    return null;
  end if;

  perform public.write_table_log(
    p_campaign, null, 'character_revived', p_char_id, '{}'::jsonb
  );

  return jsonb_build_object(
    'current_hp', 1, 'is_dead', false
  ) || public.no_death_saves();
end;
$fn$;

revoke all on function public.revive_character(uuid, uuid) from public;
revoke all on function public.revive_character(uuid, uuid) from anon;
grant execute on function public.revive_character(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The shield.
-- ---------------------------------------------------------------------------
--
-- A definer function rather than an UPDATE policy, for the reason
-- `set_character_health` is one: RLS grants rows and never columns, so the
-- narrowest policy admitting `armor_class` would admit the name, the race and
-- the backstory beside it.
--
-- No line in the log. An armour class is a fact about a character rather than
-- something that happens at a table, the way a skill is.
create or replace function public.update_armor_class(
  p_char_id uuid,
  p_ac integer,
  p_campaign uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_landed integer;
begin
  if p_ac is null or p_ac < 0 or p_ac > 99 then
    return null;
  end if;

  if not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  update public.characters c
    set armor_class = p_ac
    where c.id = p_char_id
    returning c.armor_class into v_landed;

  return v_landed;
end;
$fn$;

revoke all on function public.update_armor_class(uuid, integer, uuid) from public;
revoke all on function public.update_armor_class(uuid, integer, uuid) from anon;
grant execute on function public.update_armor_class(uuid, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Four more things the log can say.
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
      'character_revived'
    )
  );

-- ---------------------------------------------------------------------------
-- The party, now carrying the shield and the saves.
-- ---------------------------------------------------------------------------
--
-- 20260906090000's function with three columns added. Dropped first because the
-- RETURN TYPE grows, which `create or replace` refuses outright.
--
-- `armor_class` is narrowed the way `inspiration` is: the head of the table
-- reads every card's, a player only their own. That is a rule about what may be
-- READ and so it belongs here rather than in a component — RLS grants rows and
-- never columns, and this function's return type is how a subset of one is
-- shared at all.
--
-- `death_saves` and `is_dead` are NOT narrowed, and deliberately: a character
-- lying at zero in front of the party is the most public thing that can happen
-- at a table, and every chair has to be able to see it.
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
         c.death_saves, c.is_dead,
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

-- ---------------------------------------------------------------------------
-- A rest raises nobody.
-- ---------------------------------------------------------------------------
--
-- 20260905090000's function with one clause added. A long rest filled every bar
-- at the table, which for a dead character meant a full bar over `is_dead` —
-- a row saying two opposite things. The dead are left out of the set entirely
-- rather than rested and then skipped, so the count the log reports is the
-- number of people who actually slept.
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
