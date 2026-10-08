-- Run as postgres against a populated project; every changed row rolls back.
begin;

do $test$
declare
  v_campaign uuid;
  v_character uuid;
  v_owner uuid;
  v_dm uuid;
  v_viewer uuid;
  v_token uuid;
  v_template uuid;
  v_map uuid;
  v_max integer;
  v_hp integer;
  v_state record;
begin
  assert public.health_tier(51, 100) = 'healthy';
  assert public.health_tier(50, 100) = 'wounded';
  assert public.health_tier(25, 100) = 'wounded';
  assert public.health_tier(24, 100) = 'critical';
  assert public.health_tier(0, 100) = 'critical';
  assert public.health_tier(25, 102) = 'critical';
  assert public.health_tier(26, 102) = 'wounded';

  select m.campaign_id, c.id, c.user_id, g.user_id, c.max_hp
  into v_campaign, v_character, v_owner, v_dm, v_max
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  join public.campaigns g on g.id = m.campaign_id
  where c.user_id <> g.user_id and exists (
    select 1 from public.campaign_members other
    join public.characters player on player.id = other.character_id
    where other.campaign_id = m.campaign_id and player.user_id <> c.user_id
  )
  order by exists (select 1 from public.map_token_health h
    where h.campaign_id = m.campaign_id) desc
  limit 1;
  assert v_character is not null, 'Needs a party with two character owners';

  select c.user_id into v_viewer from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = v_campaign and c.user_id not in (v_owner, v_dm)
  limit 1;
  assert v_viewer is not null, 'Needs a second player for the privacy check';

  perform public.arm_table_log(null, null, null, null, null);
  for v_hp in select unnest(array[v_max, v_max / 2, 0]) loop
    update public.characters set current_hp = v_hp, is_dead = false
    where id = v_character;
    perform set_config('request.jwt.claim.sub', v_viewer::text, true);
    execute 'set local role authenticated';
    select * into v_state from public.campaign_party(v_campaign)
    where id = v_character;
    assert v_state.health_tier = public.health_tier(v_hp, v_max), 'Other players see the tier';
    assert v_state.is_dying = (v_hp = 0), 'Knockout remains public';
    assert v_state.current_hp is null and v_state.max_hp is null
      and v_state.temp_hp is null and v_state.temp_hp_max is null,
      'Other players cannot read exact HP';
    execute 'reset role';
  end loop;

  foreach v_viewer in array array[v_owner, v_dm] loop
    perform set_config('request.jwt.claim.sub', v_viewer::text, true);
    execute 'set local role authenticated';
    select * into v_state from public.campaign_party(v_campaign) where id = v_character;
    assert v_state.current_hp = 0 and v_state.max_hp = v_max, 'Owner and DM keep exact HP';
    execute 'reset role';
  end loop;

  select h.token_id into v_token from public.map_token_health h
  where h.campaign_id = v_campaign limit 1;
  if v_token is null then
    select id into v_map from public.campaign_maps
    where campaign_id = v_campaign and not is_scene and not is_world_map limit 1;
    assert v_map is not null, 'Needs a battle map for the rollback-only token fixture';
    insert into public.campaign_token_templates(campaign_id, name, image_url)
    values (v_campaign, 'Health check', 'https://example.invalid/health-test.webp')
    returning id into v_template;
    insert into public.map_placed_tokens(map_id, template_id, world_x, world_y)
    values (v_map, v_template, 0.5, 0.5) returning id into v_token;
    insert into public.map_token_health(token_id, campaign_id, max_hp, current_hp)
    values (v_token, v_campaign, 100, 100);
  end if;
  assert v_token is not null, 'Needs an HP-backed token at the table';
  update public.map_token_health set max_hp = 100, current_hp = 25 where token_id = v_token;
  update public.map_placed_tokens set is_hidden = false where id = v_token;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';
  select * into v_state from public.campaign_token_health_states(v_campaign) where token_id = v_token;
  assert v_state.health_tier = 'wounded', 'Players see NPC health tiers';
  assert not v_state.is_dying, 'Low HP alone is not a knockout';
  assert not exists (select 1 from public.map_token_health where token_id = v_token),
    'NPC HP remains DM-only';
  assert to_jsonb(v_state) - 'token_id' - 'health_tier' - 'is_dying' = '{}'::jsonb,
    'Public token rows contain only ID, tier and knockout status';
  execute 'reset role';
  update public.map_token_health set current_hp = 0 where token_id = v_token;
  execute 'set local role authenticated';
  select * into v_state from public.campaign_token_health_states(v_campaign) where token_id = v_token;
  assert v_state.is_dying and v_state.health_tier = 'critical', 'Zero HP shares knockout status';
  execute 'reset role';
  update public.map_token_health set current_hp = 1 where token_id = v_token;
  execute 'set local role authenticated';
  select * into v_state from public.campaign_token_health_states(v_campaign) where token_id = v_token;
  assert not v_state.is_dying and v_state.health_tier = 'critical', 'Healing clears knockout without changing the tier';
  execute 'reset role';
  update public.map_placed_tokens set is_hidden = true where id = v_token;
  execute 'set local role authenticated';
  assert not exists (select 1 from public.campaign_token_health_states(v_campaign) where token_id = v_token),
    'Hidden tokens do not leak through health states';
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  assert exists (select 1 from public.campaign_token_health_states(v_campaign) where token_id = v_token),
    'DM can read hidden token states';
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  assert not exists (select 1 from public.campaign_party(v_campaign)), 'Outsiders cannot read the party';
  assert not exists (select 1 from public.campaign_token_health_states(v_campaign)), 'Outsiders cannot read token states';
  execute 'reset role';
  assert not has_function_privilege('anon', 'public.campaign_party(uuid)', 'execute');
  assert not has_function_privilege('anon', 'public.campaign_token_health_states(uuid)', 'execute');
end;
$test$;

rollback;
select 'shared health states: boundaries, roles, hidden tokens and HP privacy passed; fixtures rolled back' as result;
