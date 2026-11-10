-- Run as postgres against a populated project; every test change rolls back.
begin;

do $test$
declare
  v_campaign uuid;
  v_character uuid;
  v_owner uuid;
  v_dm uuid;
  v_reward jsonb;
  v_remaining integer;
  v_count integer;
  v_seen text[] := '{}';
  v_key text;
begin
  select m.campaign_id, m.character_id, c.user_id, g.user_id
  into v_campaign, v_character, v_owner, v_dm
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  join public.campaigns g on g.id = m.campaign_id
  where c.user_id <> g.user_id limit 1;
  assert v_character is not null, 'Needs a party member owned by a player';

  assert not has_function_privilege('anon', 'public.set_banner_skin(uuid,text,text)', 'execute');
  assert not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'campaigns' and column_name = 'banner_skin');

  assert not has_function_privilege('anon', 'public.open_pouch(uuid,uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'public.open_dice_pouch(uuid,uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'public.skin_pouch_pool(uuid)', 'execute');
  assert not has_table_privilege('authenticated', 'public.character_banner_skins', 'insert');
  assert (select relrowsecurity from pg_class where oid = 'public.character_banner_skins'::regclass);

  update public.characters set banner_skin = 'classic' where id = v_character;
  delete from public.character_banner_skins where character_id = v_character;
  delete from public.character_dice_skins where character_id = v_character;
  select count(*) into v_remaining from public.skin_pouch_pool(v_character);
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'dragon-lore');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'printstream' and rarity = 'iconic');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'wings-of-freedom' and rarity = 'iconic');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'spider-lilies' and rarity = 'legendary');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'sakura' and rarity = 'legendary');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'lightning' and rarity = 'legendary');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'splash' and rarity = 'common');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'vignette' and rarity = 'common');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'cyberpunk' and rarity = 'uncommon');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'topography' and rarity = 'epic');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'hexagon' and rarity = 'epic');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'shattered-glass' and rarity = 'rare');
  assert exists (select 1 from public.skin_pouch_pool(v_character) where kind = 'banner' and skin = 'pixel-night' and rarity = 'rare');

  perform set_config('request.jwt.claim.sub', v_dm::text, true);
  delete from public.character_inventory where character_id = v_character and item_slug = 'dice-pouch';
  insert into public.character_inventory (character_id, item_slug, name, category, quantity)
  values (v_character, 'dice-pouch', 'Pouch', 'Skins', v_remaining + 1);

  execute 'set local role authenticated';
  assert not public.set_banner_skin(v_campaign, 'campaign', 'dragon-lore');
  assert public.open_pouch(v_campaign, v_character) is null, 'DM cannot open a player pouch';
  assert not public.set_banner_skin(v_character, 'character', 'dragon-lore');

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  assert not public.set_banner_skin(v_campaign, 'campaign', 'classic');
  begin
    perform public.set_banner_skin(v_character, 'character', 'dragon-lore');
    raise exception 'Locked banner accepted';
  exception when raise_exception then
    if sqlerrm <> 'banner_skin_locked' then raise; end if;
  end;
  begin
    update public.character_inventory set quantity = quantity + 1
    where character_id = v_character and item_slug = 'dice-pouch';
    raise exception 'Player minted a pouch';
  exception when raise_exception then
    if sqlerrm <> 'dice_pouch_dm_only' then raise; end if;
  end;

  for v_count in 1..v_remaining loop
    v_reward := public.open_pouch(v_campaign, v_character);
    v_key := (v_reward->>'kind') || ':' || (v_reward->>'skin');
    assert v_key is not null and not v_key = any(v_seen), 'Every pouch awards a unique typed skin';
    v_seen := array_append(v_seen, v_key);
    assert (select quantity = v_remaining + 1 - v_count from public.character_inventory
      where character_id = v_character and item_slug = 'dice-pouch'), 'Exactly one pouch consumed';
  end loop;
  assert 'banner:dragon-lore' = any(v_seen), 'The shared pool includes the banner';
  assert 'banner:printstream' = any(v_seen), 'The shared pool includes Printstream';
  assert 'banner:wings-of-freedom' = any(v_seen), 'The shared pool includes Wings of Freedom';
  assert public.set_banner_skin(v_character, 'character', 'wings-of-freedom');
  assert (select banner_skin = 'wings-of-freedom' from public.campaign_party(v_campaign) where id = v_character);
  assert 'banner:spider-lilies' = any(v_seen), 'The shared pool includes Spider Lilies';
  assert 'banner:sakura' = any(v_seen), 'The shared pool includes Sakura';
  assert 'banner:lightning' = any(v_seen), 'The shared pool includes Lightning';
  assert 'banner:splash' = any(v_seen), 'The shared pool includes Splash';
  assert 'banner:vignette' = any(v_seen), 'The shared pool includes Vignette';
  assert 'banner:cyberpunk' = any(v_seen), 'The shared pool includes Cyberpunk';
  assert public.set_banner_skin(v_character, 'character', 'cyberpunk');
  assert (select banner_skin = 'cyberpunk' from public.campaign_party(v_campaign) where id = v_character);
  assert public.set_banner_skin(v_character, 'character', 'vignette');
  assert (select banner_skin = 'vignette' from public.campaign_party(v_campaign) where id = v_character);
  assert 'banner:topography' = any(v_seen), 'The shared pool includes Topography';
  assert 'banner:hexagon' = any(v_seen), 'The shared pool includes Hexagon';
  assert public.set_banner_skin(v_character, 'character', 'hexagon');
  assert (select banner_skin = 'hexagon' from public.campaign_party(v_campaign) where id = v_character);
  assert 'banner:shattered-glass' = any(v_seen), 'The shared pool includes Shattered Glass';
  assert 'banner:pixel-night' = any(v_seen), 'The shared pool includes Pixel Night';
  assert public.set_banner_skin(v_character, 'character', 'pixel-night');
  assert (select banner_skin = 'pixel-night' from public.campaign_party(v_campaign) where id = v_character);
  assert public.set_banner_skin(v_character, 'character', 'shattered-glass');
  assert (select banner_skin = 'shattered-glass' from public.campaign_party(v_campaign) where id = v_character);
  assert exists (select 1 from public.character_banner_skins where character_id = v_character and skin = 'dragon-lore');
  assert public.set_banner_skin(v_character, 'character', 'dragon-lore');
  assert (select banner_skin = 'dragon-lore' from public.campaign_party(v_campaign) where id = v_character);
  begin
    perform public.open_pouch(v_campaign, v_character);
    raise exception 'Completed collection consumed a pouch';
  exception when raise_exception then
    if sqlerrm <> 'dice_pouch_empty' then raise; end if;
  end;
  assert (select quantity = 1 from public.character_inventory
    where character_id = v_character and item_slug = 'dice-pouch');
  assert public.announce_skins(v_campaign, v_character) = v_remaining;
  assert public.announce_skins(v_campaign, v_character) = 0, 'Announcements are idempotent';

  execute 'reset role';
  assert not exists (select 1 from public.character_banner_skins
    where character_id = v_character and not announced);
  delete from public.campaign_activity_logs where campaign_id = v_campaign;

  -- Printstream remains discoverable when every other skin is already owned.
  update public.characters set banner_skin = 'classic' where id = v_character;
  delete from public.character_banner_skins where character_id = v_character and skin = 'printstream';
  execute 'set local role authenticated';
  assert public.open_pouch(v_campaign, v_character) = '{"kind":"banner","skin":"printstream"}'::jsonb;
  assert public.set_banner_skin(v_character, 'character', 'printstream');
  assert (select banner_skin = 'printstream' from public.campaign_party(v_campaign) where id = v_character);
  assert not exists (select 1 from public.character_inventory
    where character_id = v_character and item_slug = 'dice-pouch'), 'The last pouch removes the stack';
  assert public.open_pouch(v_campaign, v_character) is null;
  assert public.announce_skins(v_campaign, v_character) = 1;
  assert exists (select 1 from public.campaign_activity_logs
    where campaign_id = v_campaign and actor_character = v_character
      and payload @> '{"kind":"banner","skin":"printstream","rarity":"iconic"}'::jsonb);

  perform set_config('request.jwt.claim.sub', '', true);
  assert not public.set_banner_skin(v_character, 'character', 'classic');
  assert public.open_pouch(v_campaign, v_character) is null;
  assert public.announce_skins(v_campaign, v_character) = 0;
end;
$test$;

rollback;
