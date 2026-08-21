-- A party member's level, for the rail beside the board.
--
-- `campaign_party` is the whole of what one player at a table may read about
-- another, and a level sits on the same footing as a race or an archetype: said
-- out loud at the first session and no secret after it. The rail prints it in a
-- ring beside the name, which is why it has to come back from here rather than
-- be looked up per character -- a `select` on somebody else's row is exactly
-- what this function exists to stand in for.
--
-- Dropped first, and not out of tidiness: `create or replace` refuses to change
-- a function's OUT parameters (SQLSTATE 42P13), and this adds one. Nothing
-- depends on it -- the data layer calls it by name through PostgREST -- and the
-- grants a drop takes with it are restated below.
drop function if exists public.campaign_party(uuid);

create function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text,
  level integer,
  current_hp integer,
  is_mine boolean,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.color_theme,
         c.level, c.current_hp, public.owns_character(c.id), m.added_at
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
