-- How a party member looks, as their Dungeon Master describes them: a
-- reference picture and a line or two — height, build, what they wear. It is
-- what the scene painter is shown, so a character comes out the same in every
-- picture.
--
-- PER CAMPAIGN AND NOT ON THE CHARACTER. The same character at two tables is
-- described by two Dungeon Masters, and neither may write the other's — nor
-- the player's own sheet. Keyed on the membership, so leaving the party takes
-- it away.
--
-- The Dungeon Master's alone, every column of it, so plain policies are the
-- whole of the guard: there is nothing on the row to narrow. Bounds mirror
-- Sina/src/rules/member-looks.js.

create table if not exists public.campaign_member_looks (
  campaign_id uuid not null,
  character_id uuid not null,
  image_url text,
  description text,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, character_id),
  foreign key (campaign_id, character_id)
    references public.campaign_members (campaign_id, character_id)
    on delete cascade
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_member_looks_image_check'
  ) then
    alter table public.campaign_member_looks
      add constraint campaign_member_looks_image_check
        check (image_url is null or char_length(image_url) between 1 and 400);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'campaign_member_looks_description_check'
  ) then
    alter table public.campaign_member_looks
      add constraint campaign_member_looks_description_check
        check (description is null or char_length(description) between 1 and 300);
  end if;
end
$$;

alter table public.campaign_member_looks enable row level security;

drop policy if exists "Dungeon Masters read their party's looks" on public.campaign_member_looks;
create policy "Dungeon Masters read their party's looks"
  on public.campaign_member_looks for select to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters describe their party" on public.campaign_member_looks;
create policy "Dungeon Masters describe their party"
  on public.campaign_member_looks for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters redescribe their party" on public.campaign_member_looks;
create policy "Dungeon Masters redescribe their party"
  on public.campaign_member_looks for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters forget a description" on public.campaign_member_looks;
create policy "Dungeon Masters forget a description"
  on public.campaign_member_looks for delete to authenticated
  using (public.owns_campaign(campaign_id));
