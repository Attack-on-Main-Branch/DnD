-- The Dungeon Master's own notes.
--
-- 20260821140000 hung a note on a character, which is right for a player: they
-- write during a session and read it back under their own Notes tab. A Dungeon
-- Master has no character to hang one on. Where they also happen to own one at
-- their own table, borrowing it was worse than having nothing — the scroll came
-- up titled with somebody's name and filed the session's notes onto a sheet
-- they belong nowhere near.
--
-- So the campaign carries them. Same shape as character_notes, same bound, same
-- reasoning about who may read: these are the notes of whoever runs this table,
-- and nobody else sees them. They deliberately appear on no character sheet —
-- there is no sheet they belong to.

create table if not exists public.campaign_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,

  body text not null,

  created_at timestamptz not null default now()
);

-- Mirrors MAX_NOTE_LENGTH in Sina/src/rules/character.js, the same bound
-- character_notes carries. `char_length` counts code points, which is what the
-- rules layer counts too.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_notes_body_check'
  ) then
    alter table public.campaign_notes
      add constraint campaign_notes_body_check
      check (char_length(btrim(body)) between 1 and 1000);
  end if;
end;
$$;

-- Every read is "this campaign's notes, newest first", which is this index.
create index if not exists campaign_notes_campaign_id_created_at_idx
  on public.campaign_notes (campaign_id, created_at desc);

alter table public.campaign_notes enable row level security;

-- `owns_campaign` is the definer helper from 20260818160000 — an inline
-- `exists` over public.campaigns would be a policy reading an RLS-protected
-- table, which is the shape that took the dashboard down once already.
drop policy if exists "Dungeon Masters read their own notes" on public.campaign_notes;
create policy "Dungeon Masters read their own notes"
  on public.campaign_notes for select to authenticated
  using (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters write their own notes" on public.campaign_notes;
create policy "Dungeon Masters write their own notes"
  on public.campaign_notes for insert to authenticated
  with check (public.owns_campaign(campaign_id));

-- No update policy and no delete policy: nothing in the app edits or removes a
-- note, and both come back in the migration that adds those.
