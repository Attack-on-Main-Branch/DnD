-- All catalogue, inventory and storage metadata fixtures roll back.
begin;

do $test$
declare
  v_campaign uuid;
  v_other_campaign uuid;
  v_owner uuid;
  v_player uuid;
  v_character uuid;
  v_item uuid := gen_random_uuid();
  v_other_item uuid := gen_random_uuid();
  v_kept_item uuid := gen_random_uuid();
  v_document uuid := gen_random_uuid();
  v_kept_document uuid := gen_random_uuid();
  v_stored_document uuid := gen_random_uuid();
  v_bag uuid := gen_random_uuid();
  v_chest uuid := gen_random_uuid();
  v_other_bag uuid := gen_random_uuid();
  v_slug text := 'custom:removal-test-' || gen_random_uuid()::text;
  v_count integer;
begin
  select c.id, c.user_id, ch.id, ch.user_id
    into v_campaign, v_owner, v_character, v_player
  from public.campaigns c
  join public.campaign_members m on m.campaign_id = c.id
  join public.characters ch on ch.id = m.character_id
  where ch.user_id <> c.user_id
    and (select count(*) from public.campaign_items x where x.campaign_id = c.id) < 58
    and (select count(*) from public.containers x where x.campaign_id = c.id) < 22
  limit 1;
  assert v_campaign is not null, 'Needs a campaign with a player and room for fixtures';

  select id into v_other_campaign from public.campaigns
  where id <> v_campaign
    and (select count(*) from public.campaign_items x where x.campaign_id = campaigns.id) < 60
    and (select count(*) from public.containers x where x.campaign_id = campaigns.id) < 24
  limit 1;
  if v_other_campaign is null then
    insert into public.campaigns(user_id, title) values (v_owner, 'Item removal test')
    returning id into v_other_campaign;
  end if;

  insert into public.item_documents(id, campaign_id, name, html, is_stored) values
    (v_document, v_campaign, 'removed.html', '<p>Removed</p>', false),
    (v_kept_document, v_campaign, 'kept.html', '<p>Kept</p>', false),
    (v_stored_document, v_campaign, 'pending.html', '', true);
  insert into storage.objects(bucket_id, name, metadata)
    values ('item-documents', v_campaign::text || '/' || v_stored_document::text || '.html', '{"size":100}'::jsonb);

  insert into public.campaign_items(id, campaign_id, item_slug, name, document_id) values
    (v_item, v_campaign, v_slug, 'Removal test', v_document),
    (v_kept_item, v_campaign, v_slug || '-kept', 'Kept test', v_kept_document),
    (v_other_item, v_other_campaign, v_slug, 'Removal test', null);
  insert into public.containers(id, campaign_id, name, type, owner_character_id) values
    (v_bag, v_campaign, 'Removal test bag', 'bag', v_character),
    (v_chest, v_campaign, 'Removal test chest', 'chest', null),
    (v_other_bag, v_other_campaign, 'Other campaign bag', 'bag', v_character);
  insert into public.character_inventory(character_id, container_id, item_slug, name, quantity, is_custom, facts) values
    (v_character, null, v_slug, 'Removal test', 2, true, jsonb_build_object('catalogueId', v_item, 'documentId', v_document)),
    (v_character, v_bag, v_slug, 'Removal test', 1, true, jsonb_build_object('documentId', v_document)),
    (v_character, v_other_bag, v_slug, 'Removal test', 3, true, jsonb_build_object('catalogueId', v_other_item)),
    (v_character, v_bag, 'rope-removal-test', 'Rope', 1, false, '{}'::jsonb);
  insert into public.container_items(container_id, item_slug, name, quantity, is_custom, facts)
    values (v_chest, v_slug, 'Removal test', 1, true, jsonb_build_object('documentId', v_document));

  perform set_config('request.jwt.claim.sub', v_player::text, true);
  execute 'set local role authenticated';
  delete from public.campaign_items where id = v_item;
  get diagnostics v_count = row_count;
  assert v_count = 0, 'Players cannot remove catalogue items';
  assert exists (select 1 from public.character_inventory where character_id = v_character and item_slug = v_slug and container_id is null),
    'A refused removal leaves inventory intact';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  delete from public.campaign_items where id = v_item;
  get diagnostics v_count = row_count;
  assert v_count = 1, 'The DM can remove a catalogue item';
  assert not exists (select 1 from public.character_inventory where character_id = v_character and item_slug = v_slug and (container_id is null or container_id = v_bag)),
    'Removal clears the pack and carried bags, including older copies';
  assert not exists (select 1 from public.container_items where container_id = v_chest and item_slug = v_slug),
    'Removal clears chests';
  assert exists (select 1 from public.character_inventory where character_id = v_character and container_id = v_other_bag and item_slug = v_slug),
    'An identified copy from another campaign is preserved even with the same name';
  assert exists (select 1 from public.character_inventory where character_id = v_character and container_id = v_bag and item_slug = 'rope-removal-test'),
    'SRD items are preserved';
  assert exists (select 1 from public.item_documents where id = v_document and cleanup_pending),
    'The unused attachment is durably queued';
  assert exists (select 1 from public.item_documents where id = v_kept_document and not cleanup_pending),
    'A referenced attachment is retained';

  begin
    perform public.grant_inventory_item(
      target_character := v_character, p_item_slug := v_slug, p_name := 'Removal test',
      p_desc := '', p_category := 'Equipment', p_quantity := 1, p_is_custom := true,
      p_facts := jsonb_build_object('catalogueId', v_item)
    );
    raise exception 'A stale grant resurrected a removed item';
  exception when check_violation then null;
  end;
  begin
    perform public.grant_inventory_item(
      target_character := v_character, p_item_slug := v_slug, p_name := 'Removal test',
      p_desc := '', p_category := 'Equipment', p_quantity := 1, p_is_custom := true,
      p_facts := jsonb_build_object('documentId', v_document)
    );
    raise exception 'A retired file was reattached during cleanup';
  exception when check_violation then null;
  end;

  assert public.may_remove_item_document_upload(v_campaign::text || '/' || v_stored_document::text || '.html'),
    'The unused stored file can be removed through the Storage API';
  assert public.finish_item_document_cleanup(v_campaign, array[v_stored_document]) = 0,
    'The record stays queued until the physical storage object is removed';
  assert public.finish_item_document_cleanup(v_campaign, array[v_document]) = 1,
    'Unused database HTML is deleted';
  assert not exists (select 1 from public.item_documents where id = v_document),
    'No unused HTML record remains after finalization';
  assert public.finish_item_document_cleanup(v_campaign, array[v_kept_document]) = 0,
    'Cleanup cannot delete a live attachment';
end;
$test$;

rollback;
