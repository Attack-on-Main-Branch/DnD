alter table public.characters
  add column if not exists temp_hp integer not null default 0,
  add column if not exists temp_hp_max integer not null default 0;

-- Mirrors MAX_HP in Sina/src/rules/health.js.
alter table public.characters
  drop constraint if exists characters_temp_hp_check;
alter table public.characters
  add constraint characters_temp_hp_check
  check (temp_hp between 0 and temp_hp_max and temp_hp_max between 0 and 205);

create or replace function public.character_health_state(
  p_character public.characters,
  p_instant_death boolean default false
)
returns jsonb
language sql
stable
set search_path = ''
as $fn$
  select jsonb_build_object(
    'current_hp', p_character.current_hp,
    'temp_hp', p_character.temp_hp,
    'temp_hp_max', p_character.temp_hp_max,
    'is_dead', p_character.is_dead,
    'instant_death', p_instant_death
  ) || p_character.death_saves;
$fn$;

revoke all on function public.character_health_state(public.characters, boolean)
  from public, anon, authenticated;

create or replace function public.grant_temporary_hit_points(
  p_char_id uuid,
  p_amount integer,
  p_campaign uuid,
  p_seat uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_character public.characters;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 205
    or auth.uid() is null
    or not public.may_move_character(p_char_id, p_campaign)
    or not public.my_seat_at_table(p_campaign, p_seat)
    or (p_seat is not null and p_seat <> p_char_id) then
    return null;
  end if;

  select c.* into v_character from public.characters c
  where c.id = p_char_id for update;

  if not found then
    return null;
  end if;

  if not v_character.is_dead and p_amount > v_character.temp_hp then
    perform public.arm_table_log(p_campaign, p_seat, null, p_char_id, p_char_id);

    update public.characters c
    set temp_hp = p_amount, temp_hp_max = p_amount
    where c.id = p_char_id returning c.* into v_character;
  end if;

  return public.character_health_state(v_character);
end;
$fn$;

revoke all on function public.grant_temporary_hit_points(uuid, integer, uuid, uuid)
  from public, anon;
grant execute on function public.grant_temporary_hit_points(uuid, integer, uuid, uuid)
  to authenticated;

create or replace function public.apply_damage(
  p_char_id uuid,
  p_damage integer,
  p_campaign uuid default null,
  p_seat uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_character public.characters;
  v_absorbed integer;
  v_damage integer;
  v_killed boolean;
begin
  if p_damage is null or p_damage <= 0 or p_damage > 205
    or auth.uid() is null
    or not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.* into v_character from public.characters c
  where c.id = p_char_id for update;

  if not found then
    return null;
  end if;

  if v_character.is_dead then
    return public.character_health_state(v_character);
  end if;

  v_absorbed := least(v_character.temp_hp, p_damage);
  v_damage := p_damage - v_absorbed;
  v_killed := v_damage > 0
    and v_character.current_hp - v_damage <= -v_character.max_hp;

  perform public.arm_table_log(p_campaign, p_seat, null, p_char_id, p_char_id);

  update public.characters c
  set temp_hp = c.temp_hp - v_absorbed,
      current_hp = greatest(0, c.current_hp - v_damage),
      is_dead = v_killed,
      death_saves = case
        when v_damage > 0 and c.current_hp - v_damage <= 0
          then public.no_death_saves()
        else c.death_saves
      end
  where c.id = p_char_id returning c.* into v_character;

  if v_killed and public.my_seat_at_table(p_campaign, p_seat) then
    perform public.write_table_log(
      p_campaign, p_seat, 'instant_death', p_char_id,
      jsonb_build_object('damage', p_damage)
    );
  end if;

  return public.character_health_state(v_character, v_killed);
end;
$fn$;

revoke all on function public.apply_damage(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.apply_damage(uuid, integer, uuid, uuid) to authenticated;

create or replace function public.apply_heal(
  p_char_id uuid,
  p_heal integer,
  p_campaign uuid default null,
  p_seat uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_character public.characters;
begin
  if p_heal is null or p_heal <= 0 or p_heal > 205
    or auth.uid() is null
    or not public.may_move_character(p_char_id, p_campaign) then
    return null;
  end if;

  select c.* into v_character from public.characters c
  where c.id = p_char_id for update;

  if not found then
    return null;
  end if;

  if v_character.is_dead then
    return public.character_health_state(v_character);
  end if;

  perform public.arm_table_log(p_campaign, p_seat, null, p_char_id, p_char_id);

  update public.characters c
  set current_hp = least(c.max_hp, c.current_hp + p_heal),
      death_saves = public.no_death_saves()
  where c.id = p_char_id returning c.* into v_character;

  return public.character_health_state(v_character);
end;
$fn$;

revoke all on function public.apply_heal(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.apply_heal(uuid, integer, uuid, uuid) to authenticated;

create or replace function public.log_health_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
  v_change record;
begin
  if v_campaign is null then
    return null;
  end if;

  for v_change in
    select * from (values
      ('hp_change', case when new.max_hp = old.max_hp
        then new.current_hp - old.current_hp else 0 end),
      ('temp_hp_change', new.temp_hp - old.temp_hp)
    ) as changes(action, delta)
  loop
    if v_change.delta <> 0 and abs(v_change.delta) <= 205 then
      perform public.write_table_log(
        v_campaign, public.armed_uuid('grimoire.seat'),
        v_change.action, new.id, jsonb_build_object('delta', v_change.delta)
      );
    end if;
  end loop;

  return null;
end;
$fn$;

revoke all on function public.log_health_change() from public, anon, authenticated;
drop trigger if exists characters_log_health on public.characters;
create trigger characters_log_health
  after update of current_hp, temp_hp on public.characters
  for each row execute function public.log_health_change();

alter table public.campaign_activity_logs
  drop constraint if exists campaign_activity_logs_kind_check;
alter table public.campaign_activity_logs
  add constraint campaign_activity_logs_kind_check
  check (
    actor_type in ('dm', 'player')
    and action_type in (
      'dice_roll',
      'secret_dice_roll',
      'hp_change',
      'temp_hp_change',
      'level_change',
      'item_used',
      'item_dropped',
      'item_transferred',
      'item_granted',
      'item_revoked',
      'coin_spent',
      'coin_transferred',
      'coin_granted',
      'coin_revoked',
      'spell_cast',
      'chest_revealed',
      'chest_looted',
      'bag_transferred',
      'xp_change',
      'rest_taken',
      'max_hp_change',
      'instant_death',
      'death_save',
      'character_died',
      'character_revived',
      'condition_applied',
      'condition_removed',
      'combat_started',
      'combat_ended',
      'dice_pouch_opened'
    )
  );

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
         c.current_hp, c.max_hp, c.temp_hp, c.temp_hp_max,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.armor_class
         end,
         c.death_saves, c.is_dead, c.conditions,
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
grant execute on function public.campaign_party(uuid) to authenticated;;
