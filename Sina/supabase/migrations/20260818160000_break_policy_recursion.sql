-- Fixes "infinite recursion detected in policy for relation characters", which
-- took the whole dashboard down, not just the party feature.
--
-- What went wrong. Three policies were written to reference each other's
-- tables:
--
--   characters        -> reads campaign_members  (a DM sees their party)
--   campaign_members  -> reads characters        (a player sees where they play)
--   campaigns         -> reads campaign_members  (and that campaign's title)
--
-- Each of those reads is itself subject to RLS, so evaluating one policy runs
-- another, which runs the first. Postgres detects the loop and refuses the
-- query — and because RLS ORs every permissive SELECT policy together, the loop
-- was entered by *any* read of `characters`, including a player fetching their
-- own roster. A feature-scoped mistake with an app-wide blast radius.
--
-- The fix is the standard one: move each cross-table question into a SECURITY
-- DEFINER function. A definer function runs with the owner's rights, so the
-- tables it reads are not RLS-checked, and the cycle cannot form.
--
-- These are safe to expose. Each one filters by `auth.uid()` internally and
-- returns a boolean, so the only question any of them will answer is "is this
-- mine", asked about a row the caller already names. None of them returns data.
-- They are `stable` so the planner may cache them within a statement.

create or replace function public.owns_campaign(target_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = target_campaign and c.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_character(target_character uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.characters ch
    where ch.id = target_character and ch.user_id = (select auth.uid())
  );
$$;

/* Is this character in one of my campaigns? Asked by the characters policy. */
create or replace function public.character_in_my_campaign(target_character uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members m
    join public.campaigns c on c.id = m.campaign_id
    where m.character_id = target_character and c.user_id = (select auth.uid())
  );
$$;

/* Is one of my characters in this campaign? Asked by the campaigns policy. */
create or replace function public.my_character_in_campaign(target_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members m
    join public.characters ch on ch.id = m.character_id
    where m.campaign_id = target_campaign and ch.user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_campaign(uuid) from public;
revoke all on function public.owns_campaign(uuid) from anon;
grant execute on function public.owns_campaign(uuid) to authenticated;

revoke all on function public.owns_character(uuid) from public;
revoke all on function public.owns_character(uuid) from anon;
grant execute on function public.owns_character(uuid) to authenticated;

revoke all on function public.character_in_my_campaign(uuid) from public;
revoke all on function public.character_in_my_campaign(uuid) from anon;
grant execute on function public.character_in_my_campaign(uuid) to authenticated;

revoke all on function public.my_character_in_campaign(uuid) from public;
revoke all on function public.my_character_in_campaign(uuid) from anon;
grant execute on function public.my_character_in_campaign(uuid) to authenticated;

-- The same permissions as before, now asked in a way that cannot loop.

drop policy if exists "DMs read the characters in their campaigns" on public.characters;
create policy "DMs read the characters in their campaigns"
  on public.characters for select to authenticated
  using (public.character_in_my_campaign(id));

drop policy if exists "Owners read their campaign members" on public.campaign_members;
create policy "Owners read their campaign members"
  on public.campaign_members for select to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "Owners add their campaign members" on public.campaign_members;
create policy "Owners add their campaign members"
  on public.campaign_members for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Owners remove their campaign members" on public.campaign_members;
create policy "Owners remove their campaign members"
  on public.campaign_members for delete to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "Players see where their characters play" on public.campaign_members;
create policy "Players see where their characters play"
  on public.campaign_members for select to authenticated
  using (public.owns_character(character_id));

drop policy if exists "Players see the campaigns their characters are in" on public.campaigns;
create policy "Players see the campaigns their characters are in"
  on public.campaigns for select to authenticated
  using (public.my_character_in_campaign(id));
