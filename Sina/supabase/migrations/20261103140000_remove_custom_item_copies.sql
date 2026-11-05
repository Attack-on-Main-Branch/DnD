alter table public.item_documents
  add column if not exists cleanup_pending boolean not null default false;

create index if not exists character_inventory_catalogue_id
  on public.character_inventory ((facts ->> 'catalogueId'));
create index if not exists container_items_catalogue_id
  on public.container_items ((facts ->> 'catalogueId'));

create or replace function public.prepare_item_document_cleanup(p_campaign_id uuid)
returns table (id uuid, is_stored boolean)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
begin
  if not public.owns_campaign(p_campaign_id) then return; end if;

  for v_id in
    select d.id from public.item_documents d
    where d.campaign_id = p_campaign_id and not d.cleanup_pending
    order by d.id for update
  loop
    if not exists (select 1 from public.campaign_items c where c.document_id = v_id)
       and not exists (select 1 from public.character_inventory i where i.facts ->> 'documentId' = v_id::text)
       and not exists (select 1 from public.container_items i where i.facts ->> 'documentId' = v_id::text) then
      update public.item_documents d set cleanup_pending = true where d.id = v_id;
    end if;
  end loop;

  return query select d.id, d.is_stored from public.item_documents d
    where d.campaign_id = p_campaign_id and d.cleanup_pending
    order by d.id limit 60;
end;
$fn$;

create or replace function public.finish_item_document_cleanup(p_campaign_id uuid, p_document_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_count integer;
begin
  if not public.owns_campaign(p_campaign_id) then return null; end if;
  delete from public.item_documents d
  where d.campaign_id = p_campaign_id and d.cleanup_pending
    and d.id = any(p_document_ids)
    and (not d.is_stored or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'item-documents'
        and o.name = d.campaign_id::text || '/' || d.id::text || '.html'
    ));
  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke all on function public.prepare_item_document_cleanup(uuid) from public, anon;
revoke all on function public.finish_item_document_cleanup(uuid, uuid[]) from public, anon;
grant execute on function public.prepare_item_document_cleanup(uuid) to authenticated;
grant execute on function public.finish_item_document_cleanup(uuid, uuid[]) to authenticated;

-- Row locks keep grants from racing with deletion or file retirement.
create or replace function public.guard_item_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_document text;
  v_catalogue text;
begin
  if tg_table_name = 'campaign_items' then
    v_document := new.document_id::text;
  else
    v_document := new.facts ->> 'documentId';
    v_catalogue := new.facts ->> 'catalogueId';
  end if;

  if v_catalogue is not null then
    perform 1 from public.campaign_items c where c.id::text = v_catalogue for key share;
    if not found or not new.is_custom then
      raise check_violation using message = 'catalogue_item_removed';
    end if;
  end if;

  if v_document is not null then
    perform 1 from public.item_documents d
    where d.id::text = v_document and not d.cleanup_pending for key share;
    if not found then raise check_violation using message = 'item_document_removed'; end if;
  end if;
  return new;
end;
$fn$;

revoke all on function public.guard_item_references() from public, anon, authenticated;

drop trigger if exists campaign_items_guard_references on public.campaign_items;
create trigger campaign_items_guard_references
  before insert or update of document_id on public.campaign_items
  for each row execute function public.guard_item_references();

drop trigger if exists character_inventory_guard_references on public.character_inventory;
create trigger character_inventory_guard_references
  before insert or update of facts on public.character_inventory
  for each row execute function public.guard_item_references();

drop trigger if exists container_items_guard_references on public.container_items;
create trigger container_items_guard_references
  before insert or update of facts on public.container_items
  for each row execute function public.guard_item_references();

create or replace function public.remove_campaign_item_copies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if old.item_slug not like 'custom:%' then return old; end if;

  delete from public.character_inventory i
  where i.is_custom and (
    i.facts ->> 'catalogueId' = old.id::text
    or (
      not (i.facts ? 'catalogueId') and i.item_slug = old.item_slug
      and i.character_id in (
        select m.character_id from public.campaign_members m where m.campaign_id = old.campaign_id
      )
    )
  );

  delete from public.container_items i
  where i.is_custom and (
    i.facts ->> 'catalogueId' = old.id::text
    or (
      not (i.facts ? 'catalogueId') and i.item_slug = old.item_slug
      and i.container_id in (
        select c.id from public.containers c where c.campaign_id = old.campaign_id
      )
    )
  );

  perform 1 from public.prepare_item_document_cleanup(old.campaign_id);
  return old;
end;
$fn$;

revoke all on function public.remove_campaign_item_copies() from public, anon, authenticated;
drop trigger if exists campaign_items_remove_copies on public.campaign_items;
create trigger campaign_items_remove_copies
  after delete on public.campaign_items
  for each row execute function public.remove_campaign_item_copies();

create or replace function public.may_remove_item_document_upload(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select public.owns_item_document_upload(target_path) and not exists (
    select 1 from public.item_documents d
    where d.is_stored and not d.cleanup_pending
      and target_path = d.campaign_id::text || '/' || d.id::text || '.html'
  );
$fn$;
