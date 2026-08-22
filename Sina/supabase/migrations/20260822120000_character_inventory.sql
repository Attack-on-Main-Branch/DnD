-- What a character is carrying, and the three ways it moves.
--
-- Until now the pack at the table and the Inventory tab on a sheet both said
-- "the pack is empty", because there was nothing for them to read. This is that
-- table.
--
-- A stack, not a list. `(character_id, item_slug)` is unique, so a second
-- Potion of Healing is a quantity of two rather than a second row -- which is
-- what makes "give three" and "use one" arithmetic instead of bookkeeping.
--
-- The inventory belongs to the CHARACTER and not to the campaign. A character
-- can sit at more than one table and what they carry travels with them; a
-- `campaign_id` column here would have to be answered for every table they play
-- at, and would fork one rope into three ropes.

create table if not exists public.character_inventory (
  id uuid primary key default gen_random_uuid(),

  character_id uuid not null
    references public.characters (id) on delete cascade,

  -- The stacking key. `potion-of-healing` for something the SRD knows about,
  -- `custom:bag-of-rats` for homebrew -- derived from the name in
  -- Sina/src/rules/inventory.js and never chosen by the browser, or a caller
  -- could land a grant on somebody else's stack.
  item_slug text not null,

  name text not null,
  category text not null default 'Equipment',
  description text not null default '',

  quantity integer not null,

  is_custom boolean not null default false,

  created_at timestamptz not null default now(),

  unique (character_id, item_slug)
);

-- Mirrors Sina/src/rules/inventory.js. `char_length` counts code points, which
-- is what the rules layer counts too -- JS `.length` counts UTF-16 units and
-- would let an emoji-heavy name past here.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'character_inventory_bounds_check'
  ) then
    alter table public.character_inventory
      add constraint character_inventory_bounds_check
      check (
        quantity >= 0
        and quantity <= 999
        and char_length(btrim(name)) between 1 and 80
        and char_length(item_slug) between 1 and 100
        and char_length(category) <= 40
        and char_length(description) <= 500
      );
  end if;
end;
$ck$;

-- No index beyond the unique constraint's, deliberately. Every read here is
-- "this character's pack" or "these characters' packs", and `character_id` is
-- that index's leading column; a party carries dozens of rows, not thousands,
-- so an ordering index would cost every write to save nothing measurable.

-- The whole old row on the wire for an update or a delete, not just the key.
-- Realtime evaluates the SELECT policy below against what it is given, and a
-- delete carrying only `id` has no `character_id` for that policy to read -- so
-- without this the last of something used up would stay in every other browser
-- until it reloaded. The same reason `campaign_marks` carries it.
alter table public.character_inventory replica identity full;

alter table public.character_inventory enable row level security;

-- ---------------------------------------------------------------------------
-- Am I the Dungeon Master of a table this character sits at?
-- ---------------------------------------------------------------------------
--
-- A definer function, because a policy that asked this inline would be reading
-- public.campaign_members, which is itself RLS-protected -- the shape that took
-- the whole dashboard down in 20260818160000. Definer functions read past RLS,
-- so no policy is evaluated to answer them and no cycle can form.
--
-- Safe to expose for the reason the helpers in that file are: it filters by
-- `auth.uid()` internally, returns a boolean about a row the caller already
-- names, and returns no data.
--
-- NOT `character_in_my_campaign`, which asked exactly this and is gone:
-- 20260818170000 dropped it along with the policy that was its only caller. Its
-- name is not reused here on purpose -- that file still drops it, so a
-- re-created one would vanish again the next time the migrations were replayed
-- in order, taking every policy below with it.
create or replace function public.character_at_my_table(target_character uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.campaign_members m
    join public.campaigns c on c.id = m.campaign_id
    where m.character_id = target_character
      and c.user_id = (select auth.uid())
  );
$fn$;

revoke all on function public.character_at_my_table(uuid) from public;
revoke all on function public.character_at_my_table(uuid) from anon;
grant execute on function public.character_at_my_table(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Who may see a pack, and write in it.
-- ---------------------------------------------------------------------------
--
-- Its owner, and the Dungeon Master of a campaign the character is playing in.
-- Loot is handed out by whoever is running the session, which is the argument
-- 20260821160000 already made for hit points -- but unlike hit points this one
-- is a question about the row itself, so it is a policy rather than a definer
-- function's shape.
--
-- Note what this does NOT grant: one player reading another's pack. A party
-- member is in neither branch, which is why a transfer between two players goes
-- through the definer function below rather than through these.

drop policy if exists "Owners and their DM read a pack" on public.character_inventory;
create policy "Owners and their DM read a pack"
  on public.character_inventory for select to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

drop policy if exists "Owners and their DM fill a pack" on public.character_inventory;
create policy "Owners and their DM fill a pack"
  on public.character_inventory for insert to authenticated
  with check (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

drop policy if exists "Owners and their DM change a pack" on public.character_inventory;
create policy "Owners and their DM change a pack"
  on public.character_inventory for update to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  )
  with check (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

drop policy if exists "Owners and their DM empty a pack" on public.character_inventory;
create policy "Owners and their DM empty a pack"
  on public.character_inventory for delete to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

-- ---------------------------------------------------------------------------
-- Putting something in.
-- ---------------------------------------------------------------------------
--
-- SECURITY INVOKER, and that is the point: the four policies above are the
-- whole of the permission, and this function exists only for the arithmetic. A
-- PostgREST upsert can SET a quantity but cannot ADD to one, so two grants
-- landing together would each read three and each write four.
--
-- `on conflict do update` is one statement, so the read and the write are the
-- same row lock. Clamped to the column's ceiling rather than allowed to fail: a
-- Dungeon Master pressing + past 999 wants a full stack, not an error.
create or replace function public.grant_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_name text,
  p_desc text,
  p_category text,
  p_quantity integer,
  p_is_custom boolean default false
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
    (character_id, item_slug, name, category, description, quantity, is_custom)
  values (
    target_character,
    p_item_slug,
    p_name,
    coalesce(nullif(btrim(p_category), ''), 'Equipment'),
    coalesce(p_desc, ''),
    p_quantity,
    coalesce(p_is_custom, false)
  )
  -- `character_inventory.quantity` is the INSERT's own range-table alias, not a
  -- schema lookup, so it resolves under `search_path = ''` -- and it is the
  -- form the manual documents, where a schema-qualified one is not.
  on conflict (character_id, item_slug) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity)
  returning quantity into v_quantity;

  return v_quantity;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Taking something out.
-- ---------------------------------------------------------------------------
--
-- Used, dropped, or revoked by the Dungeon Master -- one function for all
-- three, because what differs between them is the sentence written in the notes
-- afterwards and not what happens to the row.
--
-- Returns what is left, so a caller can tell "three of the five" from "all
-- five". Zero means the row is gone. Null means there was nothing there, or the
-- policies refused, and a caller must not be able to tell those apart.
--
-- FOR UPDATE, so two browsers spending the last potion cannot both pass the
-- "is there enough" test. SECURITY INVOKER again: RLS is evaluated for that
-- SELECT, so a caller with no claim on this pack locks nothing and finds
-- nothing.
create or replace function public.spend_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_quantity integer
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_have integer;
  v_left integer;
begin
  if p_quantity is null or p_quantity < 1 then
    return null;
  end if;

  select i.id, i.quantity into v_id, v_have
  from public.character_inventory i
  where i.character_id = target_character
    and i.item_slug = p_item_slug
  for update;

  if v_id is null then
    return null;
  end if;

  -- More than is there empties the stack rather than failing. The steppers
  -- never offer it, but a page left open can still ask for five of something
  -- somebody else has already spent down to two.
  v_left := greatest(0, v_have - p_quantity);

  if v_left = 0 then
    delete from public.character_inventory where id = v_id;
  else
    update public.character_inventory set quantity = v_left where id = v_id;
  end if;

  return v_left;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Handing something over.
-- ---------------------------------------------------------------------------
--
-- The one write here that no policy grants and none should: it puts a row in
-- somebody else's pack. So it is SECURITY DEFINER, and its guards ARE the
-- permission -- the same trade `accept_campaign_invite` makes next door.
--
-- Four things are checked and none of them is taken on the caller's word:
--
--   1. The two characters are different, and share a campaign. A transfer is
--      something that happens at a table; without this it would be a way to
--      push items at any uuid in the database.
--   2. The caller either owns the giver, or runs a campaign the giver is in --
--      the same reach a Dungeon Master already has over the party's hit points.
--   3. The giver has that many, under a row lock.
--   4. The quantity is a quantity.
--
-- Both halves in one function body is one transaction: an item cannot leave one
-- pack without arriving in the other.
--
-- `p_name`, `p_desc` and `p_category` are what the caller believes the item to
-- be, and they stand BEHIND the giver's own row rather than in front of it. The
-- row is what must exist for there to be anything to give, and a caller free to
-- name the item is a caller who can rename the stack it lands on.
create or replace function public.transfer_inventory_item(
  p_from_char_id uuid,
  p_to_char_id uuid,
  p_item_slug text,
  p_name text,
  p_desc text,
  p_category text,
  p_quantity integer
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

  -- Whose hand the item is leaving. The same question the policies above ask,
  -- asked of the GIVER: a Dungeon Master may move what is in their party's
  -- packs, and a player may move only what is in their own.
  if not (
    public.owns_character(p_from_char_id)
    or public.character_at_my_table(p_from_char_id)
  ) then
    return false;
  end if;

  select i.id, i.quantity, i.name, i.description, i.category, i.is_custom
    into v_id, v_have, v_name, v_desc, v_category, v_custom
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
    (character_id, item_slug, name, category, description, quantity, is_custom)
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
    coalesce(v_custom, false)
  )
  on conflict (character_id, item_slug) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity);

  return true;
end;
$fn$;

revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean) from public;
revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean) from anon;
grant execute on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean) to authenticated;

revoke all on function public.spend_inventory_item(uuid, text, integer) from public;
revoke all on function public.spend_inventory_item(uuid, text, integer) from anon;
grant execute on function public.spend_inventory_item(uuid, text, integer) to authenticated;

revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer) from public;
revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer) from anon;
grant execute on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer) to authenticated;

-- Realtime. Without the table in this publication a browser subscription
-- connects, reports SUBSCRIBED, and then never delivers anything -- the hardest
-- version of this to debug. Guarded on both sides so the file stays safe to
-- re-run, and so a database without Supabase's own publication does not fail on
-- this line.
--
-- Row Level Security still decides what is delivered: the socket carries the
-- subscriber's JWT and "Owners and their DM read a pack" is evaluated against
-- it, so one player is never told what another is carrying.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'character_inventory'
     )
  then
    alter publication supabase_realtime add table public.character_inventory;
  end if;
end;
$pub$;
