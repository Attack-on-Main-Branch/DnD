-- All character changes and log entries roll back.
begin;

do $test$
declare
  v_id uuid;
  v_other uuid;
  v_campaign uuid;
  v_owner uuid;
  v_dm uuid;
  v_log jsonb;
  v_count integer;
begin
  select c.id, m.campaign_id, c.user_id, g.user_id
  into v_id, v_campaign, v_owner, v_dm
  from public.characters c
  join public.campaign_members m on m.character_id = c.id
  join public.campaigns g on g.id = m.campaign_id
  where c.user_id <> g.user_id
  limit 1;
  assert v_id is not null, 'Needs a player character at a DM-owned table';

  select c.id into v_other from public.characters c
  join public.campaign_members m on m.character_id = c.id
  where m.campaign_id = v_campaign and c.user_id <> v_owner limit 1;
  assert v_other is not null, 'Needs a character the player does not own';

  assert not exists (select 1 from pg_trigger where tgname = 'characters_log_max_hp'),
    'Maximum-HP logging trigger is removed';
  assert not has_function_privilege('authenticated', 'public.log_armor_class_change()', 'execute'),
    'Clients cannot call the trigger directly';

  perform public.arm_table_log(null, null, null, null, null);
  update public.characters set armor_class = 10 where id = v_id;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';
  assert public.update_armor_class(v_id, 13, v_campaign, v_id) = 13,
    'Player may edit their own shield';
  select payload into v_log from public.campaign_activity_logs
  where campaign_id = v_campaign and action_type = 'armor_class_change'
  order by created_at desc, id desc limit 1;
  assert v_log = '{"delta":3}'::jsonb, 'Increase logs only +3, without the total';

  assert public.update_armor_class(v_id, 11, v_campaign, v_id) = 11,
    'Player may lower their own shield';
  assert exists (select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'armor_class_change'
      and payload = '{"delta":-2}'::jsonb), 'Decrease logs only -2';

  select count(*) into v_count from public.campaign_activity_logs
  where campaign_id = v_campaign and action_type = 'armor_class_change';
  assert public.update_armor_class(v_id, 11, v_campaign, v_id) = 11,
    'Unchanged values remain valid';
  assert public.update_armor_class(v_id, 14, v_campaign, null) is null,
    'Player cannot impersonate the DM';
  assert public.update_armor_class(v_other, 14, v_campaign, v_id) is null,
    'Player cannot edit somebody else';
  assert public.update_armor_class(v_id, 100, v_campaign, v_id) is null,
    'Out-of-range values are refused';
  assert (select count(*) from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'armor_class_change') = v_count,
    'No-op and rejected edits leave no activity';

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  assert public.update_armor_class(v_id, 14, v_campaign, null) = 14,
    'DM may edit a party shield';
  assert exists (select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'armor_class_change'
      and actor_type = 'dm' and payload ->> 'targetName' is not null
      and (payload ->> 'delta')::integer = 3
      and not payload ? 'armorClass'), 'DM edits identify the target without a total';

  execute 'reset role';
  perform public.arm_table_log(null, null, null, null, null);
  select count(*) into v_count from public.campaign_activity_logs
  where campaign_id = v_campaign and action_type = 'armor_class_change';
  update public.characters set armor_class = 15 where id = v_id;
  assert (select count(*) from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'armor_class_change') = v_count,
    'Changes away from the table leave no activity';
end;
$test$;

rollback;
