alter table public.campaigns
  add column if not exists player_dice_paused boolean not null default false;

create or replace function public.set_player_dice_paused(
  target_campaign uuid,
  paused boolean
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or paused is null
    or not public.owns_campaign(target_campaign) then
    return false;
  end if;

  update public.campaigns
  set player_dice_paused = paused
  where id = target_campaign;

  return found;
end;
$$;

revoke all on function public.set_player_dice_paused(uuid, boolean) from public, anon;
grant execute on function public.set_player_dice_paused(uuid, boolean) to authenticated;

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
language sql
stable
security definer
set search_path = ''
as $$
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

alter table public.campaign_activity_logs
  drop constraint if exists campaign_activity_logs_kind_check;
alter table public.campaign_activity_logs
  add constraint campaign_activity_logs_kind_check
  check (
    actor_type in ('dm', 'player')
    and action_type in (
      'dice_roll', 'secret_dice_roll', 'hp_change', 'temp_hp_change',
      'armor_class_change', 'inspiration_change', 'level_change',
      'item_used', 'item_dropped', 'item_transferred', 'item_granted',
      'item_revoked', 'coin_spent', 'coin_transferred', 'coin_granted',
      'coin_revoked', 'spell_cast', 'chest_revealed', 'chest_looted',
      'bag_transferred', 'xp_change', 'rest_taken', 'max_hp_change',
      'instant_death', 'death_save', 'character_died', 'character_revived',
      'condition_applied', 'condition_removed', 'combat_started',
      'combat_ended', 'dice_pouch_opened'
    )
  );

create or replace function public.move_character_inspiration(
  p_char_id uuid,
  p_delta integer,
  p_campaign uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_head boolean := public.owns_campaign(p_campaign);
  v_mine boolean := public.owns_character(p_char_id);
  v_before integer;
  v_next integer;
begin
  if auth.uid() is null or p_delta is null
    or p_delta = 0 or p_delta not between -3 and 3 then
    return null;
  end if;

  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign and m.character_id = p_char_id
  ) or (not v_head and not (v_mine and p_delta < 0)) then
    return null;
  end if;

  select c.inspiration into v_before
  from public.characters c where c.id = p_char_id
  for update;

  update public.characters c
  set inspiration = least(3, greatest(0, c.inspiration + p_delta))
  where c.id = p_char_id
  returning c.inspiration into v_next;

  if v_next is distinct from v_before then
    perform public.write_table_log(
      p_campaign, case when v_head then null else p_char_id end,
      'inspiration_change', p_char_id,
      jsonb_build_object('delta', v_next - v_before)
    );
  end if;

  return v_next;
end;
$fn$;

revoke all on function public.move_character_inspiration(uuid, integer, uuid) from public, anon;
grant execute on function public.move_character_inspiration(uuid, integer, uuid) to authenticated;
