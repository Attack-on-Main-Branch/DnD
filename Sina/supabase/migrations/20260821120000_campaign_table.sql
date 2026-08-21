-- The table: a campaign as its party sees it.
--
-- Until now a campaign was readable only by the Dungeon Master who made it, so
-- a player following "Play" from their character sheet landed on a 404 — the
-- character page says as much in a comment. The game view needs the title and
-- the map to reach everyone sitting at that table, and nothing else about the
-- campaign to reach anybody new.
--
-- RLS grants rows, never columns, so widening the SELECT policy on
-- public.campaigns would have handed players `world_description` and the
-- owner's `user_id` along with it. The read goes through a definer function
-- whose return type IS the column list instead — the same shape
-- `search_characters` and `campaign_party` already use. It cannot recurse: a
-- definer function reads past RLS, so no policy is evaluated to answer it.
--
-- `is_owner` rides along because the caller needs it anyway and asking
-- separately is a second round trip for a question this row already knows the
-- answer to.

create or replace function public.campaign_table(target_campaign uuid)
returns table (
  id uuid,
  title text,
  map_url text,
  is_owner boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.map_url, public.owns_campaign(target_campaign)
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

-- The party list, widened to the party itself.
--
-- Re-declared in full rather than altered: this is the body from
-- 20260818170000_party_display_columns.sql with one clause changed, and running
-- that file after this one would silently put the narrower version back. If the
-- two are ever pasted out of order, re-run this one.
--
-- The only change is who may ask. The columns are unchanged and remain the
-- display subset — no user_id, no backstory, no ability scores — so a player
-- learns exactly what the Dungeon Master already sees of the people they are
-- playing beside, and nothing more. Sharing a table is the consent: a character
-- is only in this list because its owner accepted an invitation.
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
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    )
  order by m.added_at;
$$;

revoke all on function public.campaign_party(uuid) from public;
revoke all on function public.campaign_party(uuid) from anon;
grant execute on function public.campaign_party(uuid) to authenticated;
