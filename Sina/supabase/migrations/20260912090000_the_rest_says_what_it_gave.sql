-- A rest that reports the dice it handed back.
--
-- 20260911090000 taught the long rest to return half the pool, and said nothing
-- about it: the function's answer carried the bar and the slots, so the vitals
-- ribbon — which reads the tally out of the browser's own copy — went on
-- printing "1 / 2 d6" over a row that had said "2 / 2" for a minute. Five tiles
-- telling the table something that had stopped being true.
--
-- REPORTING IT RATHER THAN PAINTING IT. The drawer could have worked the figure
-- out for itself; `hitDiceRegained` is right there and mirrors the arithmetic
-- exactly. But then there would be two implementations of "half the rung, never
-- none" to keep in step, and the rule this schema is written under is that the
-- database's own numbers are laid over whatever a press painted. So the column
-- rides out with the other two.
--
-- Its own file rather than an edit to yesterday's, because that one has been
-- applied: a `create or replace` with a different body inside a migration that
-- has already run is a change that never ships and cannot be seen to be
-- missing. See the note in CLAUDE.md about pasting these out of order.
--
-- Dropped first because the RETURN TYPE grows, which `create or replace`
-- refuses outright (SQLSTATE 42P13). Nothing depends on it by signature — the
-- data layer calls it by name through PostgREST — and the grants are restated
-- below, which a drop takes with it.

drop function if exists public.trigger_rest(uuid, uuid[], text, uuid);

create function public.trigger_rest(
  p_campaign_id uuid,
  p_target_char_ids uuid[],
  p_rest_type text,
  p_seat uuid default null
)
returns table (
  id uuid,
  current_hp integer,
  spell_slots jsonb,
  hit_dice_spent integer
)
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
        -- it is what the dice are SPENT on. Mirrors `hitDiceRegained`.
        hit_dice_spent = case
          when v_long
            then greatest(0, c.hit_dice_spent - greatest(1, c.level / 2))
          else c.hit_dice_spent
        end
    where c.id = any (v_who)
    returning c.id, c.current_hp, c.spell_slots, c.hit_dice_spent;

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
