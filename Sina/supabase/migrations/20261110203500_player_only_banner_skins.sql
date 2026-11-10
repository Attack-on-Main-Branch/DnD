create or replace function public.set_banner_skin(target_id uuid, target_kind text, new_skin text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if target_kind is distinct from 'character' or not public.owns_character(target_id) then return false;
  end if;
  update public.characters set banner_skin = new_skin where id = target_id;
  return found;
end;
$$;
revoke all on function public.set_banner_skin(uuid, text, text) from public, anon;
grant execute on function public.set_banner_skin(uuid, text, text) to authenticated;

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
  player_dice_paused boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.world_description,
         coalesce(m.url, c.map_url), c.active_map_id,
         public.owns_campaign(target_campaign),
         c.is_in_combat, c.active_turn_token_id, c.combat_round,
         c.dice_color, c.dice_skin, c.player_dice_paused
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

alter table public.campaigns drop column if exists banner_skin;
