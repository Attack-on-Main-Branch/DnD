-- Campaign dice belong to the Dungeon Master and need no pouch unlocks.
alter table public.campaigns
  add column if not exists dice_color text
    check (dice_color ~ '^#[0-9a-f]{6}$'),
  add column if not exists dice_skin text not null default 'classic'
    references public.dice_skins(skin);

create or replace function public.set_campaign_dice(
  target_campaign uuid,
  new_dice_color text,
  new_dice_skin text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_campaign(target_campaign) then
    return false;
  end if;

  if new_dice_color is null then
    raise check_violation using message = 'invalid_dice_color';
  end if;

  update public.campaigns
    set dice_color = new_dice_color,
        dice_skin = new_dice_skin
    where id = target_campaign;

  return found;
end;
$$;

revoke all on function public.set_campaign_dice(uuid, text, text) from public;
revoke all on function public.set_campaign_dice(uuid, text, text) from anon;
grant execute on function public.set_campaign_dice(uuid, text, text) to authenticated;

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
  dice_skin text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.world_description,
         coalesce(m.url, c.map_url),
         c.active_map_id,
         public.owns_campaign(target_campaign),
         c.is_in_combat,
         c.active_turn_token_id,
         c.combat_round,
         c.dice_color,
         c.dice_skin
  from public.campaigns c
  left join public.campaign_maps m on m.id = c.active_map_id
  where c.id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    );
$$;

revoke all on function public.campaign_table(uuid) from public;
revoke all on function public.campaign_table(uuid) from anon;
grant execute on function public.campaign_table(uuid) to authenticated;
