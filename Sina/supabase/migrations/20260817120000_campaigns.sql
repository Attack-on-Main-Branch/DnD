-- Campaigns: what a Dungeon Master makes, as against the characters a player
-- makes. Same ownership model as `characters` — a row belongs to one account
-- and RLS is what enforces it, not the application.
--
-- No update policy, deliberately. Nothing in the app edits a campaign yet, and
-- a policy that exists before the feature does is a door nobody is watching.
-- It comes back in the migration that adds editing.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null,
  world_description text,

  -- The public URL of the map in storage, or null. A URL rather than a storage
  -- path because that is what an <img> needs and the bucket is public; the path
  -- is recoverable from it, and the row is useless without the object anyway.
  map_url text,

  created_at timestamptz not null default now()
);

-- Every read is "my campaigns, newest first", which is exactly this index.
create index if not exists campaigns_user_id_created_at_idx
  on public.campaigns (user_id, created_at desc);

-- Bounds the database can hold even if a request never goes near the app.
-- Mirrors MAX_TITLE_LENGTH and MAX_LORE_LENGTH in Sina/src/rules/campaign.js.
-- char_length counts code points, which is what the rules layer counts too —
-- `.length` in JS counts UTF-16 units and would let an emoji title past here.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_title_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_title_check
      check (char_length(btrim(title)) between 2 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_world_description_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_world_description_check
      check (world_description is null or char_length(world_description) <= 2000);
  end if;
end;
$$;

alter table public.campaigns enable row level security;

-- Wrapping auth.uid() in a scalar subquery lets Postgres evaluate it once per
-- statement instead of once per row — Supabase's recommended RLS pattern, and
-- the one public.characters already uses.
drop policy if exists "Users read their own campaigns" on public.campaigns;
create policy "Users read their own campaigns"
  on public.campaigns for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own campaigns" on public.campaigns;
create policy "Users create their own campaigns"
  on public.campaigns for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own campaigns" on public.campaigns;
create policy "Users delete their own campaigns"
  on public.campaigns for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Storage: the `campaign-maps` bucket.
-- ---------------------------------------------------------------------------
--
-- Public, so a map can be rendered from a plain URL with no signing round trip.
-- Public means anybody holding the URL can fetch the image — the URLs contain a
-- uuid and are not enumerable, but they are not secret either. That is the right
-- trade for a battle map; it would be the wrong one for anything private.
--
-- Read is therefore open. Write is not: an object may only be created under a
-- folder named after the uploader's own uid, which is what stops one account
-- writing into another's prefix. `storage.foldername(name)` splits the object
-- name on `/`, so `[1]` is the first segment.
--
-- These statements touch the `storage` schema, which the migration runner owns
-- on a hosted project. If your role cannot create them, create the bucket in
-- Storage → New bucket (public), then paste the four policies into the SQL
-- editor as the owner.

insert into storage.buckets (id, name, public)
values ('campaign-maps', 'campaign-maps', true)
on conflict (id) do update set public = true;

drop policy if exists "Campaign maps are publicly readable" on storage.objects;
create policy "Campaign maps are publicly readable"
  on storage.objects for select
  using (bucket_id = 'campaign-maps');

drop policy if exists "Users upload their own campaign maps" on storage.objects;
create policy "Users upload their own campaign maps"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'campaign-maps'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Replacing a map is an update of an existing object, and it has to be pinned
-- at both ends: `using` decides which rows may be targeted, `with check` what
-- they may become. Without the second, a caller could move somebody else's
-- object into their own folder.
drop policy if exists "Users replace their own campaign maps" on storage.objects;
create policy "Users replace their own campaign maps"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'campaign-maps'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'campaign-maps'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete their own campaign maps" on storage.objects;
create policy "Users delete their own campaign maps"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'campaign-maps'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
