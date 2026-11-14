alter table public.campaigns
  add column if not exists combat_turn_id uuid not null default gen_random_uuid();
alter table public.map_placed_tokens
  add column if not exists movement_turn_id uuid,
  add column if not exists movement_ft double precision not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'map_placed_tokens_movement_check') then
    alter table public.map_placed_tokens add constraint map_placed_tokens_movement_check
      check (movement_ft >= 0 and movement_ft < 'Infinity'::double precision);
  end if;
end $$;

create or replace function public.rotate_combat_turn_id()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.is_in_combat, new.active_turn_token_id, new.combat_round, new.active_map_id)
    is distinct from (old.is_in_combat, old.active_turn_token_id, old.combat_round, old.active_map_id) then
    new.combat_turn_id := gen_random_uuid();
  else
    new.combat_turn_id := old.combat_turn_id;
  end if;
  return new;
end $$;
revoke all on function public.rotate_combat_turn_id() from public, anon, authenticated;
drop trigger if exists rotate_combat_turn_id on public.campaigns;
create trigger rotate_combat_turn_id before update on public.campaigns
for each row execute function public.rotate_combat_turn_id();

create or replace function public.pass_combat_turn(p_campaign_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_map uuid; v_active uuid; v_seat integer; v_count integer; v_next uuid;
begin
  select c.active_map_id, c.active_turn_token_id into v_map, v_active
  from public.campaigns c where c.id = p_campaign_id and c.is_in_combat for update;
  if not found then return false; end if;
  select count(*) into v_count from public.combat_turn_order(v_map);
  if v_count = 0 then
    update public.campaigns set active_turn_token_id = null where id = p_campaign_id;
    return true;
  end if;
  select o.seat into v_seat from public.combat_turn_order(v_map) o where o.token_id = v_active;
  select o.token_id into v_next from public.combat_turn_order(v_map) o
  where o.seat = case when v_seat is null or v_seat >= v_count then 1 else v_seat + 1 end;
  update public.campaigns set active_turn_token_id = v_next,
    combat_round = combat_round + case when v_seat >= v_count then 1 else 0 end
  where id = p_campaign_id;
  return true;
end $$;
revoke all on function public.pass_combat_turn(uuid) from public, anon, authenticated;

create or replace function public.advance_combat_turn_locked(p_campaign_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.owns_campaign(p_campaign_id) then return false; end if;
  return public.pass_combat_turn(p_campaign_id);
end $$;
revoke all on function public.advance_combat_turn_locked(uuid) from public, anon;
grant execute on function public.advance_combat_turn_locked(uuid) to authenticated;

create or replace function public.finish_character_turn(
  p_campaign_id uuid, p_character_id uuid, p_turn_id uuid
)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_active uuid; v_turn uuid; v_map uuid;
begin
  if p_character_id is null or p_turn_id is null
    or not public.my_seat_at_table(p_campaign_id, p_character_id) then return false; end if;
  select c.active_turn_token_id, c.combat_turn_id, c.active_map_id into v_active, v_turn, v_map
  from public.campaigns c where c.id = p_campaign_id and c.is_in_combat for update;
  if not found or v_turn <> p_turn_id then return false; end if;
  if not exists (select 1 from public.map_placed_tokens t
    where t.id = v_active and t.character_id = p_character_id and t.map_id = v_map) then return false; end if;
  return public.pass_combat_turn(p_campaign_id);
end $$;
revoke all on function public.finish_character_turn(uuid, uuid, uuid) from public, anon;
grant execute on function public.finish_character_turn(uuid, uuid, uuid) to authenticated;

create or replace function public.move_map_token_with_movement(
  p_token_id uuid, p_x double precision, p_y double precision, p_q integer, p_r integer,
  p_distance_ft double precision, p_turn_id uuid
)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_campaign uuid; v_character uuid; v_combat public.campaigns%rowtype;
  v_token public.map_placed_tokens%rowtype; v_distance double precision; v_grid boolean;
begin
  select m.campaign_id, t.character_id into v_campaign, v_character
  from public.map_placed_tokens t join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;
  if v_campaign is null or not (public.owns_campaign(v_campaign)
    or (v_character is not null and public.my_seat_at_table(v_campaign, v_character))) then return false; end if;
  select * into v_token from public.map_placed_tokens t where t.id = p_token_id for update;
  if not found then return false; end if;
  select * into v_combat from public.campaigns c where c.id = v_campaign;
  if not public.move_map_token(p_token_id, p_x, p_y, p_q, p_r) then return false; end if;

  -- Distances are advisory. Invalid or stale reports never block an authorized move.
  if v_combat.is_in_combat and v_combat.active_turn_token_id = p_token_id
    and v_combat.active_map_id = v_token.map_id and v_combat.combat_turn_id = p_turn_id
    and p_distance_ft between 0 and 1000000 then
    v_distance := p_distance_ft;
    select m.grid_enabled into v_grid from public.campaign_maps m where m.id = v_token.map_id;
    if v_grid and v_token.hex_q is not null and v_token.hex_r is not null
      and p_q is not null and p_r is not null then
      v_distance := (abs(p_q::bigint - v_token.hex_q) + abs(p_r::bigint - v_token.hex_r)
        + abs((p_q::bigint - v_token.hex_q) + (p_r::bigint - v_token.hex_r))) * 2.5;
    end if;
    update public.map_placed_tokens set movement_turn_id = p_turn_id,
      movement_ft = case when movement_turn_id = p_turn_id then movement_ft else 0 end + v_distance
    where id = p_token_id;
  end if;
  -- Moving a piece must not change its initiative tie-break.
  update public.map_placed_tokens set placed_at = v_token.placed_at where id = p_token_id;
  return true;
end $$;
revoke all on function public.move_map_token_with_movement(uuid, double precision, double precision, integer, integer, double precision, uuid) from public, anon;
grant execute on function public.move_map_token_with_movement(uuid, double precision, double precision, integer, integer, double precision, uuid) to authenticated;

create or replace function public.next_combat_character(p_campaign_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_map uuid; v_active uuid; v_seat integer; v_count integer; v_character uuid;
begin
  select c.active_map_id, c.active_turn_token_id into v_map, v_active
  from public.campaigns c where c.id = p_campaign_id and c.is_in_combat;
  if not found then return null; end if;
  select count(*) into v_count from public.combat_turn_order(v_map);
  select o.seat into v_seat from public.combat_turn_order(v_map) o where o.token_id = v_active;
  select t.character_id into v_character from public.combat_turn_order(v_map) o
  join public.map_placed_tokens t on t.id = o.token_id
  where o.seat = case when v_seat is null or v_seat >= v_count then 1 else v_seat + 1 end;
  return v_character;
end $$;
revoke all on function public.next_combat_character(uuid) from public, anon, authenticated;

create or replace function public.notify_combat_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.campaigns c set combat_turn_id = c.combat_turn_id
  where c.id in (select candidate.id from public.campaigns candidate
    where candidate.is_in_combat and candidate.active_map_id = case when tg_op = 'DELETE' then old.map_id else new.map_id end
    for update skip locked);
  return null;
end $$;
revoke all on function public.notify_combat_order() from public, anon, authenticated;
drop trigger if exists notify_combat_order on public.map_placed_tokens;
create trigger notify_combat_order after insert or delete or update of initiative, is_dead
on public.map_placed_tokens for each row execute function public.notify_combat_order();

create or replace function public.notify_character_combat_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_dead is distinct from old.is_dead then
    update public.campaigns c set combat_turn_id = c.combat_turn_id
    where c.id in (select candidate.id from public.campaigns candidate
      where candidate.is_in_combat and exists (select 1 from public.map_placed_tokens t
        where t.map_id = candidate.active_map_id and t.character_id = new.id)
      for update skip locked);
  end if;
  return new;
end $$;
revoke all on function public.notify_character_combat_order() from public, anon, authenticated;
drop trigger if exists notify_character_combat_order on public.characters;
create trigger notify_character_combat_order after update of is_dead on public.characters
for each row execute function public.notify_character_combat_order();

create or replace function public.campaign_combat_guidance(target_campaign uuid)
returns table (
  combat_turn_id uuid, next_turn_character_id uuid,
  is_in_combat boolean, active_turn_token_id uuid, combat_round integer
)
language sql stable security definer set search_path = '' as $$
  select c.combat_turn_id, public.next_combat_character(c.id),
    c.is_in_combat, c.active_turn_token_id, c.combat_round
  from public.campaigns c
  where c.id = target_campaign and (public.owns_campaign(target_campaign)
    or public.my_character_in_campaign(target_campaign));
$$;
revoke all on function public.campaign_combat_guidance(uuid) from public, anon;
grant execute on function public.campaign_combat_guidance(uuid) to authenticated;
