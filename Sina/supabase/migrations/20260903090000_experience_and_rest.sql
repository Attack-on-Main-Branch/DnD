-- "Fern gained +150 XP." "Fern levelled up to 5." "The party took a long rest."
--
-- Session management: the experience a table hands out between fights, and the
-- two rests that put it back together. Both are opened from the mark under the
-- chest on the rail beside the map.
--
-- XP HERE IS PROGRESS INSIDE THE CURRENT LEVEL, not a running total. A gain that
-- crosses the threshold spends it and carries the remainder up, which is what
-- lets the bar read `150 / 200` at every rung without the panel subtracting
-- anything for itself. Mirrored by `steppedXp` in Sina/src/rules/xp.js.
--
-- WHAT IS ATOMIC AND WHY. An award moves two columns and a rest moves as many as
-- twelve across six characters. A browser that read a bar which had filled past
-- a level nobody climbed, or a party half-rested because the second statement
-- failed, would both be worse than the deed not happening — so each is one
-- function, one transaction, and the rows are locked before they are read.

-- ---------------------------------------------------------------------------
-- The column.
-- ---------------------------------------------------------------------------
--
-- Bounded in both places, as every figure on this table is. The ceiling is slack
-- rather than tight: progress never reaches the largest threshold, so 100000 is
-- headroom for a row written before this file rather than a limit anybody meets.
alter table public.characters
  add column if not exists xp integer not null default 0;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_xp_check'
  ) then
    alter table public.characters
      add constraint characters_xp_check check (xp between 0 and 100000);
  end if;
end;
$ck$;

-- ---------------------------------------------------------------------------
-- The ladder.
-- ---------------------------------------------------------------------------
--
-- What each level costs to leave, 1st through 19th. NULL at the 20th: there is
-- nothing above it to reach, and a null is what every caller below branches on.
--
-- Mirrors XP_THRESHOLDS in Sina/src/rules/xp.js. Changing one means changing
-- both — a table that disagreed would level a character on one side of the wire
-- and not the other.
create or replace function public.xp_threshold(p_level integer)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select case
    when p_level is null or p_level < 1 or p_level >= 20 then null
    else (
      ('[200,400,500,1100,1400,1700,2100,2400,2800,3600,4500,5100,5700,'
       || '6400,7200,8800,9500,10900,12700]')::jsonb ->> (p_level - 1)
    )::integer
  end;
$fn$;

revoke all on function public.xp_threshold(integer) from public;
revoke all on function public.xp_threshold(integer) from anon;
grant execute on function public.xp_threshold(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Where a change lands.
-- ---------------------------------------------------------------------------
--
-- The whole of `steppedXp`, in the one place a write can be trusted. A GAIN
-- CLIMBS AND A LOSS DOES NOT DESCEND: experience is taken back to correct a
-- mistake, and unmaking a level somebody has already spent — new slots, a new
-- proficiency bonus — stays where it has always been, on the ring on the party
-- card, which is the head of the table's alone.
create or replace function public.xp_after(
  p_level integer,
  p_xp integer,
  p_delta integer
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_level integer := least(20, greatest(1, coalesce(p_level, 1)));
  v_xp integer := greatest(0, coalesce(p_xp, 0)) + coalesce(p_delta, 0);
  v_cost integer;
begin
  if coalesce(p_delta, 0) <= 0 then
    return jsonb_build_object('level', v_level, 'xp', greatest(0, v_xp));
  end if;

  v_cost := public.xp_threshold(v_level);

  while v_cost is not null and v_xp >= v_cost loop
    v_xp := v_xp - v_cost;
    v_level := v_level + 1;
    v_cost := public.xp_threshold(v_level);
  end loop;

  -- Nothing to progress towards at the top, so nothing is banked there.
  if v_cost is null then
    v_xp := 0;
  end if;

  return jsonb_build_object('level', v_level, 'xp', least(100000, v_xp));
end;
$fn$;

revoke all on function public.xp_after(integer, integer, integer) from public;
revoke all on function public.xp_after(integer, integer, integer) from anon;
grant execute on function public.xp_after(integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Which classes get anything back on the hour.
-- ---------------------------------------------------------------------------
--
-- Pact Magic alone. It is the one resource in this schema that returns on a
-- short rest: Action Surge, Second Wind, Channel Divinity, Ki and the Hit Dice a
-- long rest half restores have no column on `characters`, so there is nothing
-- for a short rest to reset for anybody else. Mirrors `shortRestSlotLevels` in
-- Sina/src/rules/rest.js, and the `'pact'` branch of `spell_slot_maximum`.
create or replace function public.pact_caster(p_class_id text)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select p_class_id = 'warlock';
$fn$;

revoke all on function public.pact_caster(text) from public;
revoke all on function public.pact_caster(text) from anon;
grant execute on function public.pact_caster(text) to authenticated;

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
      'rest_taken'
    )
  );

-- ---------------------------------------------------------------------------
-- The party, now carrying its experience.
-- ---------------------------------------------------------------------------
--
-- 20260824160000's function with one column added. Dropped first because the
-- RETURN TYPE grows, which `create or replace` refuses outright.
--
-- `xp` belongs here rather than on `campaign_sheets`: the bar is drawn for a
-- player's own chair as well as for the head of the table's, and this is the one
-- read that answers both. What it is NOT is the whole row — see the note in
-- CLAUDE.md about RLS granting rows and never columns.
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
  current_hp integer,
  max_hp integer,
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
         c.level, c.xp, c.current_hp, c.max_hp,
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
-- Awarding it.
-- ---------------------------------------------------------------------------
--
-- A CHANGE and never a total, for the reason `change_character_health` is one:
-- the figure is added to the row this statement has locked, so two awards in the
-- same breath stack rather than one overwriting the other.
--
-- A NULL `p_char_id` IS THE WHOLE PARTY, and that is the head of the table's
-- alone — the same rule `record_campaign_activity` puts on a grant to the party.
-- A named character is written for by their owner, or by the Dungeon Master of a
-- campaign they are playing in: `change_character_health`'s permission, because
-- an award and a heal are the same kind of pen over the same kind of number.
--
-- THE LEVEL-UP LINE IS NOT WRITTEN HERE. `arm_table_log` is called first, so a
-- rung climbed leaves `characters_log_level`'s own `level_change` entry inside
-- this transaction. Nothing below touches `current_hp`, so the health trigger
-- beside it has nothing to fire on.
--
-- No rows is a refusal, and reads as the same answer a character who has left
-- the party gives. A caller must not be able to tell those apart.
create or replace function public.modify_character_xp(
  p_char_id uuid,
  p_delta integer,
  p_campaign uuid,
  p_seat uuid default null
)
returns table (id uuid, xp integer, level integer, levels_gained integer)
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_party boolean := p_char_id is null;
  v_head boolean := public.owns_campaign(p_campaign);
begin
  -- Mirrors MAX_XP_AWARD in Sina/src/rules/xp.js. Zero is not an event.
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    return;
  end if;

  if v_party then
    if not v_head then
      return;
    end if;
  elsif not (
    public.owns_character(p_char_id)
    or (
      v_head
      and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = p_campaign
          and m.character_id = p_char_id
      )
    )
  ) then
    return;
  end if;

  perform public.arm_table_log(p_campaign, p_seat, null, p_char_id, p_char_id);

  -- Locked before they are read, and in a settled order so two party-wide
  -- awards cannot take each other's rows in opposite directions.
  perform 1
  from public.characters c
  join public.campaign_members m on m.character_id = c.id
  where m.campaign_id = p_campaign
    and (v_party or c.id = p_char_id)
  order by c.id
  for update of c;

  return query
  with landing as (
    select c.id as who,
           c.level as was,
           public.xp_after(c.level, c.xp, p_delta) as lands
    from public.characters c
    join public.campaign_members m on m.character_id = c.id
    where m.campaign_id = p_campaign
      and (v_party or c.id = p_char_id)
  ),
  written as (
    update public.characters c
      set xp = (l.lands ->> 'xp')::integer,
          level = (l.lands ->> 'level')::integer
      from landing l
      where c.id = l.who
      returning c.id, c.xp, c.level, l.was
  )
  select w.id, w.xp, w.level, w.level - w.was from written w;

  -- One line for the deed, however many characters it reached. `the party` is a
  -- fixed string, so there is still nothing here a caller wrote — the same shape
  -- `record_campaign_activity` uses for a grant to everybody at once.
  if found then
    if v_party then
      perform public.write_table_log(
        p_campaign, p_seat, 'xp_change', null,
        jsonb_build_object('delta', p_delta, 'targetName', 'the party')
      );
    else
      perform public.write_table_log(
        p_campaign, p_seat, 'xp_change', p_char_id,
        jsonb_build_object('delta', p_delta)
      );
    end if;
  end if;
end;
$fn$;

revoke all on function public.modify_character_xp(uuid, integer, uuid, uuid) from public;
revoke all on function public.modify_character_xp(uuid, integer, uuid, uuid) from anon;
grant execute on function public.modify_character_xp(uuid, integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resting.
-- ---------------------------------------------------------------------------
--
-- A LONG rest is hit points to the character's own maximum and every slot
-- unspent; a SHORT one reaches Pact Magic and nothing else — see `pact_caster`
-- above for what this schema does and does not hold.
--
-- Whose is the same question `modify_character_xp` asks, and for the same
-- reason: a player calls their own rest, the head of the table calls anybody's
-- or the whole party's.
--
-- DELIBERATELY NOT ARMED. A long rest moves as many as six bars at once, and
-- every one of them would leave an `hp_change` line through
-- `characters_log_health` — six lines burying the one entry this writes, in a
-- log that keeps ten. An unset `grimoire.campaign` is what leaves no line;
-- `arm_table_log` disarms first, so not calling it is the whole of it.
--
-- One statement, so a party is rested completely or not at all.
create or replace function public.trigger_rest(
  p_campaign_id uuid,
  p_target_char_id uuid,
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
  v_party boolean := p_target_char_id is null;
  v_head boolean := public.owns_campaign(p_campaign_id);
  v_long boolean := p_rest_type = 'long';
begin
  -- Mirrors REST_TYPES in Sina/src/rules/rest.js.
  if p_rest_type is null or p_rest_type not in ('short', 'long') then
    return;
  end if;

  if v_party then
    if not v_head then
      return;
    end if;
  elsif not (
    public.owns_character(p_target_char_id)
    or (
      v_head
      and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = p_campaign_id
          and m.character_id = p_target_char_id
      )
    )
  ) then
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
        end
    where c.id in (
      select m.character_id
      from public.campaign_members m
      where m.campaign_id = p_campaign_id
        and (v_party or m.character_id = p_target_char_id)
    )
    returning c.id, c.current_hp, c.spell_slots;

  if found then
    if v_party then
      perform public.write_table_log(
        p_campaign_id, p_seat, 'rest_taken', null,
        jsonb_build_object('restType', p_rest_type, 'targetName', 'the party')
      );
    else
      perform public.write_table_log(
        p_campaign_id, p_seat, 'rest_taken', p_target_char_id,
        jsonb_build_object('restType', p_rest_type)
      );
    end if;
  end if;
end;
$fn$;

revoke all on function public.trigger_rest(uuid, uuid, text, uuid) from public;
revoke all on function public.trigger_rest(uuid, uuid, text, uuid) from anon;
grant execute on function public.trigger_rest(uuid, uuid, text, uuid) to authenticated;
