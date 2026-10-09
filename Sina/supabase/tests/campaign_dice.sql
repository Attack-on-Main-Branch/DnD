-- Run as postgres against a populated project; changed preferences roll back.
begin;

do $test$
declare
  v_campaign uuid;
  v_owner uuid;
  v_other uuid;
  v_skin text;
  v_dice record;
begin
  select id, user_id into v_campaign, v_owner
  from public.campaigns limit 1;
  assert v_campaign is not null, 'Needs a campaign';

  select id into v_other from auth.users where id <> v_owner limit 1;
  assert v_other is not null, 'Needs another account';

  assert not has_function_privilege('anon',
    'public.set_campaign_dice(uuid,text,text)', 'execute');

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';

  for v_skin in select unnest(array['classic', 'gold-rimmed', 'asiimov']) loop
    assert public.set_campaign_dice(v_campaign, '#00ff88', v_skin),
      'The owner can choose styles without character unlocks';
    select dice_color, dice_skin into v_dice
    from public.campaign_table(v_campaign);
    assert v_dice.dice_color = '#00ff88' and v_dice.dice_skin = v_skin,
      'The table reads the saved campaign dice';
  end loop;

  begin
    perform public.set_campaign_dice(v_campaign, 'invalid', 'classic');
    raise exception 'Invalid colour accepted';
  exception when check_violation then null;
  end;

  begin
    perform public.set_campaign_dice(v_campaign, null, 'classic');
    raise exception 'Null colour accepted';
  exception when check_violation then null;
  end;

  begin
    perform public.set_campaign_dice(v_campaign, '#00ff88', 'unknown');
    raise exception 'Unknown style accepted';
  exception when foreign_key_violation then null;
  end;

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  assert not public.set_campaign_dice(v_campaign, '#ff0000', 'classic'),
    'Another account cannot change the campaign dice';

  perform set_config('request.jwt.claim.sub', '', true);
  assert not public.set_campaign_dice(v_campaign, '#ff0000', 'classic'),
    'A missing identity cannot change campaign dice';
end;
$test$;

rollback;
