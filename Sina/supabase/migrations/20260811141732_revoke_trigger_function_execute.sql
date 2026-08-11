-- Supabase's database linter flagged public.enforce_character_limit() as a
-- SECURITY DEFINER function that anon and authenticated can execute: PostgREST
-- exposes every public-schema function as /rest/v1/rpc/<name>, and Postgres
-- grants EXECUTE to PUBLIC on new functions by default.
--
-- Calling it outside a trigger would fail anyway ("trigger functions can only
-- be called as triggers"), but the grant has no reason to exist.
--
-- This does not weaken the three-character limit. Postgres checks EXECUTE when
-- the trigger is *created*, not each time it fires, so characters_enforce_limit
-- keeps working exactly as before.

revoke all on function public.enforce_character_limit() from public;
revoke all on function public.enforce_character_limit() from anon;
revoke all on function public.enforce_character_limit() from authenticated;
