-- Three campaigns per account, enforced in the database.
--
-- The same shape as enforce_character_limit, and deliberately so — including
-- the two things that one had to learn the hard way:
--
--   1. The advisory lock. Without it two requests arriving together both read
--      the same pre-state under READ COMMITTED and both insert, and the fourth
--      campaign exists. The lock is per user and transaction-scoped, so it is
--      released whatever happens to the statement.
--
--   2. `auth.uid() is not null` rather than `is distinct from`. IS DISTINCT
--      FROM treats null as an ordinary value, so for the service role, the SQL
--      editor, psql and a restore — every session that BYPASSES RLS, and so the
--      only ones nothing else would stop — the guard would fire and the rule
--      would quietly stop applying exactly where it is the last line.
--
-- The lock seed is 1, where characters uses 0. Same user, different resource:
-- sharing a seed would have a campaign insert wait behind a character insert
-- for no reason. It costs nothing to keep them apart.
--
-- Mirrors MAX_CAMPAIGNS in Sina/src/rules/campaign.js. Changing one means
-- changing the other.

create or replace function public.enforce_campaign_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.user_id <> (select auth.uid()) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 1));

  if (select count(*) from public.campaigns where user_id = new.user_id) >= 3 then
    raise exception 'campaign_limit_reached';
  end if;

  return new;
end;
$$;

-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise,
-- and this one counts rows across every account. Nothing should be able to call
-- it except the trigger that owns it.
revoke all on function public.enforce_campaign_limit() from public;
revoke all on function public.enforce_campaign_limit() from anon;
revoke all on function public.enforce_campaign_limit() from authenticated;

drop trigger if exists campaigns_enforce_limit on public.campaigns;
create trigger campaigns_enforce_limit
  before insert on public.campaigns
  for each row execute function public.enforce_campaign_limit();
