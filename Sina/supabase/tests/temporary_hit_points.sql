-- Run as postgres against a populated project; all fixtures and log entries roll back.
begin;

do $test$
declare
  v_id uuid;
  v_campaign uuid;
  v_owner uuid;
  v_dm uuid;
  v_other uuid;
  v_max integer;
  v_answer jsonb;
  v_party_temp integer;
begin
  select c.id, m.campaign_id, c.user_id, g.user_id, c.max_hp
  into v_id, v_campaign, v_owner, v_dm, v_max
  from public.characters c
  join public.campaign_members m on m.character_id = c.id
  join public.campaigns g on g.id = m.campaign_id
  where c.max_hp between 10 and 180 and c.user_id <> g.user_id
  limit 1;
  assert v_id is not null, 'Needs a player character at a DM-owned table';

  select m.character_id into v_other from public.campaign_members m
  where m.campaign_id = v_campaign and m.character_id <> v_id limit 1;
  assert v_other is not null, 'Needs another seat for the permission check';

  perform public.arm_table_log(null, null, null, null, null);
  update public.characters set current_hp = v_max, temp_hp = 0, temp_hp_max = 0,
    is_dead = false, death_saves = public.no_death_saves() where id = v_id;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';

  v_answer := public.grant_temporary_hit_points(v_id, 20, v_campaign, v_id);
  assert (v_answer ->> 'temp_hp')::integer = 20, 'Own seat can grant temp HP';
  assert (v_answer ->> 'current_hp')::integer = v_max, 'Grant leaves normal HP alone';
  assert public.grant_temporary_hit_points(v_other, 20, v_campaign, v_id) is null,
    'A player cannot grant to another seat';
  assert public.grant_temporary_hit_points(v_id, 20, v_campaign, null) is null,
    'A player cannot impersonate the DM';
  assert public.grant_temporary_hit_points(v_id, 206, v_campaign, v_id) is null,
    'Reject out-of-range grants';
  assert public.grant_temporary_hit_points(v_id, 0, v_campaign, v_id) is null,
    'Reject empty grants';
  assert public.grant_temporary_hit_points(v_id, null, v_campaign, v_id) is null,
    'Reject null grants';

  v_answer := public.grant_temporary_hit_points(v_id, 8, v_campaign, v_id);
  assert (v_answer ->> 'temp_hp')::integer = 20, 'Lower grants do not replace or stack';
  v_answer := public.grant_temporary_hit_points(v_id, 25, v_campaign, v_id);
  assert (v_answer ->> 'temp_hp')::integer = 25, 'Higher grants replace instead of adding';
  assert (v_answer ->> 'temp_hp_max')::integer = 25, 'Track remembers grant size';

  select p.temp_hp into v_party_temp from public.campaign_party(v_campaign) p where p.id = v_id;
  assert v_party_temp = 25, 'Party reads include temp HP';
  assert exists (select 1 from public.campaign_activity_logs where campaign_id = v_campaign
    and action_type = 'temp_hp_change' and (payload ->> 'delta')::integer = 20),
    'A grant writes an activity entry';

  v_answer := public.apply_damage(v_id, 10, v_campaign, v_id);
  assert (v_answer ->> 'current_hp')::integer = v_max, 'Temp absorbs first';
  assert (v_answer ->> 'temp_hp')::integer = 15, 'Absorption reduces temp';
  v_answer := public.apply_heal(v_id, 205, v_campaign, v_id);
  assert (v_answer ->> 'current_hp')::integer = v_max, 'Healing caps at normal maximum';
  assert (v_answer ->> 'temp_hp')::integer = 15, 'Healing never refills temp';

  v_answer := public.apply_damage(v_id, 20, v_campaign, v_id);
  assert (v_answer ->> 'current_hp')::integer = v_max - 5, 'Overflow damages normal HP';
  assert (v_answer ->> 'temp_hp')::integer = 0, 'Temp is fully consumed';
  v_answer := public.apply_heal(v_id, 205, v_campaign, v_id);
  assert (v_answer ->> 'current_hp')::integer = v_max, 'Normal HP heals after temp is gone';
  assert (v_answer ->> 'temp_hp')::integer = 0, 'Consumed temp cannot regenerate';

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  v_answer := public.grant_temporary_hit_points(v_id, 10, v_campaign, null);
  assert (v_answer ->> 'temp_hp')::integer = 10, 'DM can grant to a party member';

  execute 'reset role';
  perform public.arm_table_log(null, null, null, null, null);
  update public.characters set current_hp = 1 where id = v_id;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';
  v_answer := public.apply_damage(v_id, v_max + 10, v_campaign, v_id);
  assert not (v_answer ->> 'instant_death')::boolean, 'Temp prevents massive damage below threshold';
  assert (v_answer ->> 'current_hp')::integer = 0, 'Nonlethal overflow reaches zero';
  v_answer := public.grant_temporary_hit_points(v_id, 10, v_campaign, v_id);
  assert (v_answer ->> 'current_hp')::integer = 0, 'Temp HP does not revive';

  execute 'reset role';
  perform public.arm_table_log(null, null, null, null, null);
  update public.characters set current_hp = 1 where id = v_id;
  execute 'set local role authenticated';
  v_answer := public.apply_damage(v_id, v_max + 11, v_campaign, v_id);
  assert (v_answer ->> 'instant_death')::boolean, 'Massive damage uses overflow after temp';
  v_answer := public.apply_heal(v_id, 205, v_campaign, v_id);
  assert (v_answer ->> 'is_dead')::boolean, 'Healing does not revive the dead';
  assert (v_answer ->> 'current_hp')::integer = 0, 'Dead characters remain at zero';

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  assert public.grant_temporary_hit_points(v_id, 20, v_campaign, v_id) is null,
    'No grant without an authenticated owner';
  assert not has_function_privilege('anon',
    'public.grant_temporary_hit_points(uuid,integer,uuid,uuid)', 'execute'),
    'Anonymous requests cannot execute grants';
  assert not has_function_privilege('authenticated',
    'public.character_health_state(public.characters,boolean)', 'execute'),
    'The internal serializer is not a public RPC';
end;
$test$;

rollback;
select 'temporary HP SQL checks passed; fixtures rolled back' as result;
