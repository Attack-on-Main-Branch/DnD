create or replace function public.valid_proficiency_list(p_entries jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_entry jsonb;
begin
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then return false; end if;
  if jsonb_array_length(p_entries) > 24 then return false; end if;
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    if jsonb_typeof(v_entry) <> 'string' or char_length(btrim(v_entry #>> '{}')) not between 1 and 60 then return false; end if;
  end loop;
  return true;
end;
$$;

alter table public.characters drop constraint if exists characters_proficiency_overrides_check;
alter table public.characters add constraint characters_proficiency_overrides_check check (
  custom_proficiencies -> 'overrides' is null or (
    jsonb_typeof(custom_proficiencies -> 'overrides') = 'object'
    and (custom_proficiencies -> 'overrides' -> 'armor' is null or public.valid_proficiency_list(custom_proficiencies -> 'overrides' -> 'armor'))
    and (custom_proficiencies -> 'overrides' -> 'weapons' is null or public.valid_proficiency_list(custom_proficiencies -> 'overrides' -> 'weapons'))
    and (custom_proficiencies -> 'overrides' -> 'tools' is null or public.valid_proficiency_list(custom_proficiencies -> 'overrides' -> 'tools'))
  )
);
revoke all on function public.valid_proficiency_list(jsonb) from public, anon;
grant execute on function public.valid_proficiency_list(jsonb) to authenticated;

create or replace function public.may_edit_proficiencies(p_campaign_id uuid, p_character_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    public.owns_character(p_character_id) or (
      public.owns_campaign(p_campaign_id) and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = p_campaign_id and m.character_id = p_character_id
      )
    )
  );
$$;

create or replace function public.read_character_proficiencies(p_campaign_id uuid, p_character_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('class_id', c.class_id, 'custom_proficiencies', c.custom_proficiencies)
  from public.characters c where c.id = p_character_id
    and public.may_edit_proficiencies(p_campaign_id, p_character_id);
$$;

create or replace function public.change_character_proficiency(
  p_campaign_id uuid, p_character_id uuid, p_group text, p_name text, p_remove boolean, p_base jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_custom jsonb;
  v_entries jsonb;
  v_name text := btrim(regexp_replace(p_name, '\s+', ' ', 'g'));
begin
  if not public.may_edit_proficiencies(p_campaign_id, p_character_id) then return null; end if;
  if p_group is null or p_group not in ('armor', 'weapons', 'tools')
    or v_name is null or char_length(v_name) not between 1 and 60 or p_remove is null then
    raise exception 'invalid_proficiency' using errcode = '23514';
  end if;
  select c.custom_proficiencies into v_custom from public.characters c
    where c.id = p_character_id for update;
  if not found then return null; end if;
  if not public.valid_proficiency_list(p_base) then
    raise exception 'invalid_proficiency' using errcode = '23514';
  end if;
  select coalesce(jsonb_agg(entry), '[]'::jsonb) into v_entries
    from jsonb_array_elements(coalesce(v_custom -> 'overrides' -> p_group, p_base)) entry
    where entry <> to_jsonb(v_name);
  if not p_remove then v_entries := v_entries || to_jsonb(v_name); end if;
  if jsonb_array_length(v_entries) > 24 then
    raise exception 'proficiency_limit' using errcode = '23514';
  end if;
  if jsonb_typeof(v_custom -> 'overrides') is distinct from 'object' then
    v_custom := jsonb_set(v_custom, '{overrides}', '{}');
  end if;
  v_custom := jsonb_set(v_custom, array['overrides', p_group], v_entries);
  update public.characters set custom_proficiencies = v_custom where id = p_character_id;
  return public.read_character_proficiencies(p_campaign_id, p_character_id);
end;
$$;

-- HP stays outside the public token rows: RLS cannot hide individual columns.
create table if not exists public.token_template_health (
  template_id uuid primary key references public.campaign_token_templates(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  max_hp integer not null check (max_hp between 1 and 10000)
);
create table if not exists public.map_token_health (
  token_id uuid primary key references public.map_placed_tokens(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  max_hp integer not null check (max_hp between 1 and 10000),
  current_hp integer not null check (current_hp >= 0 and current_hp <= max_hp)
);
create index if not exists token_template_health_campaign on public.token_template_health(campaign_id);
create index if not exists map_token_health_campaign on public.map_token_health(campaign_id);
alter table public.token_template_health enable row level security;
alter table public.map_token_health enable row level security;
revoke all on public.token_template_health, public.map_token_health from public, anon, authenticated;
grant select on public.token_template_health, public.map_token_health to authenticated;
drop policy if exists "DM reads template health" on public.token_template_health;
create policy "DM reads template health" on public.token_template_health for select to authenticated
  using (public.owns_campaign(campaign_id));
drop policy if exists "DM reads token health" on public.map_token_health;
create policy "DM reads token health" on public.map_token_health for select to authenticated
  using (public.owns_campaign(campaign_id));

create or replace function public.write_token_template(
  p_id uuid, p_campaign_id uuid, p_name text, p_image_url text, p_max_hp integer, p_editing boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_token public.campaign_token_templates;
begin
  if auth.uid() is null or not public.owns_campaign(p_campaign_id) then return null; end if;
  if p_max_hp is not null and p_max_hp not between 1 and 10000 then
    raise exception 'invalid_token_hp' using errcode = '23514';
  end if;
  if p_editing then
    update public.campaign_token_templates set name = p_name, image_url = coalesce(p_image_url, image_url)
      where id = p_id and campaign_id = p_campaign_id returning * into v_token;
  else
    insert into public.campaign_token_templates(id, campaign_id, name, image_url)
      values (p_id, p_campaign_id, p_name, p_image_url) returning * into v_token;
  end if;
  if not found then return null; end if;
  if p_max_hp is null then
    delete from public.token_template_health where template_id = p_id;
  else
    insert into public.token_template_health(template_id, campaign_id, max_hp)
      values(p_id, p_campaign_id, p_max_hp)
      on conflict(template_id) do update set max_hp = excluded.max_hp;
    insert into public.map_token_health(token_id, campaign_id, max_hp, current_hp)
      select t.id, p_campaign_id, p_max_hp, p_max_hp from public.map_placed_tokens t
      where t.template_id = p_id on conflict(token_id) do nothing;
  end if;
  return jsonb_build_object('id', v_token.id, 'campaign_id', v_token.campaign_id,
    'name', v_token.name, 'image_url', v_token.image_url, 'created_at', v_token.created_at,
    'max_hp', p_max_hp);
end;
$$;

create or replace function public.initialize_token_health()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.campaign_token_templates where id = new.template_id for share;
  insert into public.map_token_health(token_id, campaign_id, max_hp, current_hp)
    select new.id, h.campaign_id, h.max_hp, h.max_hp
    from public.token_template_health h where h.template_id = new.template_id;
  return new;
end;
$$;
drop trigger if exists initialize_token_health on public.map_placed_tokens;
create trigger initialize_token_health after insert on public.map_placed_tokens
  for each row execute function public.initialize_token_health();

create or replace function public.change_token_health(p_token_id uuid, p_delta integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_health public.map_token_health;
begin
  if auth.uid() is null then return null; end if;
  if p_delta is null or p_delta = 0 or p_delta not between -10000 and 10000 then
    raise exception 'invalid_token_hp' using errcode = '23514';
  end if;
  update public.map_token_health h
    set current_hp = greatest(0, least(h.max_hp, h.current_hp + p_delta))
    where h.token_id = p_token_id and public.owns_campaign(h.campaign_id)
    returning h.* into v_health;
  if not found then return null; end if;
  return jsonb_build_object('token_id', v_health.token_id,
    'current_hp', v_health.current_hp, 'max_hp', v_health.max_hp);
end;
$$;

revoke all on function public.may_edit_proficiencies(uuid, uuid) from public, anon;
revoke all on function public.read_character_proficiencies(uuid, uuid) from public, anon;
revoke all on function public.change_character_proficiency(uuid, uuid, text, text, boolean, jsonb) from public, anon;
revoke all on function public.write_token_template(uuid, uuid, text, text, integer, boolean) from public, anon;
revoke all on function public.initialize_token_health() from public, anon, authenticated;
revoke all on function public.change_token_health(uuid, integer) from public, anon;
grant execute on function public.may_edit_proficiencies(uuid, uuid) to authenticated;
grant execute on function public.read_character_proficiencies(uuid, uuid) to authenticated;
grant execute on function public.change_character_proficiency(uuid, uuid, text, text, boolean, jsonb) to authenticated;
grant execute on function public.write_token_template(uuid, uuid, text, text, integer, boolean) to authenticated;
grant execute on function public.change_token_health(uuid, integer) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'map_token_health') then
    alter publication supabase_realtime add table public.map_token_health;
  end if;
end $$;
