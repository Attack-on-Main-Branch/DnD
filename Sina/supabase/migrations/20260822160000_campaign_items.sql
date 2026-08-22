-- A campaign's own items: the things the SRD has never heard of.
--
-- 20260822120000 let a Dungeon Master invent one at the table and hand it over
-- in the same breath, which put a creation form inside a popover and gave the
-- invention nowhere to live. An item made up once and used across a whole
-- campaign is a fact about the campaign, so it is written down on the campaign
-- page and then FOUND at the table -- searched for beside the SRD's own, in the
-- one control that was already for finding things.
--
-- The catalogue and the pack are deliberately separate tables. This is what
-- exists in the world; `character_inventory` is who is holding it. Deleting a
-- rusted key from the catalogue does not take it out of the pack of whoever is
-- carrying one, which is why there is no foreign key between them -- the pack
-- row is a copy, made when it was handed over, and the two go on independently.

create table if not exists public.campaign_items (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.campaigns (id) on delete cascade,

  -- The same key `character_inventory` stacks on, derived by the same
  -- `customItemSlug` in Sina/src/rules/inventory.js. That is what makes an item
  -- granted from this catalogue land on the stack a previous grant of it made.
  item_slug text not null,

  name text not null,
  category text not null default 'Equipment',
  description text not null default '',

  created_at timestamptz not null default now(),

  unique (campaign_id, item_slug)
);

-- Mirrors Sina/src/rules/inventory.js, and the bounds are the same ones
-- `character_inventory` carries -- a catalogue entry that could not be copied
-- into a pack would be an entry nobody could hand out.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_items_bounds_check'
  ) then
    alter table public.campaign_items
      add constraint campaign_items_bounds_check
      check (
        char_length(btrim(name)) between 1 and 80
        and char_length(item_slug) between 1 and 100
        and char_length(category) <= 40
        and char_length(description) <= 500
      );
  end if;
end;
$ck$;

alter table public.campaign_items enable row level security;

-- The Dungeon Master's, and nobody else's. A player never reads this: the
-- catalogue is what MIGHT be in the world, and reading it would be reading the
-- Dungeon Master's notes. What a player is actually carrying is their own pack,
-- which is a different table with its own policies.
--
-- `owns_campaign` is the definer helper from 20260818160000, for the reason
-- every cross-table question in this schema goes through one: an inline
-- `exists` over public.campaigns would be a policy reading an RLS-protected
-- table, which is the shape that took the dashboard down once.

drop policy if exists "DMs read their own catalogue" on public.campaign_items;
create policy "DMs read their own catalogue"
  on public.campaign_items for select to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "DMs write their own catalogue" on public.campaign_items;
create policy "DMs write their own catalogue"
  on public.campaign_items for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "DMs strike from their own catalogue" on public.campaign_items;
create policy "DMs strike from their own catalogue"
  on public.campaign_items for delete to authenticated
  using (public.owns_campaign(campaign_id));

-- No UPDATE policy, deliberately. Nothing in the app edits a catalogue entry --
-- an item written down wrongly is struck out and written again, because its
-- slug is derived from its name and editing the name would silently orphan
-- every stack already handed out under the old one.

-- Sixty entries to a campaign, enforced here rather than only in the form.
--
-- The same shape as enforce_campaign_limit in 20260817160000, including the two
-- things that one had to learn the hard way: the advisory lock, without which
-- two requests arriving together both read the same pre-state under READ
-- COMMITTED and both insert; and `auth.uid() is not null` rather than `is
-- distinct from`, since IS DISTINCT FROM treats null as an ordinary value and
-- would turn the guard off for exactly the sessions that bypass RLS.
--
-- The lock seed is the CAMPAIGN, not the account: two campaigns of one Dungeon
-- Master's have separate catalogues and no reason to wait on each other. Seed 2
-- keeps it clear of the character (0) and campaign (1) counters, which are
-- keyed on a user id and would otherwise collide with a campaign id by
-- coincidence of hashing.
--
-- Mirrors MAX_CAMPAIGN_ITEMS in Sina/src/rules/inventory.js. Changing one means
-- changing the other.
create or replace function public.enforce_campaign_item_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if (select auth.uid()) is not null
     and not public.owns_campaign(new.campaign_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 2));

  if (
    select count(*) from public.campaign_items
    where campaign_id = new.campaign_id
  ) >= 60 then
    raise exception 'item_limit_reached';
  end if;

  return new;
end;
$fn$;

-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise,
-- and this one counts rows across every campaign. Nothing should be able to
-- call it except the trigger that owns it.
revoke all on function public.enforce_campaign_item_limit() from public;
revoke all on function public.enforce_campaign_item_limit() from anon;
revoke all on function public.enforce_campaign_item_limit() from authenticated;

drop trigger if exists campaign_items_enforce_limit on public.campaign_items;
create trigger campaign_items_enforce_limit
  before insert on public.campaign_items
  for each row execute function public.enforce_campaign_item_limit();
