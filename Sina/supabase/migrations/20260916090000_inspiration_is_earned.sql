-- ---------------------------------------------------------------------------
-- A character arrives with none.
--
-- 20260906090000 gave the column a default of three, on the reading that the
-- pips should be full before anybody presses. That is backwards: inspiration is
-- something a Dungeon Master HANDS somebody for playing well, and a sheet that
-- starts full has already spent the gesture.
--
-- The default only. Characters already at a table keep whatever they are
-- holding — rewriting a live party's marks is not a schema change, it is
-- taking something away from four people at once.
--
-- The ceiling stays three: `characters_inspiration_check` and
-- `MAX_INSPIRATION` in Sina/src/rules/inspiration.js are unchanged.
alter table public.characters
  alter column inspiration set default 0;
