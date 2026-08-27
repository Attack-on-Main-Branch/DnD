-- The migration 20260821140000 and 20260821180000 both promised.
--
-- Each of them ends on the same two lines: "No update policy and no delete
-- policy: nothing in the app edits or removes a note, and both come back in the
-- migration that adds those." This is that file. The scroll above the map now
-- carries an Edit and a Delete beside every line it has written down, so the two
-- doors have to exist.
--
-- ORDINARY POLICIES AND NOT DEFINER FUNCTIONS, which is the same argument
-- 20260821140000 made for the INSERT: every column here is the caller's own to
-- set, and the row belongs to one account and is read by nobody else — not the
-- Dungeon Master, not the rest of the party. There is no column to keep back and
-- so nothing for a function's return type to narrow. Compare
-- `set_character_health`, where the row is shared and a policy wide enough to
-- admit the hit points would admit the name and the backstory beside them.
--
-- `body` IS THE ONLY THING AN UPDATE MAY REACH, and it is a WITH CHECK on the
-- same predicate that does it: `character_id` is what decides who owns the row,
-- so a row that must satisfy `owns_character` both before and after the write
-- cannot be moved onto somebody else's sheet — the only other column a writer
-- could aim at. `created_at` is reachable and deliberately left so: it is the
-- author's own timestamp on the author's own note, and misdating it fools
-- nobody but them.
--
-- A NOTE IS DELETED AND NOT MARKED. `notifications` keeps a status instead,
-- because the newest row there is the record of what its reader has been told;
-- a note is a sentence somebody wrote for themselves, and one struck out is
-- meant to be gone.

-- ---------------------------------------------------------------------------
-- A player's own.
-- ---------------------------------------------------------------------------
--
-- `owns_character` is the definer helper from 20260818160000 — an inline
-- `exists` over public.characters would be a policy reading an RLS-protected
-- table, which is the shape that took the dashboard down once already.
drop policy if exists "Players rewrite their own notes" on public.character_notes;
create policy "Players rewrite their own notes"
  on public.character_notes for update to authenticated
  using (public.owns_character(character_id))
  with check (public.owns_character(character_id));

drop policy if exists "Players strike out their own notes" on public.character_notes;
create policy "Players strike out their own notes"
  on public.character_notes for delete to authenticated
  using (public.owns_character(character_id));

-- ---------------------------------------------------------------------------
-- And a Dungeon Master's, which is the same table one level up.
-- ---------------------------------------------------------------------------
drop policy if exists "Dungeon Masters rewrite their own notes" on public.campaign_notes;
create policy "Dungeon Masters rewrite their own notes"
  on public.campaign_notes for update to authenticated
  using (public.owns_campaign(campaign_id))
  with check (public.owns_campaign(campaign_id));

drop policy if exists "Dungeon Masters strike out their own notes" on public.campaign_notes;
create policy "Dungeon Masters strike out their own notes"
  on public.campaign_notes for delete to authenticated
  using (public.owns_campaign(campaign_id));
