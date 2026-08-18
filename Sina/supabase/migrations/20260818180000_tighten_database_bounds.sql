-- Three bounds the application assumed and the database did not hold.

-- 1. The map bucket was created with nothing but `public`, so `file_size_limit`
-- and `allowed_mime_types` were null: any authenticated caller could put
-- arbitrary bytes of any type under their own uid prefix, in a public bucket.
-- MAX_MAP_BYTES and ACCEPTED_MAP_TYPES in Sina/src/rules/campaign.js were the
-- only limits in the project with no mirror down here.
--
-- One step above MAX_MAP_BYTES for the same reason serverActions.bodySizeLimit
-- sits above it on the other side: our own check should be the one that speaks.
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array[
      'image/webp',
      'image/png',
      'image/jpeg',
      'image/gif'
    ]
where id = 'campaign-maps';

-- 2. enforce_party_limit never received the caller-scope guard its two siblings
-- carry. A BEFORE ROW trigger runs before the RLS WITH CHECK, so naming someone
-- else's campaign raised `party_limit_reached` before the policy could refuse
-- the row -- an oracle for whether a stranger's party is full. Ownership rather
-- than user_id: campaign_members has no user_id, and a party is deliberately
-- made of characters the DM does not own. The `is not null` half keeps the rule
-- in force for the service role, psql and restores.
create or replace function public.enforce_party_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not public.owns_campaign(new.campaign_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 2));

  if (
    select count(*) from public.campaign_members
    where campaign_id = new.campaign_id
  ) >= 6 then
    raise exception 'party_limit_reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_party_limit() from public;
revoke all on function public.enforce_party_limit() from anon;
revoke all on function public.enforce_party_limit() from authenticated;

-- 3. search_characters guarded on `is not null`, and '' is not null: the escape
-- chain left it empty, the pattern became '%', and the function handed back ten
-- arbitrary characters. Our own parser refuses an empty query, but the function
-- is granted to `authenticated` and can be called over RPC directly.
create or replace function public.search_characters(
  name_prefix text default null,
  discriminator_prefix text default null
)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race, c.archetype, c.class_id, c.color_theme
  from public.characters c
  where
    (nullif(btrim(name_prefix), '') is not null
     or nullif(btrim(discriminator_prefix), '') is not null)
    and (
      nullif(btrim(name_prefix), '') is null
      -- The escape character is doubled first: under standard_conforming_strings
      -- a literal '\' is one backslash, so replacing it with '\' is a no-op that
      -- leaves the following % unescaped.
      or lower(c.name) like
        replace(replace(replace(lower(btrim(name_prefix)), '\', '\\'), '%', '\%'), '_', '\_')
        || '%' escape '\'
    )
    and (
      nullif(btrim(discriminator_prefix), '') is null
      or c.discriminator like
        replace(replace(replace(btrim(discriminator_prefix), '\', '\\'), '%', '\%'), '_', '\_')
        || '%' escape '\'
    )
  order by c.name, c.discriminator
  limit 10;
$$;

revoke all on function public.search_characters(text, text) from public;
revoke all on function public.search_characters(text, text) from anon;
grant execute on function public.search_characters(text, text) to authenticated;
