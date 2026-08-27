-- Three corrections to what the last two files left.
--
-- 1. A DUNGEON MASTER DOES NOT ROLL SOMEBODY ELSE'S DEATH SAVES. Those three
--    rolls are the one thing a dying player still gets to do, and handing the
--    dice to the other side of the screen takes the only tension in the rule
--    with it. What the head of the table gets instead is `kill_character` — the
--    decision, said out loud, rather than a die thrown on somebody's behalf.
--
-- 2. A CONDITION AIMED AT THREE PEOPLE MUST NOT REACH SIX. `toggle_party_condition`
--    read every member of the campaign and ignored the subset the panel's menu
--    had chosen, so "frighten these two" frightened the table.
--
-- 3. CONDITIONS LEAVE NO LINE. Applying and lifting them is the busiest thing a
--    session does — a round of combat is a dozen presses — and a ten-entry log
--    that a single turn can fill is a log that has stopped being one.

-- ---------------------------------------------------------------------------
-- The axe.
-- ---------------------------------------------------------------------------
--
-- The head of the table's alone, and `owns_campaign` is the question rather than
-- `may_move_character`: a player must not be able to end their own character
-- from a card, any more than they may undo it — `revive_character` draws exactly
-- the same line in the other direction.
--
-- ONLY SOMEBODY ALREADY DOWN. This is the blow that finishes a character at zero
-- hit points, not a way to delete one from full health; the bar is what a
-- Dungeon Master reaches for there, and `apply_damage` already ends anybody it
-- carries far enough past zero.
create or replace function public.kill_character(
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
  v_current integer;
  v_dead boolean;
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

  select c.current_hp, c.is_dead
    into v_current, v_dead
    from public.characters c
    where c.id = p_char_id
    for update;

  if v_current is null or v_dead or v_current <> 0 then
    return null;
  end if;

  -- Disarmed: the hit points do not move, and the line this leaves is the one
  -- written below rather than an `hp_change` for a bar already at zero.
  perform public.arm_table_log(null, null, null, null, null);

  update public.characters c
    set is_dead = true,
        current_hp = 0,
        death_saves = public.no_death_saves()
    where c.id = p_char_id;

  perform public.write_table_log(
    p_campaign, null, 'character_died', p_char_id, '{}'::jsonb
  );

  return jsonb_build_object(
    'current_hp', 0, 'is_dead', true
  ) || public.no_death_saves();
end;
$fn$;

revoke all on function public.kill_character(uuid, uuid) from public;
revoke all on function public.kill_character(uuid, uuid) from anon;
grant execute on function public.kill_character(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A condition, aimed where the panel aimed it.
-- ---------------------------------------------------------------------------
--
-- 20260914090000's function with a list added, and the list is NARROWED against
-- `campaign_members` rather than trusted: an id arriving from a browser decides
-- who is reached, so it has to be somebody at this table. An empty list is the
-- whole party, which is what the menu means by "All party".
--
-- Dropped first: the ARGUMENT LIST grows, and `create or replace` cannot change
-- one — a plain replace would leave the old three-argument function beside the
-- new one, and PostgREST would go on calling whichever it resolved first.
drop function if exists public.toggle_party_condition(uuid, text, uuid);

create or replace function public.toggle_party_condition(
  p_campaign uuid,
  p_key text,
  p_char_ids uuid[] default null,
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
  where m.campaign_id = p_campaign
    and (
      p_char_ids is null
      or coalesce(array_length(p_char_ids, 1), 0) = 0
      or m.character_id = any (p_char_ids)
    );

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

  return jsonb_build_object(
    'applied', v_applied,
    'characterIds', to_jsonb(v_who)
  );
end;
$fn$;

revoke all on function public.toggle_party_condition(uuid, text, uuid[], uuid) from public;
revoke all on function public.toggle_party_condition(uuid, text, uuid[], uuid) from anon;
grant execute on function public.toggle_party_condition(uuid, text, uuid[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- And the single toggle, no longer writing one down either.
-- ---------------------------------------------------------------------------
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

  return jsonb_build_object(
    'applied', v_applied,
    'conditions', to_jsonb(v_next),
    'characterIds', to_jsonb(array[p_char_id])
  );
end;
$fn$;

-- Nothing calls it any more. Left in place rather than dropped: the two entries
-- it wrote are still in the log until they age out, and `readActivity` still
-- has to be able to read them.
comment on function public.log_condition(uuid, uuid, uuid, text, boolean) is
  'Unused since 20260915090000: conditions leave no line in the log.';
