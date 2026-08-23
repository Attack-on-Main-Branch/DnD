-- What a character has in their purse, and the four ways a coin moves.
--
-- Five columns on `characters` rather than a table of their own. A purse is not
-- a stack the way `character_inventory` is -- there are exactly five
-- denominations, none of them is ever named by the user, and none is ever
-- absent -- so a row per coin would be five rows that always exist, joined on
-- every read to answer a question the character's own row can answer.
--
-- The coins belong to the CHARACTER and not to the campaign, for the reason
-- 20260822120000 gives about the pack: a character can sit at more than one
-- table and what they carry travels with them.
--
-- NOTHING WRITES THESE COLUMNS DIRECTLY. `characters` has no UPDATE policy at
-- all in this schema, deliberately -- RLS grants rows and never columns, so the
-- narrowest policy that would let a Dungeon Master add a gold piece would also
-- let them rewrite the name, the handle and the ability scores. Every write
-- below is therefore a SECURITY DEFINER function whose guards ARE the
-- permission, which is the trade `set_character_health` and
-- `set_character_level` already make.
--
-- Who may do what, and it is not symmetrical:
--
--   * Adding coins is the head of the table's alone. A player who could grant
--     to their own purse has no purse worth having.
--   * Taking them out is the owner's or their Dungeon Master's, which is
--     exactly the reach `spend_inventory_item` already has over a pack.
--   * Moving them between two purses is neither of those -- it writes into
--     somebody else's row -- so it carries `transfer_inventory_item`'s guards.

-- Mirrors MAX_COINS in Sina/src/rules/currency.js. Well inside int4, and with
-- room above it for the sums `grant_party_currency` adds.
alter table public.characters add column if not exists cp integer not null default 0;
alter table public.characters add column if not exists sp integer not null default 0;
alter table public.characters add column if not exists ep integer not null default 0;
alter table public.characters add column if not exists gp integer not null default 0;
alter table public.characters add column if not exists pp integer not null default 0;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_currency_check'
  ) then
    alter table public.characters
      add constraint characters_currency_check
      check (
        cp between 0 and 9999999
        and sp between 0 and 9999999
        and ep between 0 and 9999999
        and gp between 0 and 9999999
        and pp between 0 and 9999999
      );
  end if;
end;
$ck$;

-- ---------------------------------------------------------------------------
-- Reading the party's purses.
-- ---------------------------------------------------------------------------
--
-- A definer function whose return type is the boundary, which is the shape
-- `campaign_party` and `search_characters` are already written in: a SELECT
-- policy wide enough to let a Dungeon Master read a player's coins would hand
-- them that player's `user_id`, backstory and ability scores with it.
--
-- Who is in it is exactly who may read a PACK -- the character's owner, and the
-- Dungeon Master of a table they sit at. One player does not read another's
-- purse, the same way one player does not read another's pack.
create or replace function public.campaign_purses(target_campaign uuid)
returns table (
  character_id uuid,
  cp integer,
  sp integer,
  ep integer,
  gp integer,
  pp integer
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select c.id, c.cp, c.sp, c.ep, c.gp, c.pp
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.owns_character(c.id)
    )
  order by m.added_at;
$fn$;

revoke all on function public.campaign_purses(uuid) from public;
revoke all on function public.campaign_purses(uuid) from anon;
grant execute on function public.campaign_purses(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Which column a denomination names.
-- ---------------------------------------------------------------------------
--
-- The four writes below all have to turn 'gp' into a column, and none of them
-- may do it by building a string: `execute format(...)` over an argument is the
-- one shape in this schema that would let a caller choose a column. So the
-- denomination is checked here and applied as a CASE there, in SQL that cannot
-- be read as anything else.
--
-- Mirrors COIN_TYPES in Sina/src/rules/currency.js.
create or replace function public.is_coin(p_currency_type text)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select p_currency_type in ('cp', 'sp', 'ep', 'gp', 'pp');
$fn$;

revoke all on function public.is_coin(text) from public;
revoke all on function public.is_coin(text) from anon;
grant execute on function public.is_coin(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Taking coins out.
-- ---------------------------------------------------------------------------
--
-- Spent by the player, or taken back by the Dungeon Master: one function for
-- both, because what differs between them is the sentence written in the log
-- afterwards and not what happens to the row. `spend_inventory_item` is written
-- on the same argument.
--
-- Returns what is LEFT, so a caller can tell "five of the twelve" from "all
-- twelve". Null means refused, or no such character, and a caller must not be
-- able to tell those apart.
--
-- REFUSED rather than clamped when the purse is short, which is where this
-- parts company with `spend_inventory_item`. A pack's stepper never offers more
-- than is there, so emptying the stack was the kinder reading of a stale page;
-- a purse is spent from a field somebody typed a number into, and quietly
-- taking everything they had is not what "spend 500" asked for.
--
-- FOR UPDATE, so two browsers spending the last of it cannot both pass the
-- "is there enough" test.
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
  v_left integer;
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

  if v_have is null or v_have < p_amount then
    return null;
  end if;

  v_left := v_have - p_amount;

  update public.characters
    set cp = case when p_currency_type = 'cp' then v_left else cp end,
        sp = case when p_currency_type = 'sp' then v_left else sp end,
        ep = case when p_currency_type = 'ep' then v_left else ep end,
        gp = case when p_currency_type = 'gp' then v_left else gp end,
        pp = case when p_currency_type = 'pp' then v_left else pp end
    where id = p_char_id;

  return v_left;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Putting coins in.
-- ---------------------------------------------------------------------------
--
-- The head of the table's alone, and scoped by campaign for the reason
-- `set_character_level` is: a character can sit at more than one table, so "is
-- a Dungeon Master" is not the question, and the membership is re-checked here
-- rather than trusted from the caller.
--
-- Clamped to the column's ceiling rather than allowed to fail, the way
-- `grant_inventory_item` is: pressing + past the top means a full purse, not an
-- error. Returns the new balance, or null when refused.
create or replace function public.grant_currency(
  target_character uuid,
  p_currency_type text,
  p_amount integer,
  target_campaign uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_now integer;
begin
  if p_amount is null or p_amount < 1 or p_amount > 9999999 then
    return null;
  end if;

  if target_character is null or not public.is_coin(p_currency_type) then
    return null;
  end if;

  if not (
    public.owns_campaign(target_campaign)
    and exists (
      select 1 from public.campaign_members m
      where m.campaign_id = target_campaign
        and m.character_id = target_character
    )
  ) then
    return null;
  end if;

  update public.characters
    set cp = case when p_currency_type = 'cp' then least(9999999, cp + p_amount) else cp end,
        sp = case when p_currency_type = 'sp' then least(9999999, sp + p_amount) else sp end,
        ep = case when p_currency_type = 'ep' then least(9999999, ep + p_amount) else ep end,
        gp = case when p_currency_type = 'gp' then least(9999999, gp + p_amount) else gp end,
        pp = case when p_currency_type = 'pp' then least(9999999, pp + p_amount) else pp end
    where id = target_character
    returning case p_currency_type
      when 'cp' then cp
      when 'sp' then sp
      when 'ep' then ep
      when 'gp' then gp
      when 'pp' then pp
    end
    into v_now;

  return v_now;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- The whole party at once.
-- ---------------------------------------------------------------------------
--
-- A hoard divided at the table and then handed round. Five denominations in one
-- call, because that is how a hoard is written down: "120 gp, 40 sp and a
-- platinum piece" is one moment at a table, and five round trips would be five
-- chances for one to land and the rest not to.
--
-- One UPDATE over the whole party, so it is one transaction -- either everybody
-- is paid or nobody is. That is where this parts company with `grantPackItems`,
-- which deliberately does not roll six packs back: an item is granted per
-- character, and a hoard is divided once.
--
-- DUPLICATES rather than splits, exactly as "give to everyone" does with a
-- torch. A Dungeon Master saying "50 gp each" means each.
--
-- Returns how many purses were credited, so the drawer can say so. Null is a
-- refusal; zero is an empty party, which is not one.
create or replace function public.grant_party_currency(
  p_campaign_id uuid,
  p_cp integer,
  p_sp integer,
  p_ep integer,
  p_gp integer,
  p_pp integer
)
returns integer
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
  v_paid integer;
begin
  if least(v_cp, v_sp, v_ep, v_gp, v_pp) < 0
     or greatest(v_cp, v_sp, v_ep, v_gp, v_pp) > 9999999 then
    return null;
  end if;

  -- Nothing in every column is not a grant. Refused rather than counted, so an
  -- empty banner cannot write "granted 0 gp to the party" into the log.
  if v_cp + v_sp + v_ep + v_gp + v_pp = 0 then
    return null;
  end if;

  if not public.owns_campaign(p_campaign_id) then
    return null;
  end if;

  with paid as (
    update public.characters c
      set cp = least(9999999, c.cp + v_cp),
          sp = least(9999999, c.sp + v_sp),
          ep = least(9999999, c.ep + v_ep),
          gp = least(9999999, c.gp + v_gp),
          pp = least(9999999, c.pp + v_pp)
      where c.id in (
        select m.character_id
        from public.campaign_members m
        where m.campaign_id = p_campaign_id
      )
      returning c.id
  )
  select count(*) from paid into v_paid;

  return v_paid;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Handing coins over.
-- ---------------------------------------------------------------------------
--
-- The write that no policy grants and none should: it adds to somebody else's
-- row. Its guards are the permission, and they are `transfer_inventory_item`'s
-- word for word --
--
--   1. Two different characters, sitting at the same table. Without this it is
--      a way to push coins at any uuid in the database.
--   2. The caller either owns the giver, or runs a table the giver sits at.
--   3. The giver has that many, under a row lock.
--   4. The amount is an amount, and the denomination is one of five.
--
-- Both halves in one function body is one transaction: a coin cannot leave one
-- purse without arriving in the other.
--
-- The two rows are locked in a fixed order -- by id -- and NOT in the order
-- they were named. Two players paying each other at the same moment would
-- otherwise each hold the row the other is waiting for, which Postgres resolves
-- by killing one of them with a deadlock error.
create or replace function public.transfer_currency(
  p_from_char_id uuid,
  p_to_char_id uuid,
  p_currency_type text,
  p_amount integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_have integer;
  v_first uuid := least(p_from_char_id, p_to_char_id);
  v_second uuid := greatest(p_from_char_id, p_to_char_id);
begin
  if p_amount is null or p_amount < 1 or p_amount > 9999999 then
    return false;
  end if;

  if p_from_char_id is null
     or p_to_char_id is null
     or p_from_char_id = p_to_char_id
     or not public.is_coin(p_currency_type) then
    return false;
  end if;

  -- Sitting at the same table. Read past RLS, which is what this function is
  -- for: the giver may know nothing at all about the receiver's memberships.
  if not exists (
    select 1
    from public.campaign_members mine
    join public.campaign_members theirs
      on theirs.campaign_id = mine.campaign_id
    where mine.character_id = p_from_char_id
      and theirs.character_id = p_to_char_id
  ) then
    return false;
  end if;

  -- Whose hand the coins are leaving. The same question the pack asks: a
  -- Dungeon Master may move what their party is carrying, a player only their
  -- own.
  if not (
    public.owns_character(p_from_char_id)
    or public.character_at_my_table(p_from_char_id)
  ) then
    return false;
  end if;

  -- Both rows, in id order, before either is read. Two statements rather than
  -- one `in (...) order by ... for update`: the order rows are LOCKED in that
  -- shape is the plan's, not the ORDER BY's, and the whole point of the order
  -- is that it is guaranteed.
  --
  -- `found` after each is what says the row is still there: a character deleted
  -- between the page rendering and this call leaves one of the two.
  perform 1 from public.characters where id = v_first for update;

  if not found then
    return false;
  end if;

  perform 1 from public.characters where id = v_second for update;

  if not found then
    return false;
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
  where c.id = p_from_char_id;

  -- Not that many. Refused rather than partly moved: half a transfer is the one
  -- outcome a table cannot reconcile.
  if v_have is null or v_have < p_amount then
    return false;
  end if;

  update public.characters
    set cp = case when p_currency_type = 'cp' then cp - p_amount else cp end,
        sp = case when p_currency_type = 'sp' then sp - p_amount else sp end,
        ep = case when p_currency_type = 'ep' then ep - p_amount else ep end,
        gp = case when p_currency_type = 'gp' then gp - p_amount else gp end,
        pp = case when p_currency_type = 'pp' then pp - p_amount else pp end
    where id = p_from_char_id;

  update public.characters
    set cp = case when p_currency_type = 'cp' then least(9999999, cp + p_amount) else cp end,
        sp = case when p_currency_type = 'sp' then least(9999999, sp + p_amount) else sp end,
        ep = case when p_currency_type = 'ep' then least(9999999, ep + p_amount) else ep end,
        gp = case when p_currency_type = 'gp' then least(9999999, gp + p_amount) else gp end,
        pp = case when p_currency_type = 'pp' then least(9999999, pp + p_amount) else pp end
    where id = p_to_char_id;

  return true;
end;
$fn$;

revoke all on function public.spend_currency(uuid, text, integer) from public;
revoke all on function public.spend_currency(uuid, text, integer) from anon;
grant execute on function public.spend_currency(uuid, text, integer) to authenticated;

revoke all on function public.grant_currency(uuid, text, integer, uuid) from public;
revoke all on function public.grant_currency(uuid, text, integer, uuid) from anon;
grant execute on function public.grant_currency(uuid, text, integer, uuid) to authenticated;

revoke all on function public.grant_party_currency(uuid, integer, integer, integer, integer, integer) from public;
revoke all on function public.grant_party_currency(uuid, integer, integer, integer, integer, integer) from anon;
grant execute on function public.grant_party_currency(uuid, integer, integer, integer, integer, integer) to authenticated;

revoke all on function public.transfer_currency(uuid, uuid, text, integer) from public;
revoke all on function public.transfer_currency(uuid, uuid, text, integer) from anon;
grant execute on function public.transfer_currency(uuid, uuid, text, integer) to authenticated;

-- Realtime, so a purse that moved lands on the screen of whoever it belongs to
-- rather than on the screen of whoever moved it. Guarded on both sides so the
-- file stays safe to re-run, and so a database without Supabase's own
-- publication does not fail on this line.
--
-- WHAT THIS DOES NOT DO, and the drawer depends on knowing it: `characters` has
-- one SELECT policy and it is "Users read their own characters", so Realtime
-- delivers a coin change to the character's OWNER and to nobody else -- a
-- Dungeon Master watching the party is told nothing by it. That is the same
-- wall `campaign_party` exists to stand in for, and the table's wire carries it
-- the other way, exactly as it already carries hit points and levels.
--
-- No `replica identity full` beside it, unlike `character_inventory`: that is
-- for DELETEs, whose old row would otherwise reach Realtime without the columns
-- its policy reads. A purse is never deleted -- the character is, and the rail
-- hears about that through `campaign_members`.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'characters'
     )
  then
    alter publication supabase_realtime add table public.characters;
  end if;
end;
$pub$;
