alter table public.item_documents
  add column if not exists is_stored boolean not null default false;

alter table public.item_documents
  drop constraint if exists item_documents_bounds_check;
alter table public.item_documents
  add constraint item_documents_bounds_check check (
    char_length(name) between 1 and 120
    and name ~* '\.html?$'
    and (
      (is_stored and html = '')
      or (
        not is_stored
        and octet_length(html) between 1 and 26214400
        and char_length(btrim(html)) > 0
      )
    )
  );

-- Browser transfers avoid the host's request and response body ceilings.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-documents', 'item-documents', false, 26214400, array['application/octet-stream'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.owns_item_document_upload(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.campaigns c
    where c.id::text = split_part(target_path, '/', 1)
      and c.user_id = (select auth.uid())
      and target_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.html$'
  );
$fn$;

create or replace function public.may_read_item_document_upload(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.owns_item_document_upload(target_path) or exists (
    select 1 from public.item_documents d
    where d.is_stored
      and target_path = d.campaign_id::text || '/' || d.id::text || '.html'
      and public.may_read_item_document(d.id)
  );
$fn$;

create or replace function public.may_remove_item_document_upload(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.owns_item_document_upload(target_path) and not exists (
    select 1 from public.item_documents d
    where d.is_stored
      and target_path = d.campaign_id::text || '/' || d.id::text || '.html'
  );
$fn$;

revoke all on function public.owns_item_document_upload(text) from public, anon;
revoke all on function public.may_read_item_document_upload(text) from public, anon;
revoke all on function public.may_remove_item_document_upload(text) from public, anon;
grant execute on function public.owns_item_document_upload(text) to authenticated;
grant execute on function public.may_read_item_document_upload(text) to authenticated;
grant execute on function public.may_remove_item_document_upload(text) to authenticated;

drop policy if exists "DMs upload their item documents" on storage.objects;
create policy "DMs upload their item documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-documents' and public.owns_item_document_upload(name));

drop policy if exists "Holders read their item document files" on storage.objects;
create policy "Holders read their item document files"
  on storage.objects for select to authenticated
  using (bucket_id = 'item-documents' and public.may_read_item_document_upload(name));

-- Attached files are immutable; only unsuccessful uploads may be discarded.
drop policy if exists "DMs discard unattached item documents" on storage.objects;
create policy "DMs discard unattached item documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-documents' and public.may_remove_item_document_upload(name));

drop function if exists public.save_campaign_item_document(uuid, uuid, jsonb, text, text, boolean);

create or replace function public.save_campaign_item_document(
  p_campaign_id uuid,
  p_item_id uuid,
  p_item jsonb,
  p_document_name text default null,
  p_document_html text default null,
  p_remove_document boolean default false,
  p_document_path text default null
)
returns setof public.campaign_items
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_document uuid;
  v_item_id uuid;
  v_size bigint;
begin
  if not public.owns_campaign(p_campaign_id) then
    return;
  end if;

  if p_item_id is not null then
    select id, document_id into v_item_id, v_document
    from public.campaign_items
    where id = p_item_id and campaign_id = p_campaign_id
    for update;

    if not found then return; end if;
  end if;

  if p_document_path is not null then
    if split_part(p_document_path, '/', 1) <> p_campaign_id::text
       or not public.owns_item_document_upload(p_document_path) then
      raise check_violation using message = 'invalid_item_document';
    end if;

    v_document := split_part(split_part(p_document_path, '/', 2), '.', 1)::uuid;
    if p_document_path <> p_campaign_id::text || '/' || v_document::text || '.html' then
      raise check_violation using message = 'invalid_item_document';
    end if;

    select (metadata ->> 'size')::bigint into v_size
    from storage.objects
    where bucket_id = 'item-documents' and name = p_document_path
    for share;
    if coalesce(v_size, 0) not between 1 and 26214400 then
      raise check_violation using message = 'invalid_item_document';
    end if;

    insert into public.item_documents(id, campaign_id, name, html, is_stored)
    values (v_document, p_campaign_id, p_document_name, '', true);
  elsif p_document_name is not null or p_document_html is not null then
    insert into public.item_documents(campaign_id, name, html)
    values (p_campaign_id, p_document_name, p_document_html)
    returning id into v_document;
  elsif p_remove_document then
    v_document := null;
  end if;

  if p_item_id is null then
    insert into public.campaign_items (
      campaign_id, item_slug, name, category, description, cost_quantity,
      cost_unit, weight, damage_dice, damage_type, armor_class, properties,
      document_id
    ) values (
      p_campaign_id, p_item ->> 'slug', p_item ->> 'name',
      p_item ->> 'category', coalesce(p_item ->> 'description', ''),
      coalesce((p_item ->> 'cost')::integer, 0),
      coalesce(p_item ->> 'costUnit', ''),
      coalesce((p_item ->> 'weight')::numeric, 0),
      coalesce(p_item ->> 'damageDice', ''),
      coalesce(p_item ->> 'damageType', ''),
      coalesce((p_item ->> 'armorClass')::integer, 0),
      coalesce(p_item ->> 'properties', ''), v_document
    ) returning id into v_item_id;
  else
    update public.campaign_items set
      item_slug = p_item ->> 'slug', name = p_item ->> 'name',
      category = p_item ->> 'category',
      description = coalesce(p_item ->> 'description', ''),
      cost_quantity = coalesce((p_item ->> 'cost')::integer, 0),
      cost_unit = coalesce(p_item ->> 'costUnit', ''),
      weight = coalesce((p_item ->> 'weight')::numeric, 0),
      damage_dice = coalesce(p_item ->> 'damageDice', ''),
      damage_type = coalesce(p_item ->> 'damageType', ''),
      armor_class = coalesce((p_item ->> 'armorClass')::integer, 0),
      properties = coalesce(p_item ->> 'properties', ''),
      document_id = v_document
    where id = v_item_id;
  end if;

  return query select * from public.campaign_items where id = v_item_id;
end;
$fn$;

revoke all on function public.save_campaign_item_document(uuid, uuid, jsonb, text, text, boolean, text)
  from public, anon;
grant execute on function public.save_campaign_item_document(uuid, uuid, jsonb, text, text, boolean, text)
  to authenticated;
