-- The world's lore, at the table.
--
-- 20260821120000 kept `world_description` out of `campaign_table` on purpose:
-- widening the SELECT policy on public.campaigns would have handed players the
-- owner's `user_id` along with it, and at the time nothing at the board asked
-- for the lore. Now it does — the party reads it from a mark above the map.
--
-- It was never private. It is the Dungeon Master's description of the world
-- their players are playing in, written for them and already shown on the
-- campaign sheet's Overview tab. What stays out is what always stayed out: the
-- owner's identity, and every column this function does not name.

-- Dropped first, and not for tidiness: `create or replace` refuses to change a
-- function's OUT parameters (SQLSTATE 42P13), and this adds one. Nothing
-- depends on it — the data layer calls it by name through PostgREST — and the
-- grants are restated below, which a drop takes with it.
drop function if exists public.campaign_table(uuid);

create function public.campaign_table(target_campaign uuid)
returns table (
  id uuid,
  title text,
  world_description text,
  map_url text,
  is_owner boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.world_description, c.map_url,
         public.owns_campaign(target_campaign)
  from public.campaigns c
  where c.id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    );
$$;

revoke all on function public.campaign_table(uuid) from public;
revoke all on function public.campaign_table(uuid) from anon;
grant execute on function public.campaign_table(uuid) to authenticated;
