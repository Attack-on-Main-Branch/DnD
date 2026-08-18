-- Narrows what a Dungeon Master may read about a character in their party.
--
-- RLS filters rows, not columns, and nothing in this schema grants column-level
-- SELECT on public.characters. So "DMs read the characters in their campaigns"
-- handed over the whole row -- user_id, backstory, personality, every ability
-- score -- to anyone who could look a handle up and add that character to a
-- campaign of their own. Adding one takes no consent, by design; reading their
-- private prose was never part of that bargain.
--
-- The read moves into a definer function whose return type is the boundary,
-- which is the shape search_characters already uses. It cannot recurse: a
-- definer function reads past RLS, so no policy is evaluated to answer it.

create or replace function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.color_theme, m.added_at
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and public.owns_campaign(target_campaign)
  order by m.added_at;
$$;

revoke all on function public.campaign_party(uuid) from public;
revoke all on function public.campaign_party(uuid) from anon;
grant execute on function public.campaign_party(uuid) to authenticated;

-- The policy was the helper's only caller, and the function above is now the
-- only way a DM reads a party member.
drop policy if exists "DMs read the characters in their campaigns" on public.characters;
drop function if exists public.character_in_my_campaign(uuid);
