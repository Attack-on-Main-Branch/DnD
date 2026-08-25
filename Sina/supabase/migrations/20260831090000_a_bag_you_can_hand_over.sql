-- Containers: a bag somebody carries, and a chest the table has not found yet.
--
-- Until now a character had ONE pack and everything went in it. Two things a
-- table does all the time had nowhere to happen: handing over a whole bag
-- rather than an item at a time, and putting loot somewhere the party can see
-- it before it is theirs.
--
-- TWO HOMES FOR AN ITEM, and the line between them is the one 20260822160000
-- already drew between `campaign_items` and `character_inventory`: what exists
-- in the world against who is holding it.
--
--   container_items          in a container that NOBODY is carrying -- every
--                            chest, and a bag still on the table.
--   character_inventory      in somebody's hands. `container_id` says which bag
--                            of theirs it is in; null is the pack itself.
--
-- So assigning a bag DRAINS it into its new owner's pack rows, and taking a bag
-- back off somebody pours those rows out again. `transfer_container` is both
-- halves of that, in one transaction, and it is why a bag's contents are never
-- in two places at once.
--
-- THE STACKING KEY GROWS BY ONE COLUMN. `(character_id, item_slug)` said a
-- character holds one stack of a thing, which is exactly what a second bag
-- makes false: fifty feet of rope in the Bag of Holding and fifty in the pack
-- are two stacks, and a table would be astonished to find them added together.
-- `nulls not distinct` is what keeps the pack itself a single stack -- without
-- it two rows of `(character, 'rope', null)` would both be unique.
--
-- WHAT A CHEST IS FOR is the visibility, and it is a Dungeon Master's switch.
-- `is_revealed` and `visible_to_character_ids` are not writable by a policy:
-- `reveal_chest` and `hide_chest` are the only doors, for the reason
-- `notifications` has no INSERT policy -- "may show this to that character" is
-- a question about the caller's chair, which no `with check` can express.

-- ---------------------------------------------------------------------------
-- The containers themselves.
-- ---------------------------------------------------------------------------
--
-- One table for both kinds: they differ in a name, some contents and who may
-- see them. The CHECK at the foot keeps the two shapes honest -- a chest has no
-- owner, a bag has no audience.
--
-- `owner_character_id` is `on delete set null` and not a cascade: a character
-- deleted mid-campaign leaves their bag behind rather than taking the party's
-- loot out of the world.
create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.campaigns (id) on delete cascade,

  name text not null,

  type text not null,

  -- Whose bag it is. Null is a bag nobody has picked up, and every chest.
  owner_character_id uuid
    references public.characters (id) on delete set null,

  -- The Dungeon Master's switch, and who it is thrown for. Meaningless on a
  -- bag, and the CHECK below says so rather than leaving it to be wondered at.
  is_revealed boolean not null default false,
  visible_to_character_ids uuid[] not null default '{}',

  created_at timestamptz not null default now()
);

-- Mirrors Sina/src/rules/containers.js. `char_length` counts code points, as
-- the rules layer does -- JS `.length` counts UTF-16 units.
--
-- The last three clauses are the two shapes.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'containers_bounds_check'
  ) then
    alter table public.containers
      add constraint containers_bounds_check
      check (
        type in ('bag', 'chest')
        and char_length(btrim(name)) between 1 and 60
        and (type = 'bag' or owner_character_id is null)
        and (type = 'chest' or visible_to_character_ids = '{}'::uuid[])
        and (type = 'chest' or not is_revealed)
        and coalesce(array_length(visible_to_character_ids, 1), 0) <= 6
      );
  end if;
end;
$ck$;

-- Every read here is "this campaign's containers", and a party's worth is a
-- handful of rows -- so the campaign's own index and nothing else.
create index if not exists containers_campaign_idx
  on public.containers (campaign_id, created_at);

-- The whole old row on the wire for an update or a delete, not just the key.
-- Realtime evaluates the SELECT policy below against what it is given, and a
-- delete carrying only `id` has no `campaign_id` for that policy to read -- so
-- without this a struck-out chest would stay on every other screen until it
-- reloaded. The same reason `campaign_marks` carries it.
alter table public.containers replica identity full;

alter table public.containers enable row level security;

-- ---------------------------------------------------------------------------
-- What is inside one that nobody is carrying.
-- ---------------------------------------------------------------------------
--
-- The chest's contents, and a bag's while it is still on the table. Keyed on
-- the slug as a pack is, so stocking the same thing twice is a quantity of two.
--
-- A COPY of the catalogue entry and not a reference, for the reason
-- 20260822160000 gives.
create table if not exists public.container_items (
  id uuid primary key default gen_random_uuid(),

  container_id uuid not null
    references public.containers (id) on delete cascade,

  item_slug text not null,

  name text not null,
  category text not null default 'Equipment',
  description text not null default '',
  facts jsonb not null default '{}'::jsonb,

  quantity integer not null,

  is_custom boolean not null default false,

  created_at timestamptz not null default now(),

  unique (container_id, item_slug)
);

-- The same bounds `character_inventory` carries: contents that could not be
-- copied into a pack could never be taken out.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'container_items_bounds_check'
  ) then
    alter table public.container_items
      add constraint container_items_bounds_check
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

-- `valid_item_facts` is 20260829090000's.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'container_items_facts_check'
  ) then
    alter table public.container_items
      add constraint container_items_facts_check
      check (public.valid_item_facts(facts));
  end if;
end;
$ck$;

alter table public.container_items replica identity full;

alter table public.container_items enable row level security;

-- ---------------------------------------------------------------------------
-- Which bag a carried stack is in.
-- ---------------------------------------------------------------------------
--
-- Null is the pack itself, which is every row this schema has written until
-- now. `on delete cascade`: a bag struck out takes what is inside it with it,
-- which is what "delete the Bag of Holding" means to whoever presses it.
alter table public.character_inventory
  add column if not exists container_id uuid
  references public.containers (id) on delete cascade;

-- THE STACKING KEY, ONE COLUMN WIDER. See the head of this file.
--
-- `nulls not distinct` is the whole of what keeps the pack a single stack:
-- Postgres treats NULLs as distinct in a unique index by default, so without it
-- `(character, 'rope', null)` would be insertable any number of times and the
-- pack would silently fork. Requires Postgres 15, which is the floor for a
-- Supabase project.
--
-- The old constraint is dropped rather than left standing beside this: it is
-- strictly narrower, so every insert into a bag would fail against it.
alter table public.character_inventory
  drop constraint if exists character_inventory_character_id_item_slug_key;

create unique index if not exists character_inventory_stack_key
  on public.character_inventory (character_id, item_slug, container_id)
  nulls not distinct;

-- ---------------------------------------------------------------------------
-- Is one of my characters in this list?
-- ---------------------------------------------------------------------------
--
-- The question a chest's audience is read with. A definer, for the reason every
-- cross-table question here is one: asked inline, a policy on `containers`
-- would read `public.characters`, which is RLS-protected -- the shape that took
-- the dashboard down in 20260818160000.
--
-- Safe to expose on the same terms as that file's helpers: it filters by
-- `auth.uid()`, answers a boolean, and returns no data.
create or replace function public.my_character_among(ids uuid[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.characters c
    where c.user_id = (select auth.uid())
      and c.id = any (coalesce(ids, '{}'::uuid[]))
  );
$fn$;

revoke all on function public.my_character_among(uuid[]) from public;
revoke all on function public.my_character_among(uuid[]) from anon;
grant execute on function public.my_character_among(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- May I open this one?
-- ---------------------------------------------------------------------------
--
-- The three branches the SELECT policy below asks inline, asked ABOUT a
-- container rather than about the row in hand -- which is what
-- `container_items` needs, holding no container row of its own.
--
-- Not used by the policy on `containers` itself: that one already has the
-- columns in front of it.
create or replace function public.may_open_container(target_container uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.containers k
    where k.id = target_container
      and (
        public.owns_campaign(k.campaign_id)
        or (
          k.owner_character_id is not null
          and public.owns_character(k.owner_character_id)
        )
        or (
          k.type = 'chest'
          and k.is_revealed
          and public.my_character_among(k.visible_to_character_ids)
        )
      )
  );
$fn$;

revoke all on function public.may_open_container(uuid) from public;
revoke all on function public.may_open_container(uuid) from anon;
grant execute on function public.may_open_container(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Who sees a container, and who makes one.
-- ---------------------------------------------------------------------------
--
-- Three ways in:
--
--   the Dungeon Master        every container at their own table
--   the owner of a bag        their own, wherever it came from
--   a character shown a chest once it has been revealed to them
--
-- The last is the only place in this schema where a Dungeon Master decides what
-- a player may read, which is what makes a chest a chest.
drop policy if exists "The table reads the containers meant for it" on public.containers;
create policy "The table reads the containers meant for it"
  on public.containers for select to authenticated
  using (
    public.owns_campaign(campaign_id)
    or (
      owner_character_id is not null
      and public.owns_character(owner_character_id)
    )
    or (
      type = 'chest'
      and is_revealed
      and public.my_character_among(visible_to_character_ids)
    )
  );

drop policy if exists "DMs make containers for their own table" on public.containers;
create policy "DMs make containers for their own table"
  on public.containers for insert to authenticated
  with check (public.owns_campaign(campaign_id));

drop policy if exists "DMs strike out their own containers" on public.containers;
create policy "DMs strike out their own containers"
  on public.containers for delete to authenticated
  using (public.owns_campaign(campaign_id));

-- NO UPDATE POLICY, and it is load-bearing. `owner_character_id` and
-- `is_revealed` are deeds rather than columns, each with a transaction behind
-- it: handing a bag over MOVES its contents, revealing a chest writes a line in
-- the log. A policy would let PostgREST set either on its own, leaving a bag
-- whose owner and whose contents disagree.

-- The contents follow whoever may open the container. No write policies at all:
-- stocking is the head of the table's, taking is a chest's own function, and
-- neither is a question about a row already in hand.
drop policy if exists "Whoever may open it reads what is inside" on public.container_items;
create policy "Whoever may open it reads what is inside"
  on public.container_items for select to authenticated
  using (public.may_open_container(container_id));

-- ---------------------------------------------------------------------------
-- Twenty-four to a campaign.
-- ---------------------------------------------------------------------------
--
-- `enforce_campaign_item_limit`'s shape from 20260822160000, including the two
-- things that one learned the hard way: the advisory lock, without which two
-- requests arriving together both read the same pre-state; and `auth.uid() is
-- not null` rather than `is distinct from`, which would turn the guard off for
-- exactly the sessions that bypass RLS.
--
-- Seed 4 keeps it clear of the character (0), campaign (1), campaign-item (2)
-- and activity (3) counters.
--
-- Mirrors MAX_CAMPAIGN_CONTAINERS in Sina/src/rules/containers.js.
create or replace function public.enforce_container_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if (select auth.uid()) is not null
     and not public.owns_campaign(new.campaign_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 4));

  if (
    select count(*) from public.containers
    where campaign_id = new.campaign_id
  ) >= 24 then
    raise exception 'container_limit_reached';
  end if;

  return new;
end;
$fn$;

-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise,
-- and this one counts rows across every campaign. Nothing should be able to
-- call it except the trigger that owns it.
revoke all on function public.enforce_container_limit() from public;
revoke all on function public.enforce_container_limit() from anon;
revoke all on function public.enforce_container_limit() from authenticated;

drop trigger if exists containers_enforce_limit on public.containers;
create trigger containers_enforce_limit
  before insert on public.containers
  for each row execute function public.enforce_container_limit();

-- ---------------------------------------------------------------------------
-- Putting loot in, and taking it back out.
-- ---------------------------------------------------------------------------
--
-- The head of the table's stepper. A CHANGE and not a total: a total is
-- computed against a row that may have moved since the drawer was drawn.
--
-- SECURITY DEFINER because `container_items` has no write policy at all, so the
-- guard here IS the permission. Only `owns_campaign` gets in.
--
-- Returns what the container now holds. Zero is a stack emptied; null is a
-- refusal, which must read the same as a container that is gone.
create or replace function public.stock_container_item(
  p_container_id uuid,
  p_item_slug text,
  p_name text,
  p_desc text default '',
  p_category text default 'Equipment',
  p_facts jsonb default '{}'::jsonb,
  p_is_custom boolean default false,
  p_delta integer default 1
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid;
  v_id uuid;
  v_have integer;
  v_left integer;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 999 then
    return null;
  end if;

  if p_item_slug is null or btrim(coalesce(p_name, '')) = '' then
    return null;
  end if;

  select k.campaign_id into v_campaign
  from public.containers k
  where k.id = p_container_id;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return null;
  end if;

  if p_delta > 0 then
    insert into public.container_items
      (container_id, item_slug, name, category, description, quantity,
       is_custom, facts)
    values (
      p_container_id,
      p_item_slug,
      p_name,
      coalesce(nullif(btrim(p_category), ''), 'Equipment'),
      coalesce(p_desc, ''),
      p_delta,
      coalesce(p_is_custom, false),
      coalesce(p_facts, '{}'::jsonb)
    )
    -- `container_items.quantity` is the INSERT's own range-table alias, not a
    -- schema lookup, so it resolves under `search_path = ''`.
    on conflict (container_id, item_slug) do update
      set quantity = least(999, container_items.quantity + excluded.quantity),
          facts = case
            when excluded.facts = '{}'::jsonb then container_items.facts
            else excluded.facts
          end
    returning quantity into v_left;

    return v_left;
  end if;

  -- FOR UPDATE, so two browsers taking the last of something cannot both pass
  -- the "is there enough" test.
  select i.id, i.quantity into v_id, v_have
  from public.container_items i
  where i.container_id = p_container_id
    and i.item_slug = p_item_slug
  for update;

  if v_id is null then
    return null;
  end if;

  -- More than is there empties the stack rather than failing: a drawer left
  -- open can still ask for five of something already taken down to two.
  v_left := greatest(0, v_have + p_delta);

  if v_left = 0 then
    delete from public.container_items where id = v_id;
  else
    update public.container_items set quantity = v_left where id = v_id;
  end if;

  return v_left;
end;
$fn$;

revoke all on function public.stock_container_item(uuid, text, text, text, text, jsonb, boolean, integer) from public;
revoke all on function public.stock_container_item(uuid, text, text, text, text, jsonb, boolean, integer) from anon;
grant execute on function public.stock_container_item(uuid, text, text, text, text, jsonb, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Handing a bag over.
-- ---------------------------------------------------------------------------
--
-- The whole bag and everything in it, in ONE transaction: a bag that arrived
-- without its contents is the one outcome a table cannot reconcile.
--
-- WHICH MOVEMENTS RUN depends on where the bag was and where it is going:
--
--   held -> held     the rows change hands, keeping their `container_id`
--   table -> held    `container_items` is drained into the new owner's pack rows
--   held -> table    those rows are poured back into `container_items`
--
-- `p_seat` carries a default, so a call sending only the two keys the drawer
-- knows about still resolves here. IT IS NOT A PERMISSION: `my_seat_at_table`
-- re-asks it.
--
-- False for anything refused -- not a bag, not yours, not at this table -- and
-- a caller must not be able to tell those apart.
create or replace function public.transfer_container(
  p_container_id uuid,
  p_new_owner_id uuid,
  p_seat uuid default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid;
  v_name text;
  v_type text;
  v_owner uuid;
  v_seat uuid;
begin
  -- The container, locked: two hands on one bag must not both succeed.
  select k.campaign_id, k.name, k.type, k.owner_character_id
    into v_campaign, v_name, v_type, v_owner
  from public.containers k
  where k.id = p_container_id
  for update;

  if v_campaign is null or v_type <> 'bag' then
    return false;
  end if;

  -- Whose bag it is leaving. The head of the table may move any of them; a
  -- player may only let go of one they are already carrying.
  if not (
    public.owns_campaign(v_campaign)
    or (v_owner is not null and public.owns_character(v_owner))
  ) then
    return false;
  end if;

  -- And who is receiving it has to be sitting here. Read past RLS, which is
  -- what this function is for: the giver may know nothing about the receiver.
  if p_new_owner_id is not null and not exists (
    select 1 from public.campaign_members m
    where m.campaign_id = v_campaign
      and m.character_id = p_new_owner_id
  ) then
    return false;
  end if;

  if v_owner is not distinct from p_new_owner_id then
    return false;
  end if;

  -- The chair, DERIVED and not taken on the caller's word: otherwise a player
  -- sending no seat would have the line filed under "Dungeon Master".
  if p_seat is not null and public.my_seat_at_table(v_campaign, p_seat) then
    v_seat := p_seat;
  elsif public.owns_campaign(v_campaign) then
    v_seat := null;
  else
    v_seat := v_owner;
  end if;

  -- Nothing armed: every row below lands in `character_inventory`, whose
  -- trigger would otherwise file a pack line for each. One bag handed over is
  -- ONE sentence, written at the foot of this function.
  perform public.arm_table_log(
    null::uuid, null::uuid, null::text, null::uuid, null::uuid
  );

  -- Off the old owner: poured back onto the table when nobody is taking it,
  -- changing hands otherwise. Never in both places at once.
  if v_owner is not null then
    if p_new_owner_id is null then
      insert into public.container_items
        (container_id, item_slug, name, category, description, quantity,
         is_custom, facts)
      select p_container_id, i.item_slug, i.name, i.category, i.description,
             i.quantity, i.is_custom, i.facts
      from public.character_inventory i
      where i.container_id = p_container_id
        and i.character_id = v_owner
      on conflict (container_id, item_slug) do update
        set quantity = least(999, container_items.quantity + excluded.quantity);

      delete from public.character_inventory i
      where i.container_id = p_container_id
        and i.character_id = v_owner;
    else
      update public.character_inventory i
        set character_id = p_new_owner_id
      where i.container_id = p_container_id
        and i.character_id = v_owner;
    end if;
  end if;

  -- And onto the new one, out of whatever was sitting in the bag on the table.
  if p_new_owner_id is not null then
    insert into public.character_inventory
      (character_id, container_id, item_slug, name, category, description,
       quantity, is_custom, facts)
    select p_new_owner_id, p_container_id, i.item_slug, i.name, i.category,
           i.description, i.quantity, i.is_custom, i.facts
    from public.container_items i
    where i.container_id = p_container_id
    on conflict (character_id, item_slug, container_id) do update
      set quantity = least(999, character_inventory.quantity + excluded.quantity);

    delete from public.container_items where container_id = p_container_id;
  end if;

  update public.containers
    set owner_character_id = p_new_owner_id
    where id = p_container_id;

  -- A bag put back on the table names nobody, and a sentence with no second
  -- half is not one this log has a shape for -- so it is left unwritten.
  if p_new_owner_id is not null then
    perform public.write_table_log(
      v_campaign,
      v_seat,
      'bag_transferred',
      p_new_owner_id,
      jsonb_build_object('containerName', left(btrim(v_name), 80))
    );
  end if;

  return true;
end;
$fn$;

revoke all on function public.transfer_container(uuid, uuid, uuid) from public;
revoke all on function public.transfer_container(uuid, uuid, uuid) from anon;
grant execute on function public.transfer_container(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Showing a chest to the table.
-- ---------------------------------------------------------------------------
--
-- The head of the table's alone. The list is FILTERED AGAINST THE PARTY rather
-- than trusted: this array is the only place in the schema where one account
-- names another's characters.
--
-- Revealing to nobody is hiding, and is refused rather than written.
create or replace function public.reveal_chest(
  p_container_id uuid,
  p_visible_char_ids uuid[]
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid;
  v_name text;
  v_type text;
  v_seen uuid[];
  v_named text;
begin
  select k.campaign_id, k.name, k.type
    into v_campaign, v_name, v_type
  from public.containers k
  where k.id = p_container_id
  for update;

  if v_campaign is null or v_type <> 'chest' then
    return false;
  end if;

  if not public.owns_campaign(v_campaign) then
    return false;
  end if;

  -- Only the ones actually in this party, each of them once.
  select coalesce(array_agg(distinct m.character_id), '{}'::uuid[])
    into v_seen
  from public.campaign_members m
  where m.campaign_id = v_campaign
    and m.character_id = any (coalesce(p_visible_char_ids, '{}'::uuid[]));

  if coalesce(array_length(v_seen, 1), 0) = 0 then
    return false;
  end if;

  update public.containers
    set is_revealed = true,
        visible_to_character_ids = v_seen
    where id = p_container_id;

  -- Named only when there is one name to say. Read from `characters` here
  -- rather than taken from an argument, which is 20260823090000's rule for
  -- every second name in this log.
  if array_length(v_seen, 1) = 1 then
    select c.name into v_named
    from public.characters c
    where c.id = v_seen[1];
  end if;

  perform public.write_table_log(
    v_campaign,
    null,
    'chest_revealed',
    case when v_named is not null then v_seen[1] end,
    jsonb_build_object(
      'containerName', left(btrim(v_name), 80),
      'shown', array_length(v_seen, 1)
    )
  );

  return true;
end;
$fn$;

revoke all on function public.reveal_chest(uuid, uuid[]) from public;
revoke all on function public.reveal_chest(uuid, uuid[]) from anon;
grant execute on function public.reveal_chest(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- And putting it back in the dark.
-- ---------------------------------------------------------------------------
--
-- The other half of one toggle. The audience is KEPT rather than cleared, so a
-- chest closed and opened again is shown to the same people.
--
-- No line in the log: a chest going quiet again is the Dungeon Master changing
-- their mind, and the log is not their notebook.
create or replace function public.hide_chest(p_container_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid;
begin
  select k.campaign_id into v_campaign
  from public.containers k
  where k.id = p_container_id
    and k.type = 'chest';

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return false;
  end if;

  update public.containers
    set is_revealed = false
    where id = p_container_id;

  return true;
end;
$fn$;

revoke all on function public.hide_chest(uuid) from public;
revoke all on function public.hide_chest(uuid) from anon;
grant execute on function public.hide_chest(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Taking something out of a chest.
-- ---------------------------------------------------------------------------
--
-- Into the PACK and never into a bag: what you pull out of a chest is in your
-- hands, and stowing it is the pack drawer's business afterwards.
--
-- `p_item_id` is the row and not the slug: a slug alone would let a caller name
-- something the chest never held. The container is still checked against it.
--
-- WHO MAY TAKE IT is the whole of what makes a chest safe:
--
--   the head of the table  for anybody at it
--   a player               for their own character, and only once the chest has
--                          been revealed to that character
--
-- Returns what is LEFT in the chest. Null is a refusal, and reads the same as
-- a chest that has been struck out.
create or replace function public.take_chest_item(
  p_container_id uuid,
  p_item_id uuid,
  p_target_char_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid;
  v_type text;
  v_revealed boolean;
  v_seen uuid[];
  v_chest text;
  v_id uuid;
  v_have integer;
  v_slug text;
  v_name text;
  v_desc text;
  v_category text;
  v_custom boolean;
  v_facts jsonb;
  v_took integer;
  v_left integer;
  v_seat uuid;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 999 then
    return null;
  end if;

  select k.campaign_id, k.type, k.is_revealed, k.visible_to_character_ids,
         k.name
    into v_campaign, v_type, v_revealed, v_seen, v_chest
  from public.containers k
  where k.id = p_container_id;

  if v_campaign is null or v_type <> 'chest' or not v_revealed then
    return null;
  end if;

  -- Whose pack it is going into has to be sitting here, whoever is pressing.
  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_id = v_campaign
      and m.character_id = p_target_char_id
  ) then
    return null;
  end if;

  if not (
    public.owns_campaign(v_campaign)
    or (
      public.owns_character(p_target_char_id)
      and p_target_char_id = any (coalesce(v_seen, '{}'::uuid[]))
    )
  ) then
    return null;
  end if;

  -- FOR UPDATE, so two players reaching for the last potion cannot both pass
  -- the "is there enough" test.
  select i.id, i.quantity, i.item_slug, i.name, i.description, i.category,
         i.is_custom, i.facts
    into v_id, v_have, v_slug, v_name, v_desc, v_category, v_custom, v_facts
  from public.container_items i
  where i.id = p_item_id
    and i.container_id = p_container_id
  for update;

  if v_id is null then
    return null;
  end if;

  -- More than is in there takes what is in there rather than failing, and the
  -- log says what actually moved. A drawer left open is not an error.
  v_took := least(p_quantity, v_have);
  v_left := v_have - v_took;

  if v_took < 1 then
    return null;
  end if;

  -- The chair: the character's own where the caller owns them, the head of the
  -- table's otherwise. Nothing else is armed -- the insert below would
  -- otherwise file a second line for what is already one sentence.
  v_seat := case
    when public.my_seat_at_table(v_campaign, p_target_char_id)
      then p_target_char_id
  end;

  perform public.arm_table_log(
    null::uuid, null::uuid, null::text, null::uuid, null::uuid
  );

  if v_left = 0 then
    delete from public.container_items where id = v_id;
  else
    update public.container_items set quantity = v_left where id = v_id;
  end if;

  insert into public.character_inventory
    (character_id, container_id, item_slug, name, category, description,
     quantity, is_custom, facts)
  values (
    p_target_char_id,
    null,
    v_slug,
    v_name,
    coalesce(nullif(btrim(v_category), ''), 'Equipment'),
    coalesce(v_desc, ''),
    v_took,
    coalesce(v_custom, false),
    coalesce(v_facts, '{}'::jsonb)
  )
  on conflict (character_id, item_slug, container_id) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity);

  perform public.write_table_log(
    v_campaign,
    v_seat,
    'chest_looted',
    null,
    jsonb_build_object(
      'containerName', left(btrim(v_chest), 80),
      'itemName', left(btrim(v_name), 80),
      'quantity', v_took
    )
  );

  return v_left;
end;
$fn$;

revoke all on function public.take_chest_item(uuid, uuid, uuid, integer) from public;
revoke all on function public.take_chest_item(uuid, uuid, uuid, integer) from anon;
grant execute on function public.take_chest_item(uuid, uuid, uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Three more things the log can say.
-- ---------------------------------------------------------------------------
--
-- The whole list again rather than a patch: this constraint is dropped and
-- re-added by every file that adds to it, so this is now the one to re-run
-- after an out-of-order paste. Mirrors ACTION_TYPES in rules/activity.js.
alter table public.campaign_activity_logs
  drop constraint if exists campaign_activity_logs_kind_check;

alter table public.campaign_activity_logs
  add constraint campaign_activity_logs_kind_check
  check (
    actor_type in ('dm', 'player')
    and action_type in (
      'dice_roll',
      'secret_dice_roll',
      'hp_change',
      'level_change',
      'item_used',
      'item_dropped',
      'item_transferred',
      'item_granted',
      'item_revoked',
      'coin_spent',
      'coin_transferred',
      'coin_granted',
      'coin_revoked',
      'spell_cast',
      'chest_revealed',
      'chest_looted',
      'bag_transferred'
    )
  );

-- ---------------------------------------------------------------------------
-- The pack's own three, now aware of which bag they are reaching into.
-- ---------------------------------------------------------------------------
--
-- Each of the three below is 20260830090000's body with `p_container` threaded
-- through it and nothing else changed. The permissions, clamping, row locks,
-- arming and return values are as that file left them.
--
-- THIS IS NOW THE HIGHEST-NUMBERED FILE THAT DEFINES ALL THREE, and the one to
-- re-run after any out-of-order paste. 20260822120000, 20260829090000 and
-- 20260830090000 each `create or replace` them with an `on conflict
-- (character_id, item_slug)` that no longer matches the stacking key above, so
-- running one of those after this file leaves functions that cannot insert into
-- a bag at all.
--
-- Dropped first, because every signature GROWS: PostgREST resolves an overload
-- by the exact set of keys it is handed, so the shorter version would go on
-- answering, reaching into the pack when the caller meant a bag. The new
-- parameter carries a default, so old calls still resolve here.

-- --- Something used, dropped or taken back -----------------------------------

drop function if exists public.spend_inventory_item(uuid, text, integer, uuid, uuid, text);

create or replace function public.spend_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_quantity integer,
  p_campaign uuid default null,
  p_seat uuid default null,
  p_deed text default null,
  p_container uuid default null
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

  -- `is not distinct from` and not `=`: the pack is a NULL container.
  select i.id, i.quantity into v_id, v_have
  from public.character_inventory i
  where i.character_id = target_character
    and i.item_slug = p_item_slug
    and i.container_id is not distinct from p_container
  for update;

  if v_id is null then
    return null;
  end if;

  -- More than is there empties the stack rather than failing. The steppers
  -- never offer it, but a page left open can still ask for five of something
  -- somebody else has already spent down to two.
  v_left := greatest(0, v_have - p_quantity);

  -- The stack is the subject either way, and nobody is at the other end: using
  -- and dropping name no one, and a Dungeon Master taking something back names
  -- the pack it came out of, which is the same character.
  perform public.arm_table_log(
    p_campaign,
    p_seat,
    p_deed,
    target_character,
    case when p_deed = 'item_revoked' then target_character end
  );

  if v_left = 0 then
    delete from public.character_inventory where id = v_id;
  else
    update public.character_inventory set quantity = v_left where id = v_id;
  end if;

  return v_left;
end;
$fn$;

revoke all on function public.spend_inventory_item(uuid, text, integer, uuid, uuid, text, uuid) from public;
revoke all on function public.spend_inventory_item(uuid, text, integer, uuid, uuid, text, uuid) from anon;
grant execute on function public.spend_inventory_item(uuid, text, integer, uuid, uuid, text, uuid) to authenticated;

-- --- Something handed out ----------------------------------------------------

drop function if exists public.grant_inventory_item(
  uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text
);

create or replace function public.grant_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_name text,
  p_desc text,
  p_category text,
  p_quantity integer,
  p_is_custom boolean default false,
  p_facts jsonb default '{}'::jsonb,
  p_campaign uuid default null,
  p_seat uuid default null,
  p_deed text default null,
  p_container uuid default null
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

  -- A grant to ONE pack names that pack at both ends of the sentence. A grant
  -- to the whole party passes no deed and is written down once by its caller,
  -- because six transactions cannot add up to one sentence in here.
  perform public.arm_table_log(
    p_campaign, p_seat, p_deed, target_character, target_character
  );

  insert into public.character_inventory
    (character_id, container_id, item_slug, name, category, description,
     quantity, is_custom, facts)
  values (
    target_character,
    p_container,
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
  on conflict (character_id, item_slug, container_id) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity),
        facts = case
          when excluded.facts = '{}'::jsonb then character_inventory.facts
          else excluded.facts
        end
  returning quantity into v_quantity;

  return v_quantity;
end;
$fn$;

revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text, uuid) from public;
revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text, uuid) from anon;
grant execute on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text, uuid) to authenticated;

-- --- Something handed over ---------------------------------------------------
--
-- `p_container` is the GIVER's, and there is deliberately no second one for the
-- receiver: what is handed across a table arrives in the hand, and stowing it
-- in a bag is a separate decision the receiver makes for themselves.

drop function if exists public.transfer_inventory_item(
  uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid
);

create or replace function public.transfer_inventory_item(
  p_from_char_id uuid,
  p_to_char_id uuid,
  p_item_slug text,
  p_name text,
  p_desc text,
  p_category text,
  p_quantity integer,
  p_facts jsonb default '{}'::jsonb,
  p_campaign uuid default null,
  p_seat uuid default null,
  p_container uuid default null
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
    and i.container_id is not distinct from p_container
  for update;

  -- Not there, or not that many. Refused rather than partly moved: half a
  -- transfer is the one outcome a table cannot reconcile.
  if v_id is null or v_have < p_quantity then
    return false;
  end if;

  -- The giver's row is the sentence and the receiver's is not, which is what
  -- `p_subject` decides. Armed after the last refusal above, so a transfer that
  -- never happens leaves nothing armed for anything else in this transaction.
  perform public.arm_table_log(
    p_campaign, p_seat, 'item_transferred', p_from_char_id, p_to_char_id
  );

  if v_have = p_quantity then
    delete from public.character_inventory where id = v_id;
  else
    update public.character_inventory
      set quantity = v_have - p_quantity
      where id = v_id;
  end if;

  insert into public.character_inventory
    (character_id, container_id, item_slug, name, category, description,
     quantity, is_custom, facts)
  values (
    p_to_char_id,
    null,
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
  on conflict (character_id, item_slug, container_id) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity),
        facts = case
          when excluded.facts = '{}'::jsonb then character_inventory.facts
          else excluded.facts
        end;

  return true;
end;
$fn$;

revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid, uuid) from public;
revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid, uuid) from anon;
grant execute on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime.
-- ---------------------------------------------------------------------------
--
-- Without these in the publication a subscription connects, reports
-- SUBSCRIBED, and never delivers anything. Guarded on both sides so the file
-- stays safe to re-run.
--
-- RLS still decides what is delivered: the socket carries the subscriber's JWT,
-- so an unrevealed chest rings nobody's doorbell but the Dungeon Master's.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'containers'
    ) then
      alter publication supabase_realtime add table public.containers;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'container_items'
    ) then
      alter publication supabase_realtime add table public.container_items;
    end if;
  end if;
end;
$pub$;
