create or replace function public.set_token_initiative(
  p_token_id uuid,
  p_init integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_map uuid;
  v_character uuid;
  v_active_map uuid;
  v_active uuid;
  v_fighting boolean;
  v_first uuid;
  v_dm boolean;
begin
  if p_init is not null and p_init not between -20 and 99 then
    return false;
  end if;

  select m.campaign_id, t.map_id, t.character_id
    into v_campaign, v_map, v_character
  from public.map_placed_tokens t
  join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;

  if v_campaign is null or not (
    public.owns_campaign(v_campaign)
    or (v_character is not null and public.my_seat_at_table(v_campaign, v_character))
  ) then
    return false;
  end if;

  -- Serialize with turn advancement and the initiative reset on combat end.
  select c.active_map_id, c.active_turn_token_id, c.is_in_combat
    into v_active_map, v_active, v_fighting
  from public.campaigns c
  where c.id = v_campaign
  for update;

  if not found then
    return false;
  end if;

  v_dm := public.owns_campaign(v_campaign);
  if not v_dm and (
    p_init is null or v_character is null or not v_fighting
    or v_map is distinct from v_active_map
    or not public.my_seat_at_table(v_campaign, v_character)
  ) then
    return false;
  end if;

  update public.map_placed_tokens
    set initiative = p_init
    where id = p_token_id and map_id = v_map
      and character_id is not distinct from v_character
      and (v_dm or initiative is null);

  if not found then
    return false;
  end if;

  if not v_fighting or v_map is distinct from v_active_map or exists (
    select 1 from public.combat_turn_order(v_map) o where o.token_id = v_active
  ) then
    return true;
  end if;

  select o.token_id into v_first
  from public.combat_turn_order(v_map) o
  order by o.seat
  limit 1;

  update public.campaigns
    set active_turn_token_id = v_first
    where id = v_campaign;

  return true;
end;
$$;

revoke all on function public.set_token_initiative(uuid, integer) from public, anon;
grant execute on function public.set_token_initiative(uuid, integer) to authenticated;
