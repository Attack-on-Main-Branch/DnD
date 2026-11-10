create table if not exists public.banner_skins (
  skin text primary key,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'iconic'))
);
alter table public.banner_skins enable row level security;
revoke all on public.banner_skins from anon, authenticated;

insert into public.banner_skins (skin, rarity) values
  ('classic', 'common'), ('dragon-lore', 'iconic')
on conflict (skin) do update set rarity = excluded.rarity;

alter table public.characters add column if not exists banner_skin text not null
  default 'classic' references public.banner_skins(skin);
alter table public.campaigns add column if not exists banner_skin text not null
  default 'classic' references public.banner_skins(skin);

create table if not exists public.character_banner_skins (
  character_id uuid not null references public.characters(id) on delete cascade,
  skin text not null references public.banner_skins(skin),
  unlocked_at timestamptz not null default now(),
  announced boolean not null default false,
  primary key (character_id, skin)
);
alter table public.character_banner_skins enable row level security;
revoke all on public.character_banner_skins from anon, authenticated;
grant select on public.character_banner_skins to authenticated;

drop policy if exists "Owners and their DM read unlocked banners" on public.character_banner_skins;
create policy "Owners and their DM read unlocked banners"
  on public.character_banner_skins for select to authenticated
  using (public.owns_character(character_id) or public.character_at_my_table(character_id));

create or replace function public.guard_banner_skin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.banner_skin = 'classic'
    or (tg_op = 'UPDATE' and new.banner_skin is not distinct from old.banner_skin)
  then return new;
  end if;
  if not exists (
    select 1 from public.character_banner_skins o
    where o.character_id = new.id and o.skin = new.banner_skin
  ) then raise exception 'banner_skin_locked';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_banner_skin() from public, anon, authenticated;
drop trigger if exists characters_guard_banner_skin on public.characters;
create trigger characters_guard_banner_skin before insert or update of banner_skin
  on public.characters for each row execute function public.guard_banner_skin();

create or replace function public.set_banner_skin(target_id uuid, target_kind text, new_skin text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if target_kind = 'character' and public.owns_character(target_id) then
    update public.characters set banner_skin = new_skin where id = target_id;
  elsif target_kind = 'campaign' and public.owns_campaign(target_id) then
    update public.campaigns set banner_skin = new_skin where id = target_id;
  else return false;
  end if;
  return found;
end;
$$;
revoke all on function public.set_banner_skin(uuid, text, text) from public, anon;
grant execute on function public.set_banner_skin(uuid, text, text) to authenticated;

-- Internal invoker helper: only the definer opening a pouch can read this pool.
create or replace function public.skin_pouch_pool(p_character uuid)
returns table (kind text, skin text, rarity text)
language sql stable set search_path = '' as $$
  select 'dice', s.skin, s.rarity from public.dice_skins s
  where s.skin <> 'classic' and not exists (
    select 1 from public.character_dice_skins o
    where o.character_id = p_character and o.skin = s.skin
  )
  union all
  select 'banner', s.skin, s.rarity from public.banner_skins s
  where s.skin <> 'classic' and not exists (
    select 1 from public.character_banner_skins o
    where o.character_id = p_character and o.skin = s.skin
  );
$$;
revoke all on function public.skin_pouch_pool(uuid) from public, anon, authenticated;

create or replace function public.open_pouch(p_campaign uuid, p_character uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_pouch uuid;
  v_have integer;
  v_roll double precision := random();
  v_rarity text;
  v_reward record;
begin
  if p_character is null or not public.my_seat_at_table(p_campaign, p_character) then
    return null;
  end if;

  perform 1 from public.characters where id = p_character for update;
  select i.id, i.quantity into v_pouch, v_have
  from public.character_inventory i
  where i.character_id = p_character and i.item_slug = 'dice-pouch' and i.container_id is null
  for update;
  if v_pouch is null or v_have < 1 then return null; end if;

  -- Mirrors POUCH_ODDS: draw a rarity, then evenly among its remaining skins.
  with odds (rarity, weight, rank) as (
    values ('common', 40, 1), ('uncommon', 24, 2), ('rare', 16, 3),
           ('epic', 12, 4), ('legendary', 6, 5), ('iconic', 2, 6)
  ), ladder as (
    select o.rarity, sum(o.weight) over (order by o.rank) as reach,
           sum(o.weight) over () as total
    from odds o where exists (
      select 1 from public.skin_pouch_pool(p_character) p where p.rarity = o.rarity
    )
  )
  select l.rarity into v_rarity from ladder l
  where l.reach > v_roll * l.total order by l.reach limit 1;
  if v_rarity is null then raise exception 'dice_pouch_empty'; end if;

  select p.kind, p.skin into v_reward from public.skin_pouch_pool(p_character) p
  where p.rarity = v_rarity order by random() limit 1;
  if v_reward.kind = 'dice' then
    insert into public.character_dice_skins (character_id, skin) values (p_character, v_reward.skin);
  else
    insert into public.character_banner_skins (character_id, skin) values (p_character, v_reward.skin);
  end if;

  if v_have > 1 then
    update public.character_inventory set quantity = v_have - 1 where id = v_pouch;
  else delete from public.character_inventory where id = v_pouch;
  end if;
  return jsonb_build_object('kind', v_reward.kind, 'skin', v_reward.skin);
end;
$$;
revoke all on function public.open_pouch(uuid, uuid) from public, anon;
grant execute on function public.open_pouch(uuid, uuid) to authenticated;
revoke all on function public.open_dice_pouch(uuid, uuid) from public, anon, authenticated;

create or replace function public.announce_skins(p_campaign uuid, p_character uuid)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  v_name text;
  v_told integer;
begin
  if p_character is null or not public.my_seat_at_table(p_campaign, p_character) then
    return 0;
  end if;
  select c.name into v_name from public.characters c where c.id = p_character;
  with dice as (
    update public.character_dice_skins set announced = true
    where character_id = p_character and not announced returning skin, unlocked_at
  ), banners as (
    update public.character_banner_skins set announced = true
    where character_id = p_character and not announced returning skin, unlocked_at
  ), told as (
    select 'dice' as kind, d.skin, d.unlocked_at, s.rarity from dice d
    join public.dice_skins s on s.skin = d.skin
    union all
    select 'banner', b.skin, b.unlocked_at, s.rarity from banners b
    join public.banner_skins s on s.skin = b.skin
  )
  insert into public.campaign_activity_logs (
    campaign_id, actor_character, actor_name, actor_type, action_type, payload
  )
  select p_campaign, p_character, left(v_name, 80), 'player', 'dice_pouch_opened',
         jsonb_build_object('kind', t.kind, 'skin', t.skin, 'rarity', t.rarity)
  from told t order by t.unlocked_at;
  get diagnostics v_told = row_count;
  return v_told;
end;
$$;
revoke all on function public.announce_skins(uuid, uuid) from public, anon;
grant execute on function public.announce_skins(uuid, uuid) to authenticated;

-- Retain the reserved slug so existing stacks and their DM-only guard still work.
update public.character_inventory set name = 'Pouch', category = 'Skins',
  description = 'A drawstring pouch holding one dice or banner skin you have not found yet. Open it to see which.'
where item_slug = 'dice-pouch';

drop function if exists public.campaign_party(uuid);

create function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  dice_color text,
  dice_skin text,
  banner_skin text,
  avatar_url text,
  level integer,
  xp integer,
  inspiration integer,
  current_hp integer,
  max_hp integer,
  temp_hp integer,
  temp_hp_max integer,
  armor_class integer,
  death_saves jsonb,
  is_dead boolean,
  health_tier text,
  is_dying boolean,
  conditions text[],
  is_mine boolean,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.dice_color, c.dice_skin, c.banner_skin, c.avatar_url,
         c.level, c.xp,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.inspiration
         end,
         case when public.owns_campaign(target_campaign) or public.owns_character(c.id) then c.current_hp end,
         case when public.owns_campaign(target_campaign) or public.owns_character(c.id) then c.max_hp end,
         case when public.owns_campaign(target_campaign) or public.owns_character(c.id) then c.temp_hp end,
         case when public.owns_campaign(target_campaign) or public.owns_character(c.id) then c.temp_hp_max end,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.armor_class
         end,
         c.death_saves, c.is_dead, public.health_tier(c.current_hp, c.max_hp),
         c.current_hp = 0 and not c.is_dead, c.conditions,
         public.owns_character(c.id), m.added_at
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    )
  order by m.added_at;
$$;

revoke all on function public.campaign_party(uuid) from public;
revoke all on function public.campaign_party(uuid) from anon;
grant execute on function public.campaign_party(uuid) to authenticated;


drop function if exists public.campaign_table(uuid);
create function public.campaign_table(target_campaign uuid)
returns table (
  id uuid,
  title text,
  world_description text,
  map_url text,
  active_map_id uuid,
  is_owner boolean,
  is_in_combat boolean,
  active_turn_token_id uuid,
  combat_round integer,
  dice_color text,
  dice_skin text,
  banner_skin text,
  player_dice_paused boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.world_description,
         coalesce(m.url, c.map_url), c.active_map_id,
         public.owns_campaign(target_campaign),
         c.is_in_combat, c.active_turn_token_id, c.combat_round,
         c.dice_color, c.dice_skin, c.banner_skin, c.player_dice_paused
  from public.campaigns c
  left join public.campaign_maps m on m.id = c.active_map_id
  where c.id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    );
$$;

revoke all on function public.campaign_table(uuid) from public, anon;
grant execute on function public.campaign_table(uuid) to authenticated;
