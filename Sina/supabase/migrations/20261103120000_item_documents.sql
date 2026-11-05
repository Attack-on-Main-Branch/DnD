-- HTML stays off the table wire; inventory facts carry only its immutable id.
create table if not exists public.item_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  html text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, id),
  constraint item_documents_bounds_check check (
    char_length(name) between 1 and 120
    and name ~* '\.html?$'
    and octet_length(html) between 1 and 1048576
    and char_length(btrim(html)) > 0
  )
);

alter table public.item_documents enable row level security;
revoke all on public.item_documents from anon, authenticated;
grant select on public.item_documents to authenticated;

create index if not exists character_inventory_document_id
  on public.character_inventory ((facts ->> 'documentId'));
create index if not exists container_items_document_id
  on public.container_items ((facts ->> 'documentId'));

alter table public.campaign_items
  add column if not exists document_id uuid;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_items_document_check'
  ) then
    alter table public.campaign_items
      add constraint campaign_items_document_check
      foreign key (campaign_id, document_id)
      references public.item_documents(campaign_id, id);
  end if;
end;
$ck$;

create or replace function public.may_read_item_document(target_document uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.item_documents d
      where d.id = target_document and public.owns_campaign(d.campaign_id)
    )
    or exists (
      select 1 from public.character_inventory i
      where i.facts ->> 'documentId' = target_document::text
        and (
          public.owns_character(i.character_id)
          or public.character_at_my_table(i.character_id)
        )
    )
    or exists (
      select 1 from public.container_items i
      where i.facts ->> 'documentId' = target_document::text
        and public.may_open_container(i.container_id)
    )
  );
$fn$;

revoke all on function public.may_read_item_document(uuid) from public, anon;
grant execute on function public.may_read_item_document(uuid) to authenticated;

drop policy if exists "Whoever holds an item reads its document" on public.item_documents;
create policy "Whoever holds an item reads its document"
  on public.item_documents for select to authenticated
  using (public.may_read_item_document(id));

-- A document and its catalogue entry land together or both roll back.
create or replace function public.save_campaign_item_document(
  p_campaign_id uuid,
  p_item_id uuid,
  p_item jsonb,
  p_document_name text default null,
  p_document_html text default null,
  p_remove_document boolean default false
)
returns setof public.campaign_items
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_document uuid;
  v_item_id uuid;
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

  if p_document_name is not null or p_document_html is not null then
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

revoke all on function public.save_campaign_item_document(uuid, uuid, jsonb, text, text, boolean)
  from public, anon;
grant execute on function public.save_campaign_item_document(uuid, uuid, jsonb, text, text, boolean)
  to authenticated;
