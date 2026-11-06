-- Storage metadata fixtures and all item changes roll back.
begin;

do $test$
declare
  v_campaign uuid;
  v_owner uuid;
  v_player uuid;
  v_character uuid;
  v_document uuid := gen_random_uuid();
  v_large uuid := gen_random_uuid();
  v_duplicate uuid := gen_random_uuid();
  v_path text;
  v_item public.campaign_items;
  v_count integer;
  v_slug text := 'custom:document-upload-test-' || gen_random_uuid()::text;
begin
  select c.id, c.user_id, ch.id, ch.user_id
    into v_campaign, v_owner, v_character, v_player
  from public.campaigns c
  join public.campaign_members m on m.campaign_id = c.id
  join public.characters ch on ch.id = m.character_id
  where ch.user_id <> c.user_id limit 1;
  assert v_campaign is not null, 'Needs a campaign with a player from another account';
  v_path := v_campaign::text || '/' || v_document::text || '.html';

  assert exists (
    select 1 from storage.buckets
    where id = 'item-documents' and not public and file_size_limit = 26214400
      and allowed_mime_types = array['application/octet-stream']
  ), 'The document bucket is private and accepts up to 25 MB';

  insert into storage.objects(bucket_id, name, metadata) values
    ('item-documents', v_path, '{"size":26214400}'::jsonb),
    ('item-documents', v_campaign::text || '/' || v_large::text || '.html', '{"size":26214401}'::jsonb),
    ('item-documents', v_campaign::text || '/' || v_duplicate::text || '.html', '{"size":100}'::jsonb);

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  execute 'set local role authenticated';
  assert public.owns_item_document_upload(v_path), 'The DM may prepare an upload';
  assert public.may_remove_item_document_upload(v_path), 'An unattached upload can be discarded';

  select * into v_item from public.save_campaign_item_document(
    v_campaign, null,
    jsonb_build_object('slug', v_slug, 'name', 'Document upload test', 'category', 'Equipment'),
    'large.html', null, false, v_path
  );
  assert v_item.document_id = v_document, 'Exactly 25 MB may be attached';
  assert exists (
    select 1 from public.item_documents where id = v_document and is_stored and html = ''
  ), 'The catalogue stores a reference without copying the large contents';
  assert not public.may_remove_item_document_upload(v_path), 'Attached files cannot be discarded';

  begin
    perform public.save_campaign_item_document(
      v_campaign, v_item.id,
      jsonb_build_object('slug', v_slug, 'name', 'Document upload test', 'category', 'Equipment'),
      'large.html', null, false, v_campaign::text || '/' || v_large::text || '.html'
    );
    raise exception 'Oversized storage object accepted';
  exception when check_violation then null;
  end;

  begin
    perform public.save_campaign_item_document(
      v_campaign, null,
      jsonb_build_object('slug', v_slug, 'name', 'Document upload test', 'category', 'Equipment'),
      'duplicate.html', null, false, v_campaign::text || '/' || v_duplicate::text || '.html'
    );
    raise exception 'Duplicate item accepted';
  exception when unique_violation then null;
  end;
  assert not exists (select 1 from public.item_documents where id = v_duplicate),
    'A failed item save leaves no document row';

  perform set_config('request.jwt.claim.sub', v_player::text, true);
  assert not public.owns_item_document_upload(v_path), 'A player cannot upload to the DM catalogue';
  assert not public.may_read_item_document_upload(v_path), 'Membership does not reveal a file';
  select count(*) into v_count from storage.objects where bucket_id = 'item-documents' and name = v_path;
  assert v_count = 0, 'Storage RLS hides ungranted documents';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform public.grant_inventory_item(
    target_character := v_character, p_item_slug := v_slug, p_name := v_item.name,
    p_desc := '', p_category := 'Equipment', p_quantity := 1, p_is_custom := true,
    p_facts := jsonb_build_object('documentId', v_document)
  );

  perform set_config('request.jwt.claim.sub', v_player::text, true);
  assert public.may_read_item_document_upload(v_path), 'A holder may download their file';
  select count(*) into v_count from storage.objects where bucket_id = 'item-documents' and name = v_path;
  assert v_count = 1, 'Storage RLS follows inventory access';
end;
$test$;

rollback;
