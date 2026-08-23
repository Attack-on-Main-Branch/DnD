-- The Dungeon Master's pen over the party's purses, reduced to one door.
--
-- 20260823160000 gave them two: `grant_currency` for a single character and
-- `grant_party_currency` for everybody, and no way at all to take coins off the
-- whole table. The drawer above them has become one control -- five amounts
-- typed into five capsules, then Grant or Take -- so the functions become one
-- too, and both of the old ones are dropped at the foot of this file rather
-- than left standing for nothing to call.
--
-- WHAT CHANGED IN THE MEANING, and it is the point of this file:
--
--   * A move is FIVE denominations at once. That is how a hoard is written
--     down, and it is now also how it is taken back.
--   * A move is CLAMPED, never refused, at both ends -- the ceiling on the way
--     up and zero on the way down. A Dungeon Master typing 9999 into a purse
--     holding 3 means "empty it", and refusing the whole press because one
--     player in six is poor is not something a table would do.
--   * A move REPORTS WHAT IT ACTUALLY MOVED, per character. The log says what
--     happened, so it has to be told the difference rather than the request:
--     "took 3 GP from Frieren" is true and "took 9999 GP from Frieren" is not.
--
-- `spend_currency` below is brought onto the same footing for the same reason.
-- 20260823160000 argued it should refuse a short purse, because the amount came
-- from a field somebody typed into; the answer to that turns out to be
-- reporting the difference, which lets the log stay honest without making a
-- stale page an error.

-- ---------------------------------------------------------------------------
-- Coins in, or coins out, for one purse or for all of them.
-- ---------------------------------------------------------------------------
--
-- The head of the table's alone, and scoped by campaign for the reason
-- `set_character_level` is: a character can sit at more than one table, so "is
-- a Dungeon Master" is not the question, and the membership is re-checked here
-- rather than trusted from the caller.
--
-- `p_character` null is the whole party. One UPDATE over all of them, so it is
-- one transaction: either everybody is paid or nobody is. That is where this
-- parts company with handing out an ITEM, which deliberately does not roll six
-- packs back -- an item is granted per character, and a hoard is divided once.
--
-- DUPLICATES rather than splits, exactly as "give to everyone" does with a
-- torch. A Dungeon Master saying "50 gp each" means each.
--
-- Returns one row per purse touched, carrying WHAT MOVED and not what was
-- asked for. No rows at all means nothing moved: an empty party, or a caller
-- this campaign is not theirs. The drawer knows which of those it is, because
-- it knows whether it drew any names.
create or replace function public.move_campaign_currency(
  p_campaign_id uuid,
  p_character uuid,
  p_cp integer,
  p_sp integer,
  p_ep integer,
  p_gp integer,
  p_pp integer,
  p_take boolean
)
returns table (
  character_id uuid,
  cp integer,
  sp integer,
  ep integer,
  gp integer,
  pp integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_cp integer := coalesce(p_cp, 0);
  v_sp integer := coalesce(p_sp, 0);
  v_ep integer := coalesce(p_ep, 0);
  v_gp integer := coalesce(p_gp, 0);
  v_pp integer := coalesce(p_pp, 0);
  v_take boolean := coalesce(p_take, false);
begin
  if least(v_cp, v_sp, v_ep, v_gp, v_pp) < 0
     or greatest(v_cp, v_sp, v_ep, v_gp, v_pp) > 9999999 then
    return;
  end if;

  -- Nothing in every column is not a move. Refused rather than counted, so an
  -- empty row of capsules cannot write "granted 0 gp to the party" into the log.
  if v_cp + v_sp + v_ep + v_gp + v_pp = 0 then
    return;
  end if;

  if not public.owns_campaign(p_campaign_id) then
    return;
  end if;

  return query
  with before as (
    -- What each purse held on the way in, kept only so the difference can be
    -- reported. The UPDATE below does NOT read its new values from here --
    -- see the note on it.
    select c.id, c.cp, c.sp, c.ep, c.gp, c.pp
    from public.characters c
    join public.campaign_members m on m.character_id = c.id
    where m.campaign_id = p_campaign_id
      and (p_character is null or c.id = p_character)
  ),
  moved as (
    /* Every new value is computed from `c.<column>` and never from `before`.
       Postgres re-evaluates a SET expression against the latest row version
       when a concurrent update forces a retry under READ COMMITTED, so reading
       the row here is what keeps two moves landing together from both writing
       the same total -- which reading the snapshot would not. */
    update public.characters c
      set cp = case when v_take then greatest(0, c.cp - v_cp)
                    else least(9999999, c.cp + v_cp) end,
          sp = case when v_take then greatest(0, c.sp - v_sp)
                    else least(9999999, c.sp + v_sp) end,
          ep = case when v_take then greatest(0, c.ep - v_ep)
                    else least(9999999, c.ep + v_ep) end,
          gp = case when v_take then greatest(0, c.gp - v_gp)
                    else least(9999999, c.gp + v_gp) end,
          pp = case when v_take then greatest(0, c.pp - v_pp)
                    else least(9999999, c.pp + v_pp) end
      where c.id in (select b.id from before b)
      returning c.id, c.cp, c.sp, c.ep, c.gp, c.pp
  )
  select m.id,
         abs(m.cp - b.cp),
         abs(m.sp - b.sp),
         abs(m.ep - b.ep),
         abs(m.gp - b.gp),
         abs(m.pp - b.pp)
  from moved m
  join before b on b.id = m.id;
end;
$fn$;

revoke all on function public.move_campaign_currency(uuid, uuid, integer, integer, integer, integer, integer, boolean) from public;
revoke all on function public.move_campaign_currency(uuid, uuid, integer, integer, integer, integer, integer, boolean) from anon;
grant execute on function public.move_campaign_currency(uuid, uuid, integer, integer, integer, integer, integer, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Coins spent.
-- ---------------------------------------------------------------------------
--
-- The player's own door, and now the only one that takes a single denomination:
-- a purse is spent one coin at a time from a capsule that was opened to do it,
-- where a Dungeon Master moves five at once.
--
-- Returns WHAT LEFT THE PURSE rather than what remains in it, which is the
-- change from 20260823160000 -- the log is written from this number, and it has
-- to be the difference. Zero is a purse that was already empty; null is a
-- refusal, or no such character, and a caller must not be able to tell those
-- apart.
--
-- Clamped rather than refused, unlike the version this replaces. See the note
-- at the head of the file.
--
-- FOR UPDATE, so two browsers spending the last of it cannot both pass the
-- "how much is there" test.
create or replace function public.spend_currency(
  p_char_id uuid,
  p_currency_type text,
  p_amount integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_have integer;
  v_taken integer;
begin
  if p_amount is null or p_amount < 1 or p_amount > 9999999 then
    return null;
  end if;

  if p_char_id is null or not public.is_coin(p_currency_type) then
    return null;
  end if;

  -- The same reach a Dungeon Master already has over the party's packs and
  -- their hit points. A player has it over their own character alone.
  if not (
    public.owns_character(p_char_id)
    or public.character_at_my_table(p_char_id)
  ) then
    return null;
  end if;

  select case p_currency_type
    when 'cp' then c.cp
    when 'sp' then c.sp
    when 'ep' then c.ep
    when 'gp' then c.gp
    when 'pp' then c.pp
  end
  into v_have
  from public.characters c
  where c.id = p_char_id
  for update;

  if v_have is null then
    return null;
  end if;

  v_taken := least(p_amount, v_have);

  if v_taken = 0 then
    return 0;
  end if;

  update public.characters
    set cp = case when p_currency_type = 'cp' then v_have - v_taken else cp end,
        sp = case when p_currency_type = 'sp' then v_have - v_taken else sp end,
        ep = case when p_currency_type = 'ep' then v_have - v_taken else ep end,
        gp = case when p_currency_type = 'gp' then v_have - v_taken else gp end,
        pp = case when p_currency_type = 'pp' then v_have - v_taken else pp end
    where id = p_char_id;

  return v_taken;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- The two doors that are now one.
-- ---------------------------------------------------------------------------
--
-- Dropped rather than left standing. An unused SECURITY DEFINER function is a
-- door with nothing behind it that PostgREST still answers for, and
-- `grant_currency` in particular was the one place a single denomination could
-- be added to a single purse -- a reach nothing in the app has any more.
drop function if exists public.grant_currency(uuid, text, integer, uuid);
drop function if exists public.grant_party_currency(uuid, integer, integer, integer, integer, integer);
