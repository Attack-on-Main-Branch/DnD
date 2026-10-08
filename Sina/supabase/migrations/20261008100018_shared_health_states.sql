create or replace function public.health_tier(p_current integer, p_max integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_max is null or p_max <= 0 or p_current is null then null
    when p_current::numeric / p_max > 0.5 then 'healthy'
    when p_current::numeric / p_max >= 0.25 then 'wounded'
    else 'critical'
  end;
$$;

revoke all on function public.health_tier(integer, integer) from public, anon;
grant execute on function public.health_tier(integer, integer) to authenticated;

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
         c.archetype, c.class_id, c.dice_color, c.dice_skin, c.avatar_url,
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

create or replace function public.campaign_token_health_states(p_campaign_id uuid)
returns table (token_id uuid, health_tier text)
language sql
stable
security definer
set search_path = ''
as $$
  select h.token_id, public.health_tier(h.current_hp, h.max_hp)
  from public.map_token_health h
  join public.map_placed_tokens t on t.id = h.token_id
  where h.campaign_id = p_campaign_id
    and (
      public.owns_campaign(p_campaign_id)
      or (public.my_character_in_campaign(p_campaign_id) and not t.is_hidden)
    );
$$;

revoke all on function public.campaign_token_health_states(uuid) from public, anon;
grant execute on function public.campaign_token_health_states(uuid) to authenticated;

;
