-- "Dungeon Master granted +150 XP to 2 of the party."
--
-- The session panel now aims the way the chest does: `Who this is for` is the
-- chest's own multi-select, so a rest or an award can reach any subset of the
-- party rather than one character or all of them.
--
-- So both writers take a uuid[] where they took a single id, and both narrow it
-- the way `reveal_chest` narrows its audience: to the characters actually in
-- this party that the caller may write for, each of them once. An empty set is
-- a refusal — the panel greys its buttons out, and this is the second lock.
--
-- WHO THE LINE NAMES follows `chest_revealed`, for the same reason: a name where
-- there is ONE name to say, and a count where there are several. `the party` and
-- `N of the party` are built here out of a count, so there is still nothing in
-- that column a caller wrote.
--
-- Dropped first because the PARAMETER TYPES change, for the reason 20260823120000
-- gives: PostgREST resolves an overload by the exact set of keys it is handed, so
-- the single-id versions would go on answering anyone still calling them.

drop function if exists public.modify_character_xp(uuid, integer, uuid, uuid);
drop function if exists public.trigger_rest(uuid, uuid, text, uuid);

-- ---------------------------------------------------------------------------
-- Awarding it.
-- ---------------------------------------------------------------------------
--
-- 20260903090000's function with the target widened, and nothing else changed:
-- the rows are still locked before they are read so two awards in the same
-- breath stack, `xp_after` is still where the arithmetic lives, and the level-up
-- line is still `characters_log_level`'s own — `arm_table_log` first, so a rung
-- climbed leaves its entry inside this transaction.
create or replace function public.modify_character_xp(
  p_char_ids uuid[],
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
  v_head boolean := public.owns_campaign(p_campaign);
  v_who uuid[];
  v_reached integer;
  v_party integer;
begin
  -- Mirrors MAX_XP_AWARD in Sina/src/rules/xp.js. Zero is not an event.
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    return;
  end if;

  -- Narrowed to this party, and to the ones the caller holds a pen over: the
  -- Dungeon Master over all of them, anybody else over their own alone. Named
  -- characters they may not write for are dropped rather than refusing the
  -- whole deed, which is how `reveal_chest` reads an audience.
  select coalesce(array_agg(distinct m.character_id), '{}'::uuid[])
    into v_who
  from public.campaign_members m
  where m.campaign_id = p_campaign
    and m.character_id = any (coalesce(p_char_ids, '{}'::uuid[]))
    and (v_head or public.owns_character(m.character_id));

  v_reached := coalesce(array_length(v_who, 1), 0);

  if v_reached = 0 then
    return;
  end if;

  perform public.arm_table_log(
    p_campaign, p_seat, null,
    case when v_reached = 1 then v_who[1] end,
    case when v_reached = 1 then v_who[1] end
  );

  -- Locked before they are read, and in a settled order so two awards cannot
  -- take each other's rows in opposite directions.
  perform 1
  from public.characters c
  where c.id = any (v_who)
  order by c.id
  for update;

  return query
  with landing as (
    select c.id as who,
           c.level as was,
           public.xp_after(c.level, c.xp, p_delta) as lands
    from public.characters c
    where c.id = any (v_who)
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

  -- One line for the deed, however many characters it reached.
  select count(*) into v_party
  from public.campaign_members m
  where m.campaign_id = p_campaign;

  if v_reached = 1 then
    perform public.write_table_log(
      p_campaign, p_seat, 'xp_change', v_who[1],
      jsonb_build_object('delta', p_delta)
    );
  else
    perform public.write_table_log(
      p_campaign, p_seat, 'xp_change', null,
      jsonb_build_object(
        'delta', p_delta,
        'targetName', case
          when v_reached >= v_party then 'the party'
          else v_reached || ' of the party'
        end
      )
    );
  end if;
end;
$fn$;

revoke all on function public.modify_character_xp(uuid[], integer, uuid, uuid) from public;
revoke all on function public.modify_character_xp(uuid[], integer, uuid, uuid) from anon;
grant execute on function public.modify_character_xp(uuid[], integer, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resting.
-- ---------------------------------------------------------------------------
--
-- The same widening, and 20260903090000's body otherwise: one statement, so a
-- party is rested completely or not at all, and DELIBERATELY NOT ARMED — six
-- bars filling would leave six `hp_change` lines through
-- `characters_log_health`, burying the single entry written below in a log that
-- keeps ten.
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
  where m.campaign_id = p_campaign_id
    and m.character_id = any (coalesce(p_target_char_ids, '{}'::uuid[]))
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
