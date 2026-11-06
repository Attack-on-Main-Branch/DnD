begin;

do $test$
declare
  v_character uuid;
  v_other uuid;
  v_campaign uuid;
  v_owner uuid;
  v_dm uuid;
  v_count integer;
begin
  select c.id, m.campaign_id, c.user_id, g.user_id
  into v_character, v_campaign, v_owner, v_dm
  from public.characters c
  join public.campaign_members m on m.character_id = c.id
  join public.campaigns g on g.id = m.campaign_id
  where c.user_id <> g.user_id limit 1;
  assert v_character is not null, 'Needs a player at a DM-owned table';

  select c.id into v_other from public.characters c
  join public.campaign_members m on m.character_id = c.id
  where m.campaign_id = v_campaign and c.user_id <> v_owner limit 1;
  assert v_other is not null, 'Needs a character the player does not own';

  update public.characters set inspiration = 0 where id = v_character;

  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  assert public.set_player_dice_paused(v_campaign, true), 'DM can pause dice';
  assert not public.set_player_dice_paused(v_campaign, null),
    'An absent pause choice is refused';
  assert (select player_dice_paused from public.campaign_table(v_campaign)),
    'The table persists its pause';
  assert public.move_character_inspiration(v_character, 1, v_campaign) = 1,
    'DM grants one inspiration';
  assert exists (select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'inspiration_change'
      and actor_type = 'dm' and payload ->> 'targetName' is not null
      and payload ->> 'delta' = '1' and not payload ? 'inspiration'),
    'Grant logs its recipient and change without exposing a total';

  assert public.move_character_inspiration(v_character, 3, v_campaign) = 3,
    'A grant stops at three';
  assert exists (select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'inspiration_change'
      and payload ->> 'delta' = '2'), 'Only the actual increase is logged';
  select count(*) into v_count from public.campaign_activity_logs
  where campaign_id = v_campaign and action_type = 'inspiration_change';
  assert public.move_character_inspiration(v_character, 1, v_campaign) = 3,
    'Full inspiration stays full';
  assert (select count(*) from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'inspiration_change') = v_count,
    'A no-op grant leaves no log entry';

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';
  assert (select player_dice_paused from public.campaign_table(v_campaign)),
    'Players read the pause';
  assert not public.set_player_dice_paused(v_campaign, false),
    'Players cannot resume dice';
  assert public.move_character_inspiration(v_character, -1, v_campaign) = 2,
    'Player spends their own inspiration';
  assert exists (select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'inspiration_change'
      and actor_type = 'player' and payload = '{"delta":-1}'::jsonb),
    'Use logs once without repeating the actor as a target';
  assert public.move_character_inspiration(v_character, 1, v_campaign) is null,
    'Players cannot grant inspiration';
  assert public.move_character_inspiration(v_other, -1, v_campaign) is null,
    'Players cannot spend somebody else''s inspiration';
  assert public.move_character_inspiration(v_character, -2147483648, v_campaign) is null,
    'An extreme invalid delta is refused without overflow';
  assert public.move_character_inspiration(v_character, 0, v_campaign) is null,
    'An empty change is refused';
  assert public.move_character_inspiration(v_character, 4, v_campaign) is null,
    'An excessive grant is refused';
  assert public.move_character_inspiration(v_character, -3, v_campaign) = 0,
    'Use stops at zero';
  select count(*) into v_count from public.campaign_activity_logs
  where campaign_id = v_campaign and action_type = 'inspiration_change';
  assert public.move_character_inspiration(v_character, -1, v_campaign) = 0,
    'Empty inspiration stays empty';
  assert (select count(*) from public.campaign_activity_logs
    where campaign_id = v_campaign and action_type = 'inspiration_change') = v_count,
    'A no-op use leaves no entry';

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  assert not exists (select 1 from public.campaign_table(v_campaign)),
    'Outsiders cannot read table settings';
  assert not public.set_player_dice_paused(v_campaign, false),
    'Outsiders cannot resume dice';
  assert public.move_character_inspiration(v_character, -1, v_campaign) is null,
    'Outsiders cannot use inspiration';
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  assert not public.set_player_dice_paused(v_campaign, false),
    'Signed-out callers cannot change the pause';
  assert public.move_character_inspiration(v_character, 1, v_campaign) is null,
    'Signed-out callers cannot change inspiration';
  assert not has_function_privilege('anon', 'public.set_player_dice_paused(uuid,boolean)', 'execute'),
    'The pause function is not public';
  assert not has_function_privilege('authenticated', 'public.write_table_log(uuid,uuid,text,uuid,jsonb)', 'execute'),
    'Players cannot fabricate inspiration activity';

  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  assert public.set_player_dice_paused(v_campaign, false), 'DM can resume dice';
  assert not (select player_dice_paused from public.campaign_table(v_campaign)),
    'Resumed dice stay resumed';
  execute 'reset role';
end;
$test$;

rollback;
