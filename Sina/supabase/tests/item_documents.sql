-- Run as postgres against a populated project; all fixtures roll back.
begin;

do $test$
declare
  v_campaign uuid;
  v_owner uuid;
  v_player uuid;
  v_character uuid;
  v_item public.campaign_items;
  v_document uuid;
  v_count integer;
  v_slug text := 'custom:document-test-' || gen_random_uuid()::text;
begin
  select c.id, c.user_id, ch.id, ch.user_id
    into v_campaign, v_owner, v_character, v_player
  from public.campaigns c
  join public.campaign_members m on m.campaign_id = c.id
  join public.characters ch on ch.id = m.character_id
  where ch.user_id <> c.user_id limit 1;
  assert v_campaign is not null, 'Needs a campaign with a player from another account';

  assert not has_function_privilege('anon',
    'public.save_campaign_item_document(uuid,uuid,jsonb,text,text,boolean,text)', 'execute');
  assert not has_table_privilege('authenticated', 'public.item_documents', 'insert');

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';

  select * into v_item from public.save_campaign_item_document(
    v_campaign, null,
    jsonb_build_object('slug', v_slug, 'name', 'Document test', 'category', 'Equipment'),
    'letter.html', '<p>Meet at midnight.</p>'
  );
  v_document := v_item.document_id;
  assert v_document is not null, 'The owner can attach HTML';
  assert public.may_read_item_document(v_document), 'The owner can read the attachment';

  perform set_config('request.jwt.claim.sub', v_player::text, true);
  select count(*) into v_count from public.item_documents where id = v_document;
  assert v_count = 0, 'Membership alone does not reveal a DM attachment';
  select count(*) into v_count from public.save_campaign_item_document(
    v_campaign, v_item.id,
    jsonb_build_object('slug', v_slug, 'name', 'Forged', 'category', 'Equipment'),
    'forged.html', '<p>Forged</p>'
  );
  assert v_count = 0, 'A player cannot replace an attachment';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform public.grant_inventory_item(
    target_character := v_character, p_item_slug := v_slug, p_name := v_item.name,
    p_desc := '', p_category := 'Equipment', p_quantity := 1, p_is_custom := true,
    p_facts := jsonb_build_object('documentId', v_document)
  );

  perform set_config('request.jwt.claim.sub', v_player::text, true);
  select count(*) into v_count from public.item_documents where id = v_document;
  assert v_count = 1, 'A holder can read the attachment';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select * into v_item from public.save_campaign_item_document(
    v_campaign, v_item.id,
    jsonb_build_object('slug', v_slug, 'name', 'Document test', 'category', 'Equipment'),
    null, null, true
  );
  assert v_item.document_id is null, 'The owner can remove the file';
  perform public.rewrite_campaign_item_copies(
    v_campaign, v_slug, v_slug, 'Document test', 'Equipment', '', '{}'::jsonb
  );
  perform set_config('request.jwt.claim.sub', v_player::text, true);
  assert not public.may_read_item_document(v_document), 'Removing the file revokes holder access';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select * into v_item from public.save_campaign_item_document(
    v_campaign, v_item.id,
    jsonb_build_object('slug', v_slug, 'name', 'Document test', 'category', 'Equipment'),
    'letter.html', repeat('é', 13107200)
  );
  assert v_item.document_id is not null, 'Exactly 25 MB of UTF-8 HTML is accepted';

  begin
    perform public.save_campaign_item_document(
      v_campaign, v_item.id,
      jsonb_build_object('slug', v_slug, 'name', 'Document test', 'category', 'Equipment'),
      'letter.html', repeat('é', 13107201)
    );
    raise exception 'Oversized HTML accepted';
  exception when check_violation then null;
  end;

  begin
    perform public.save_campaign_item_document(
      v_campaign, v_item.id,
      jsonb_build_object('slug', v_slug, 'name', 'Document test', 'category', 'Equipment'),
      'letter.txt', 'Text'
    );
    raise exception 'Non-HTML attachment accepted';
  exception when check_violation then null;
  end;
end;
$test$;

rollback;
