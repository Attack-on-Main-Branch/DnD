-- What the SRD says about a thing, carried into the pack.
--
-- 20260822120000 gave a carried item a name, a category and a sentence, which
-- is what a card in a grid had room for. The card is a panel now -- the one the
-- spellbook opens under the book -- and a panel that prints a spell's casting
-- time, range and duration and an item's description alone reads as though the
-- rulebook says less about a longsword than about a cantrip. It says rather
-- more: 1d8 slashing, versatile 1d10, 3 lb, 15 gp.
--
-- ONE JSONB COLUMN and not ten typed ones, which is the opposite of the choice
-- 20260828090000 made for `campaign_items` -- and deliberately.
--
-- That table is where an item is WRITTEN: a Dungeon Master types a price into a
-- box, so the price is a column with a CHECK on it. This one is where an item is
-- CARRIED, and every one of these fields arrives already composed from an
-- external index, is only ever read back whole to be printed, and is never
-- filtered, summed or sorted on. A document is what that is. It also keeps the
-- two RPCs below to one new argument each rather than ten.

alter table public.character_inventory
  add column if not exists facts jsonb not null default '{}'::jsonb;

-- A function because a CHECK constraint may not contain a subquery, and any
-- honest test of a jsonb object's entries is one. IMMUTABLE so the constraint
-- can call it. The bounds mirror `readItemFacts` in Sina/src/rules/inventory.js.
create or replace function public.valid_item_facts(facts jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select facts is not null
     and jsonb_typeof(facts) = 'object'
     and not exists (
       select 1
       from jsonb_each(facts) as entry(name, value)
       where char_length(entry.name) > 20
          or jsonb_typeof(entry.value) not in ('string', 'boolean')
          or char_length(entry.value #>> '{}') > 60
     );
$fn$;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'character_inventory_facts_check'
  ) then
    alter table public.character_inventory
      add constraint character_inventory_facts_check
      check (public.valid_item_facts(facts));
  end if;
end;
$ck$;

revoke all on function public.valid_item_facts(jsonb) from public;
revoke all on function public.valid_item_facts(jsonb) from anon;

-- ---------------------------------------------------------------------------
-- Putting something in.
-- ---------------------------------------------------------------------------
--
-- The whole of 20260822120000's function again with the facts carried through,
-- not a patch over it: this is now the highest-numbered file that touches it and
-- the one to re-run after any out-of-order paste.
--
-- Dropped first because the signature GROWS: two functions of one name with
-- different arity is two doors, and PostgREST resolves an overload by the exact
-- set of keys it is handed -- so the seven-argument version would go on
-- answering for anyone still calling it, silently writing no facts.
--
-- SECURITY INVOKER, and that is still the point: the policies in 20260822120000
-- are the whole permission, and this exists only for the arithmetic a PostgREST
-- upsert cannot do.
--
-- `on conflict` REFRESHES the facts rather than leaving the stack's first
-- copy's. A row written before this migration carries `{}`, and the next grant
-- of it should fill that in.
drop function if exists public.grant_inventory_item(
  uuid, text, text, text, text, integer, boolean
);

create or replace function public.grant_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_name text,
  p_desc text,
  p_category text,
  p_quantity integer,
  p_is_custom boolean default false,
  p_facts jsonb default '{}'::jsonb
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $fn$
declare
  v_quantity integer;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 999 then
    return null;
  end if;

  insert into public.character_inventory
    (character_id, item_slug, name, category, description, quantity,
     is_custom, facts)
  values (
    target_character,
    p_item_slug,
    p_name,
    coalesce(nullif(btrim(p_category), ''), 'Equipment'),
    coalesce(p_desc, ''),
    p_quantity,
    coalesce(p_is_custom, false),
    coalesce(p_facts, '{}'::jsonb)
  )
  -- `character_inventory.quantity` is the INSERT's own range-table alias, not a
  -- schema lookup, so it resolves under `search_path = ''` -- and it is the
  -- form the manual documents, where a schema-qualified one is not.
  on conflict (character_id, item_slug) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity),
        facts = case
          when excluded.facts = '{}'::jsonb then character_inventory.facts
          else excluded.facts
        end
  returning quantity into v_quantity;

  return v_quantity;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Handing something over.
-- ---------------------------------------------------------------------------
--
-- The whole of 20260822120000's function again with the facts carried through.
-- SECURITY DEFINER, and its guards ARE the permission: it puts a row in
-- somebody else's pack, which no policy grants and none should.
--
-- The facts stand BEHIND the giver's own row exactly as the name, the category
-- and the description do -- the row is what must exist for there to be anything
-- to give, and a caller free to describe the item is a caller who can rewrite
-- the stack it lands on.
drop function if exists public.transfer_inventory_item(
  uuid, uuid, text, text, text, text, integer
);

create or replace function public.transfer_inventory_item(
  p_from_char_id uuid,
  p_to_char_id uuid,
  p_item_slug text,
  p_name text,
  p_desc text,
  p_category text,
  p_quantity integer,
  p_facts jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_have integer;
  v_name text;
  v_desc text;
  v_category text;
  v_custom boolean;
  v_facts jsonb;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 999 then
    return false;
  end if;

  if p_from_char_id is null
     or p_to_char_id is null
     or p_from_char_id = p_to_char_id then
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

  -- Whose hand the item is leaving. A Dungeon Master may move what is in their
  -- party's packs, and a player only what is in their own.
  if not (
    public.owns_character(p_from_char_id)
    or public.character_at_my_table(p_from_char_id)
  ) then
    return false;
  end if;

  select i.id, i.quantity, i.name, i.description, i.category, i.is_custom,
         i.facts
    into v_id, v_have, v_name, v_desc, v_category, v_custom, v_facts
  from public.character_inventory i
  where i.character_id = p_from_char_id
    and i.item_slug = p_item_slug
  for update;

  -- Not there, or not that many. Refused rather than partly moved: half a
  -- transfer is the one outcome a table cannot reconcile.
  if v_id is null or v_have < p_quantity then
    return false;
  end if;

  if v_have = p_quantity then
    delete from public.character_inventory where id = v_id;
  else
    update public.character_inventory
      set quantity = v_have - p_quantity
      where id = v_id;
  end if;

  insert into public.character_inventory
    (character_id, item_slug, name, category, description, quantity,
     is_custom, facts)
  values (
    p_to_char_id,
    p_item_slug,
    coalesce(nullif(btrim(v_name), ''), p_name),
    coalesce(
      nullif(btrim(v_category), ''),
      nullif(btrim(p_category), ''),
      'Equipment'
    ),
    coalesce(nullif(v_desc, ''), p_desc, ''),
    p_quantity,
    coalesce(v_custom, false),
    coalesce(nullif(v_facts, '{}'::jsonb), p_facts, '{}'::jsonb)
  )
  on conflict (character_id, item_slug) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity),
        facts = case
          when excluded.facts = '{}'::jsonb then character_inventory.facts
          else excluded.facts
        end;

  return true;
end;
$fn$;

revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb) from public;
revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb) from anon;
grant execute on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb) to authenticated;

revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb) from public;
revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb) from anon;
grant execute on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb) to authenticated;
