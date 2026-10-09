drop trigger if exists characters_log_max_hp on public.characters;
drop function if exists public.log_max_hp_change();

-- Historical maximum-HP rows remain stored, but readers exclude them.
alter table public.campaign_activity_logs
  drop constraint if exists campaign_activity_logs_kind_check;
alter table public.campaign_activity_logs
  add constraint campaign_activity_logs_kind_check
  check (
    actor_type in ('dm', 'player')
    and action_type in (
      'dice_roll', 'secret_dice_roll', 'hp_change', 'temp_hp_change',
      'armor_class_change', 'level_change', 'item_used', 'item_dropped',
      'item_transferred', 'item_granted', 'item_revoked', 'coin_spent',
      'coin_transferred', 'coin_granted', 'coin_revoked', 'spell_cast',
      'chest_revealed', 'chest_looted', 'bag_transferred', 'xp_change',
      'rest_taken', 'max_hp_change', 'instant_death', 'death_save',
      'character_died', 'character_revived', 'condition_applied',
      'condition_removed', 'combat_started', 'combat_ended', 'dice_pouch_opened'
    )
  );

create or replace function public.log_armor_class_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
begin
  if v_campaign is not null then
    perform public.write_table_log(
      v_campaign, public.armed_uuid('grimoire.seat'),
      'armor_class_change', new.id,
      jsonb_build_object('delta', new.armor_class - old.armor_class)
    );
  end if;

  return null;
end;
$fn$;

revoke all on function public.log_armor_class_change() from public, anon, authenticated;

drop trigger if exists characters_log_armor_class on public.characters;
create trigger characters_log_armor_class
  after update on public.characters
  for each row
  when (old.armor_class is distinct from new.armor_class)
  execute function public.log_armor_class_change();

drop function if exists public.update_armor_class(uuid, integer, uuid);

create or replace function public.update_armor_class(
  p_char_id uuid,
  p_ac integer,
  p_campaign uuid default null,
  p_seat uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_landed integer;
begin
  if p_ac is null or p_ac < 0 or p_ac > 99
    or auth.uid() is null
    or not public.may_move_character(p_char_id, p_campaign)
    or (p_campaign is not null and not public.my_seat_at_table(p_campaign, p_seat)) then
    return null;
  end if;

  perform public.arm_table_log(p_campaign, p_seat, null, p_char_id, p_char_id);

  update public.characters c
  set armor_class = p_ac
  where c.id = p_char_id
  returning c.armor_class into v_landed;

  return v_landed;
end;
$fn$;

revoke all on function public.update_armor_class(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.update_armor_class(uuid, integer, uuid, uuid) to authenticated;
