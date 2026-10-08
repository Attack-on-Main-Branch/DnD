drop function if exists public.campaign_token_health_states(uuid);

create function public.campaign_token_health_states(p_campaign_id uuid)
returns table (token_id uuid, health_tier text, is_dying boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.token_id, public.health_tier(h.current_hp, h.max_hp), h.current_hp = 0
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
