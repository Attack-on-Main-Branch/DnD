-- Hidden is a secret again, and the policy is where that is kept.
--
-- 20260922090000 withheld a hidden piece from everybody but the Dungeon Master.
-- 20260923090000 widened it so the whole table could see that something had
-- been put out of sight. Played, the wider one turns out to give the surprise
-- away: a faint disc on the board is still a disc on the board, and a party that
-- can see where the thing they cannot see is standing is not surprised by it.
--
-- So the narrow policy comes back, and this is the version that stays. A hidden
-- row is the Dungeon Master's own: a player's `select()` does not return it,
-- their socket is never sent it — Realtime evaluates this same policy against
-- the subscriber's JWT — and there is no version of it in their document to be
-- found by reading the page. The Dungeon Master draws it at half strength with a
-- struck-through eye, which is the only place hiding is ever visible.
--
-- `is_hidden` goes on being written by `set_map_token_state` alone.

drop policy if exists "The table reads what is on the board" on public.map_placed_tokens;
create policy "The table reads what is on the board"
  on public.map_placed_tokens for select to authenticated
  using (
    public.owns_map(map_id)
    or (public.map_at_my_table(map_id) and not is_hidden)
  );
