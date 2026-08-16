-- The character-limit trigger answered a question it was never asked.
--
-- BEFORE ROW triggers fire before a policy's WITH CHECK, and this one is
-- SECURITY DEFINER, so RLS does not apply to the count inside it. An INSERT
-- carrying somebody else's user_id therefore reached the count first and came
-- back either 'character_limit_reached' or 42501 — two distinguishable answers,
-- and the bit they leak is whether that account already has three characters.
-- The REST endpoint and anon key are public, so any authenticated user could
-- ask it about any account they could name.
--
-- Not urgent, because nothing sends a user_id to the client: characters.js
-- selects a column list that omits it, so an attacker needs a uuid from
-- elsewhere first. There is now a test asserting that.
--
-- The fix is to make the trigger mind its own business — when there IS a caller
-- and the row is not theirs, the insert policy will reject it anyway, so there
-- is nothing to count and no lock worth taking. An authenticated PostgREST
-- request always carries a non-null `sub`, so the prober always takes that
-- early return and always sees 42501. The oracle is closed.
--
-- The null case is deliberately NOT part of that. `auth.uid()` is null for the
-- service role, the SQL editor, psql, a seed script and a restore — and those
-- are precisely the sessions that BYPASS RLS, so the sentence above stops being
-- true for them: nothing else would reject the row. Written as
-- `new.user_id is distinct from (select auth.uid())` the guard fires for every
-- such insert, because `is distinct from` treats null as an ordinary value, and
-- the three-per-account rule the database exists to hold would simply stop
-- applying there. Hence the explicit `is not null`: no caller identity means
-- count as before.

-- 20260811140554 put this rule in the database precisely because a check in the
-- Server Action "could never be the thing that holds". Narrowing it to
-- self-inserts only would have handed that role back to the application.

create or replace function public.enforce_character_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.user_id <> (select auth.uid()) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if (select count(*) from public.characters where user_id = new.user_id) >= 3 then
    raise exception 'character_limit_reached';
  end if;

  return new;
end;
$$;

-- CREATE OR REPLACE keeps the existing ACL, but re-stating the revokes costs
-- nothing and means this file is complete on its own if it is ever the one
-- someone pastes into the SQL editor.
revoke all on function public.enforce_character_limit() from public;
revoke all on function public.enforce_character_limit() from anon;
revoke all on function public.enforce_character_limit() from authenticated;
