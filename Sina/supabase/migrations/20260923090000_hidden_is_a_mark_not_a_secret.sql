-- Hidden is a mark on a piece, not a secret kept from the table.
--
-- 20260922090000 withheld a hidden row from everybody but the Dungeon Master:
-- the SELECT policy dropped it, so a player's browser never had one to draw and
-- neither did their socket. That is the strongest version of hiding there is,
-- and it turns out to be the wrong one for this table — the party wants to SEE
-- that something has been put out of sight, the way they can see a piece is
-- dead. What is hidden is a state the whole room reads, and what a Dungeon
-- Master keeps back is simply a piece they have not put down yet.
--
-- So the policy widens to what every other read at this table is: anybody with
-- a character in the party, and the Dungeon Master. `is_hidden` goes on being
-- written by `set_map_token_state` alone, which is still the head of the
-- table's — the column is theirs to set, and everybody's to read.
--
-- NOTHING ELSE CHANGES. The definer functions, the trigger and the indexes from
-- 20260922090000 stand as they are.

drop policy if exists "The table reads what is on the board" on public.map_placed_tokens;
create policy "The table reads what is on the board"
  on public.map_placed_tokens for select to authenticated
  using (public.map_at_my_table(map_id));
