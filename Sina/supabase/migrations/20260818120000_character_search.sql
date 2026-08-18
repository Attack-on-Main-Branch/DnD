-- Searching for a character by part of its name, replacing the exact-handle
-- lookup from 20260818090000.
--
-- This is a deliberate loosening and it is worth being honest about what it
-- costs. The old function matched a full handle and nothing else, so it could
-- answer one question: "is this exact character real?" A prefix search answers
-- "which characters start like this?", and that is enumerable — somebody
-- patient can walk the alphabet and collect every character name, tag, race and
-- class in the database.
--
-- That was judged an acceptable trade because a handle is meant to be handed
-- out, and the columns here are the ones printed on a card a player shows
-- people. What it must never become is a way to reach anything private, so the
-- column list stays fixed and short: no user_id, no backstory, no notes.
--
-- The guards that remain:
--   * a fixed, minimal column list
--   * at most ten rows, so no single call returns a directory
--   * authenticated callers only
--   * LIKE metacharacters escaped, so `%` cannot widen the search. The escape
--     character is escaped first and by doubling it — `\` -> `\\` — because
--     under `standard_conforming_strings` a literal `'\'` is one backslash, so
--     replacing it with `'\'` is a no-op that leaves the next `%` unescaped.
--     Both arguments get this: the function is granted to `authenticated`, so
--     it can be called over RPC with anything, not only with what our own
--     parser produced.
--   * at least one filter, so an empty query returns nothing rather than
--     everything

drop function if exists public.find_character_by_handle(text, text);

create or replace function public.search_characters(
  name_prefix text default null,
  discriminator_prefix text default null
)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race, c.archetype, c.class_id, c.color_theme
  from public.characters c
  where
    -- Nothing asked for, nothing returned. Without this an all-null call would
    -- satisfy both branches below and hand back the first ten rows in the table.
    (name_prefix is not null or discriminator_prefix is not null)
    and (
      name_prefix is null
      or lower(c.name) like
        replace(replace(replace(lower(name_prefix), '\', '\\'), '%', '\%'), '_', '\_')
        || '%' escape '\'
    )
    and (
      discriminator_prefix is null
      or c.discriminator like
        replace(replace(replace(discriminator_prefix, '\', '\\'), '%', '\%'), '_', '\_')
        || '%' escape '\'
    )
  order by c.name, c.discriminator
  limit 10;
$$;

revoke all on function public.search_characters(text, text) from public;
revoke all on function public.search_characters(text, text) from anon;
grant execute on function public.search_characters(text, text) to authenticated;

-- The other direction of the party relationship: a player seeing where their
-- own character plays.
--
-- 20260818090000 gave the Dungeon Master a view of their party. These two are
-- its counterpart, and they are what lets a character sheet name the campaign
-- it belongs to. Scoped the same way and no wider: you can see the membership
-- rows for characters you own, and the titles of the campaigns those rows point
-- at — not the campaign's other members, and not anybody else's campaigns.
drop policy if exists "Players see where their characters play" on public.campaign_members;
create policy "Players see where their characters play"
  on public.campaign_members for select to authenticated
  using (exists (
    select 1 from public.characters ch
    where ch.id = character_id and ch.user_id = (select auth.uid())
  ));

drop policy if exists "Players see the campaigns their characters are in" on public.campaigns;
create policy "Players see the campaigns their characters are in"
  on public.campaigns for select to authenticated
  using (exists (
    select 1
    from public.campaign_members m
    join public.characters ch on ch.id = m.character_id
    where m.campaign_id = campaigns.id and ch.user_id = (select auth.uid())
  ));
