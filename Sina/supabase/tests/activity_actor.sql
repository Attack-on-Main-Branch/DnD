begin;

do $test$
declare
  v_character uuid;
  v_campaign uuid;
  v_name text;
  v_body jsonb := '{"delta":-1,"check":"activity_actor"}';
begin
  select c.id, m.campaign_id, c.name
  into v_character, v_campaign, v_name
  from public.characters c
  join public.campaign_members m on m.character_id = c.id
  limit 1;
  assert v_character is not null, 'Needs a character in a campaign';

  perform public.write_table_log(
    v_campaign, v_character, 'hp_change', null, v_body
  );
  assert exists (
    select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and payload = v_body
      and actor_character = v_character and actor_name = v_name
      and actor_type = 'player'
  ), 'Automatic activity retains the actor ID used to find their portrait';

  perform public.write_table_log(
    v_campaign, null, 'hp_change', v_character, v_body
  );
  assert exists (
    select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign
      and payload = v_body || jsonb_build_object('targetName', v_name)
      and actor_character is null and actor_type = 'dm'
      and actor_name = 'Dungeon Master'
  ), 'DM activity retains its badge and names the affected character';

  assert not has_function_privilege('anon',
    'public.write_table_log(uuid,uuid,text,uuid,jsonb)', 'execute'),
    'Anonymous clients cannot insert activity directly';
  assert not has_function_privilege('authenticated',
    'public.write_table_log(uuid,uuid,text,uuid,jsonb)', 'execute'),
    'Signed-in clients cannot insert activity directly';
end;
$test$;

rollback;
select 'Activity actor checks passed; log entries rolled back' as result;
