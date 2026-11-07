-- Run against a populated project; fixtures and table changes all roll back.
begin;

do $test$
declare
  v_campaign uuid;
  v_map uuid;
  v_dm uuid;
  v_player uuid;
  v_character uuid;
  v_template uuid := gen_random_uuid();
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_bag uuid := gen_random_uuid();
  v_chest uuid := gen_random_uuid();
  v_hidden uuid := gen_random_uuid();
  v_item uuid := gen_random_uuid();
  v_slug text := 'custom:table-regression-' || gen_random_uuid()::text;
  v_order uuid[];
  v_changed integer;
begin
  select c.id, m.id, c.user_id, ch.id, ch.user_id
    into v_campaign, v_map, v_dm, v_character, v_player
  from public.campaigns c
  join public.campaign_maps m on m.campaign_id = c.id and not m.is_world_map
  join public.campaign_members party on party.campaign_id = c.id
  join public.characters ch on ch.id = party.character_id
  where ch.user_id <> c.user_id
    and (select count(*) from public.containers k where k.campaign_id = c.id) <= 21
    and (select count(*) from public.character_inventory i where i.character_id = ch.id) < 59
    and (select count(*) from public.character_spells s where s.character_id = ch.id) < 60
  limit 1;
  assert v_campaign is not null, 'Needs a player, a battle map and room for fixtures';

  insert into public.containers(id, campaign_id, name, type, owner_character_id)
    values (v_bag, v_campaign, 'Regression bag', 'bag', v_character);
  insert into public.containers(id, campaign_id, name, type, is_revealed, visible_to_character_ids)
    values (v_chest, v_campaign, 'Regression shared loot', 'chest', true, array[v_character]),
           (v_hidden, v_campaign, 'Regression hidden loot', 'chest', false, '{}');
  insert into public.character_inventory(character_id, item_slug, name, quantity, is_custom)
    values (v_character, v_slug, 'Regression item', 3, true);
  insert into public.container_items(id, container_id, item_slug, name, quantity, is_custom)
    values (v_item, v_chest, v_slug, 'Regression item', 2, true);
  insert into public.character_spells(character_id, spell_slug, name, level)
    values (v_character, v_slug, 'Regression spell', 1);

  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  assert exists (select 1 from public.containers where id = v_chest), 'DM reads shared loot';
  assert exists (select 1 from public.container_items where id = v_item), 'DM reads shared loot contents';
  assert public.move_inventory_item(v_character, v_slug, 2, null, v_bag) = 1,
    'DM moves a partial stack into a player bag';
  assert public.move_inventory_item(v_character, v_slug, 2, v_bag, null) = 0,
    'DM moves the stack back to the pack';
  assert public.take_chest_item(v_chest, v_item, v_character, 1) = 1,
    'DM takes shared loot into the selected player pack';
  assert (select quantity from public.character_inventory
    where character_id = v_character and item_slug = v_slug and container_id is null) = 4,
    'Moving and looting preserve stack quantities';
  delete from public.character_spells where character_id = v_character and spell_slug = v_slug;
  get diagnostics v_changed = row_count;
  assert v_changed = 1, 'DM can forget an exact custom spell key';

  perform set_config('request.jwt.claim.sub', v_player::text, true);
  assert exists (select 1 from public.containers where id = v_chest), 'Player reads revealed loot';
  assert not exists (select 1 from public.containers where id = v_hidden), 'Hidden loot stays private';
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  assert public.move_inventory_item(v_character, v_slug, 1, null, v_bag) is null,
    'Outsiders cannot move inventory';
  assert not exists (select 1 from public.container_items where id = v_item), 'Outsiders cannot read loot';
  execute 'reset role';

  insert into public.campaign_token_templates(id, campaign_id, name, image_url)
    values (v_template, v_campaign, 'Regression initiative', 'https://example.com/regression.webp');
  update public.map_placed_tokens set initiative = null where map_id = v_map;
  insert into public.map_placed_tokens(id, map_id, template_id, world_x, world_y, initiative, placed_at)
    values (v_a, v_map, v_template, 0.2, 0.2, 12, '2000-01-01T00:00:00Z'),
           (v_b, v_map, v_template, 0.4, 0.4, 12, '2000-01-01T00:00:00.000001Z'),
           (v_c, v_map, v_template, 0.6, 0.6, 12, '2000-01-01T00:00:00.000001Z');
  select array_agg(token_id order by seat) into v_order from public.combat_turn_order(v_map);
  update public.campaigns set active_map_id = v_map where id = v_campaign;

  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  execute 'set local role authenticated';
  assert public.start_combat(v_campaign), 'DM starts combat';
  assert public.move_map_token(v_order[2], 0.8, 0.8, null, null), 'A waiting tied token moves';
  assert public.move_map_token(v_order[1], 0.3, 0.3, null, null), 'Active token moves';
  assert (select placed_at from public.map_placed_tokens where id = v_order[1]) = '2000-01-01T00:00:00Z'::timestamptz,
    'Moving preserves placement time';
  assert public.advance_combat_turn(v_campaign);
  assert (select active_turn_token_id from public.campaigns where id = v_campaign) = v_order[2],
    'The next tied token is not skipped';
  assert public.move_map_token(v_order[2], 0.5, 0.5, null, null), 'Second tied token moves';
  assert public.advance_combat_turn(v_campaign);
  assert (select active_turn_token_id from public.campaigns where id = v_campaign) = v_order[3],
    'Every tied token takes its turn';
  assert public.advance_combat_turn(v_campaign);
  assert (select active_turn_token_id = v_order[1] and combat_round = 2
    from public.campaigns where id = v_campaign), 'The round wraps exactly once';
  execute 'reset role';
end;
$test$;

rollback;
select 'Shared loot, DM inventory movement, custom spell removal and tied initiative passed; fixtures rolled back' as result;
