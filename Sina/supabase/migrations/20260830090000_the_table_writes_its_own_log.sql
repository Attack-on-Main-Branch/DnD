-- The table writes its own log.
--
-- Every line used to cost a second round trip: one Server Action for the deed,
-- another for `record_campaign_activity`, each with its own auth call in front
-- of it. Now the deed writes the line. Three triggers -- on
-- `characters.current_hp`, `characters.level` and `character_inventory` -- read
-- the change out of OLD and NEW and file the entry inside the same transaction.
-- Half the round trips go, and the entry can no longer disagree with the deed:
-- there is no number passed alongside the write for a caller to get wrong.
--
-- WHAT A TRIGGER CANNOT KNOW is which table this happened at and which chair did
-- it -- `characters` has no campaign, and a character sits at more than one. So
-- the writing functions ARM the trigger first, with `arm_table_log` below, and
-- the arming is transaction-local: `set_config(..., true)` is rolled back when
-- the transaction ends, and PostgREST gives every request one of its own. A
-- write from anywhere else -- the character sheet's editor -- arms nothing and
-- leaves no line, which is right: a note in the log happened AT A TABLE.
--
-- `record_campaign_activity` is unchanged and stays: the dice, the purse, the
-- spellbook and a grant to the whole party each describe something no single row
-- change can be read back from. What both paths share is 20260823090000's rule
-- -- the actor's name comes from `characters`, never from an argument, and the
-- payload is built here rather than composed by a caller -- and
-- `write_table_log` is that rule for the trigger half.
--
-- FAILING TO WRITE IT DOWN MUST NEVER FAIL THE DEED. That was free when the
-- entry was a second call; riding in the deed's own transaction, it is bought by
-- `write_table_log`'s exception block.

-- ---------------------------------------------------------------------------
-- Arming the trigger.
-- ---------------------------------------------------------------------------
--
-- Five transaction-local settings, and the seat is checked before any is
-- written -- `my_seat_at_table`, the same question `record_campaign_activity`
-- asks, so the two paths admit the same people.
--
-- `grimoire.seat` holds the empty string for the head of the table rather than a
-- NULL: `current_setting` cannot tell "set to null" from "never set", and never
-- set is the case that must leave no line at all.
--
-- `p_deed` is the pack's alone, because a row moving in `character_inventory`
-- looks the same whether it was used, dropped, handed over or taken back.
-- `p_subject` is WHOSE row change is the entry: a transfer moves two rows and is
-- one sentence, so the trigger logs the giver's -- see `log_pack_change`.
--
-- Granted to `authenticated` because SECURITY INVOKER callers need it, which is
-- safe: it verifies the chair itself, and settings armed without a write in the
-- same transaction are rolled back having done nothing.
create or replace function public.arm_table_log(
  p_campaign uuid,
  p_seat uuid,
  p_deed text,
  p_subject uuid,
  p_target uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
begin
  -- Disarmed first, so a caller that passes no campaign cannot inherit a
  -- context from anything else in this transaction.
  perform set_config('grimoire.campaign', '', true);
  perform set_config('grimoire.deed', '', true);

  if p_campaign is null then
    return;
  end if;

  -- The chair, exactly as `record_campaign_activity` asks it. Somebody with no
  -- seat here writes their row -- the policies decide that, not this -- and
  -- leaves no line.
  if not public.my_seat_at_table(p_campaign, p_seat) then
    return;
  end if;

  -- Taking something back out of a pack is the head of the table's alone, as
  -- `record_campaign_activity` has said since 20260823090000. THE SAME RULE HAS
  -- TO STAND ON THIS DOOR: PostgREST is reachable directly with the anon key, so
  -- without it a player owning two characters here could spend from their own
  -- second pack and have the log say they took it from somebody.
  if p_deed = 'item_revoked' and p_seat is not null then
    return;
  end if;

  perform set_config('grimoire.campaign', p_campaign::text, true);
  perform set_config('grimoire.seat', coalesce(p_seat::text, ''), true);
  perform set_config('grimoire.deed', coalesce(p_deed, ''), true);
  perform set_config('grimoire.subject', coalesce(p_subject::text, ''), true);
  perform set_config('grimoire.target', coalesce(p_target::text, ''), true);
end;
$fn$;

revoke all on function public.arm_table_log(uuid, uuid, text, uuid, uuid) from public;
revoke all on function public.arm_table_log(uuid, uuid, text, uuid, uuid) from anon;
grant execute on function public.arm_table_log(uuid, uuid, text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reading one setting back.
-- ---------------------------------------------------------------------------
--
-- The empty string and an unset name both come back as NULL, and a value that is
-- not a uuid comes back as NULL rather than raising -- the same shape
-- `at_this_table` uses in 20260822090000, and for the same reason: a trigger
-- that throws takes the deed down with it.
create or replace function public.armed_uuid(p_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_raw text;
begin
  v_raw := nullif(current_setting(p_name, true), '');

  if v_raw is null then
    return null;
  end if;

  return v_raw::uuid;
exception
  when others then
    return null;
end;
$fn$;

revoke all on function public.armed_uuid(text) from public;
revoke all on function public.armed_uuid(text) from anon;
revoke all on function public.armed_uuid(text) from authenticated;

-- ---------------------------------------------------------------------------
-- Writing one down.
-- ---------------------------------------------------------------------------
--
-- The trigger half of 20260823090000's rule, in one place. The actor's name is
-- read from `characters` or is the fixed string, and `targetName` is read
-- through `campaign_members` -- so "to Frieren" is never a string that arrived
-- from anywhere.
--
-- The target is named only when it is somebody OTHER than the chair that acted:
-- "Frieren lost 10 HP" is one event and "Frieren dealt 10 HP to Frieren" is a
-- bug, and the absent key is what `readActivity` branches on.
--
-- Revoked from every role: a SECURITY DEFINER function is executable by PUBLIC
-- unless told otherwise, and this one inserts into a table with no INSERT policy
-- at all. Only the three triggers below may call it.
create or replace function public.write_table_log(
  p_campaign uuid,
  p_seat uuid,
  p_action text,
  p_target uuid,
  p_body jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  head_of_table boolean := p_seat is null;
  actor text;
  target text;
  body jsonb := p_body;
begin
  if head_of_table then
    actor := 'Dungeon Master';
  else
    select c.name into actor
    from public.characters c
    where c.id = p_seat;

    -- A character deleted between the deed and this line leaves nothing to
    -- file the entry under.
    if actor is null then
      return;
    end if;
  end if;

  if p_target is not null and p_target is distinct from p_seat then
    select c.name into target
    from public.characters c
    join public.campaign_members m on m.character_id = c.id
    where c.id = p_target
      and m.campaign_id = p_campaign;

    if target is null then
      return;
    end if;

    body := body || jsonb_build_object('targetName', target);
  end if;

  insert into public.campaign_activity_logs (
    campaign_id, actor_name, actor_type, action_type, payload
  )
  values (
    p_campaign,
    left(actor, 80),
    case when head_of_table then 'dm' else 'player' end,
    p_action,
    body
  );
exception
  -- The entry rides in the deed's own transaction now, so this block is the
  -- whole of what keeps a log that cannot be written from failing the hit point
  -- it was going to describe. Swallowed rather than raised, deliberately.
  when others then
    return;
end;
$fn$;

revoke all on function public.write_table_log(uuid, uuid, text, uuid, jsonb) from public;
revoke all on function public.write_table_log(uuid, uuid, text, uuid, jsonb) from anon;
revoke all on function public.write_table_log(uuid, uuid, text, uuid, jsonb) from authenticated;

-- ---------------------------------------------------------------------------
-- A bar that moved.
-- ---------------------------------------------------------------------------
--
-- The delta is the difference between the two rows rather than a number the
-- caller sent, which is the whole point of moving this into the database: ten
-- damage against seven hit points is a change of seven. Bounded here at the same
-- 100 `record_campaign_activity` uses, rather than trusting arithmetic
-- elsewhere to keep the payload's CHECK.
create or replace function public.log_health_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
  v_delta integer;
begin
  -- Nothing armed this: a sheet's own editor, or a migration. Not a table.
  if v_campaign is null then
    return null;
  end if;

  v_delta := new.current_hp - old.current_hp;

  if v_delta = 0 or abs(v_delta) > 100 then
    return null;
  end if;

  perform public.write_table_log(
    v_campaign,
    public.armed_uuid('grimoire.seat'),
    'hp_change',
    new.id,
    jsonb_build_object('delta', v_delta)
  );

  return null;
end;
$fn$;

revoke all on function public.log_health_change() from public;
revoke all on function public.log_health_change() from anon;
revoke all on function public.log_health_change() from authenticated;

-- ---------------------------------------------------------------------------
-- A level awarded.
-- ---------------------------------------------------------------------------
--
-- Where the ring landed and which way it went, both read off the row. This is
-- what the old two-call shape was worst at: the level was written before the
-- entry describing it, so two quick presses both read back whatever the second
-- wrote and the log said "to 6" twice. `old.level` cannot be raced.
--
-- The target is always named: a level is only ever changed from the head of the
-- table, so the character is never the chair that acted.
create or replace function public.log_level_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
  v_delta integer;
begin
  if v_campaign is null then
    return null;
  end if;

  v_delta := new.level - old.level;

  if v_delta = 0 or abs(v_delta) > 19 or new.level < 1 or new.level > 20 then
    return null;
  end if;

  perform public.write_table_log(
    v_campaign,
    public.armed_uuid('grimoire.seat'),
    'level_change',
    new.id,
    jsonb_build_object('level', new.level, 'delta', v_delta)
  );

  return null;
end;
$fn$;

revoke all on function public.log_level_change() from public;
revoke all on function public.log_level_change() from anon;
revoke all on function public.log_level_change() from authenticated;

-- ---------------------------------------------------------------------------
-- A stack that moved.
-- ---------------------------------------------------------------------------
--
-- Four deeds and one row change: using, dropping and taking back all look like a
-- quantity going down, so which it was has to be named in `grimoire.deed`.
--
-- ONE ENTRY PER TRANSFER, not two. `grimoire.subject` is whose row change the
-- sentence is about, and the receiving row is not it; the deed is then disarmed,
-- so a subject whose pack is written twice in one transaction still leaves one
-- line.
--
-- A grant to the WHOLE party arms nothing: it is six transactions and one
-- sentence, so `grantPackItems` files its own entry as before.
create or replace function public.log_pack_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_campaign uuid := public.armed_uuid('grimoire.campaign');
  v_deed text := nullif(current_setting('grimoire.deed', true), '');
  v_subject uuid := public.armed_uuid('grimoire.subject');
  v_character uuid;
  v_name text;
  v_moved integer;
  v_up boolean;
begin
  if v_campaign is null or v_deed is null then
    return null;
  end if;

  if v_deed not in (
    'item_used', 'item_dropped', 'item_transferred',
    'item_granted', 'item_revoked'
  ) then
    return null;
  end if;

  -- `old` is unassigned on an INSERT and `new` on a DELETE, and naming either
  -- outside its own branch is the error 20260823090000 records having hit:
  -- "record old is not assigned yet", with the entry silently never written.
  -- `v_up` is read in the branches for the same reason: it is the one question
  -- about the row that needs both records to answer.
  if tg_op = 'INSERT' then
    v_character := new.character_id;
    v_name := new.name;
    v_moved := new.quantity;
    v_up := true;
  elsif tg_op = 'DELETE' then
    v_character := old.character_id;
    v_name := old.name;
    v_moved := old.quantity;
    v_up := false;
  else
    v_character := new.character_id;
    v_name := new.name;
    v_moved := abs(new.quantity - old.quantity);
    v_up := new.quantity > old.quantity;
  end if;

  -- Somebody else's half of a hand-over. The sentence is the giver's.
  if v_subject is null or v_character is distinct from v_subject then
    return null;
  end if;

  -- And the deed has to agree with the direction the row actually went. The
  -- name is the caller's word for what they were doing; this is the row's, and
  -- where the two disagree the row wins by leaving no line at all. Without it
  -- a stack going down could be written up as a grant.
  if (v_deed = 'item_granted') <> v_up then
    return null;
  end if;

  -- Bounded as `record_campaign_activity` bounds the same payload.
  if v_moved is null or v_moved < 1 or v_moved > 999
     or char_length(btrim(coalesce(v_name, ''))) not between 1 and 80 then
    return null;
  end if;

  -- One line per deed, whatever else this transaction goes on to move.
  perform set_config('grimoire.deed', '', true);

  perform public.write_table_log(
    v_campaign,
    public.armed_uuid('grimoire.seat'),
    v_deed,
    public.armed_uuid('grimoire.target'),
    jsonb_build_object('itemName', btrim(v_name), 'quantity', v_moved)
  );

  return null;
end;
$fn$;

revoke all on function public.log_pack_change() from public;
revoke all on function public.log_pack_change() from anon;
revoke all on function public.log_pack_change() from authenticated;

-- ---------------------------------------------------------------------------
-- The triggers themselves.
-- ---------------------------------------------------------------------------
--
-- `after update of <column>` fires when the column is NAMED in the SET list even
-- where the value did not move, so the `when` clause is not tidiness:
-- `update_character` writes the whole sheet, and a save that touched nothing
-- would otherwise put "gained 0 HP" in front of the table.
--
-- AFTER, not BEFORE: the log gets no vote on whether the row lands.
drop trigger if exists characters_log_health on public.characters;
create trigger characters_log_health
  after update of current_hp on public.characters
  for each row
  when (old.current_hp is distinct from new.current_hp)
  execute function public.log_health_change();

drop trigger if exists characters_log_level on public.characters;
create trigger characters_log_level
  after update of level on public.characters
  for each row
  when (old.level is distinct from new.level)
  execute function public.log_level_change();

drop trigger if exists character_inventory_log on public.character_inventory;
create trigger character_inventory_log
  after insert or update or delete on public.character_inventory
  for each row
  execute function public.log_pack_change();

-- ---------------------------------------------------------------------------
-- The writes, now carrying the table with them.
-- ---------------------------------------------------------------------------
--
-- Each of the five below is its own previous body with an `arm_table_log` in
-- front of it and nothing else changed -- except the hit points, which take a
-- CHANGE now and are renamed for it. The permissions, clamping, row locks and
-- return values are as the highest-numbered file that defined them left them:
--
--   set_character_health   20260824160000_editing_the_sheet.sql
--   set_character_level    20260823120000_dm_sets_party_level.sql
--   spend_inventory_item   20260822120000_character_inventory.sql
--   grant_inventory_item   20260829090000_what_the_srd_says_about_a_thing.sql
--   transfer_inventory_item  20260829090000_what_the_srd_says_about_a_thing.sql
--
-- Dropped first, because every signature GROWS. Two functions of one name with
-- different arity is two doors, and PostgREST resolves an overload by the exact
-- set of keys it is handed -- so the shorter version would go on answering for
-- anybody still calling it, arming nothing. The new parameters carry defaults,
-- so a call sending only the old keys still resolves here.
--
-- An unarmed call is a write with no log, not a write that is refused: the same
-- latitude the old shape had, and what lets the sheet's editor go on using
-- these.

-- --- Hit points -------------------------------------------------------------
--
-- A CHANGE, WHERE 20260821140000 TOOK A TOTAL, and the rename is the point:
-- "seven damage" and "put them on thirteen" are only the same sentence when
-- nothing else has touched the bar since it was read.
--
-- Something else does, all the time. The bar is the one number here that two
-- chairs move at once -- the Dungeon Master calling damage while the player
-- drinks a potion -- and a total posted a round trip later undoes whatever
-- landed in between.
--
-- `c.current_hp` is read in the SET expression and nowhere else, which is what
-- makes two of these land: Postgres re-evaluates it against the latest row
-- version when a concurrent update forces a retry under READ COMMITTED. Same
-- reason `move_campaign_currency` computes from `c.<col>` in 20260824090000.
--
-- Clamped at both ends against the row's OWN ceiling, so ten damage against
-- seven hit points is a change of seven and the entry says seven.
--
-- The old name is dropped in both shapes -- the three-argument one this schema
-- has had since 20260821160000, and a four-argument one an earlier draft of THIS
-- file created -- so no second door is left open.

drop function if exists public.set_character_health(uuid, integer, uuid);
drop function if exists public.set_character_health(uuid, integer, uuid, uuid);

create or replace function public.change_character_health(
  target_character uuid,
  hp_delta integer,
  target_campaign uuid,
  acting_seat uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  clamped integer;
  permitted boolean;
begin
  if hp_delta is null or abs(hp_delta) > 100 then
    return null;
  end if;

  select
    public.owns_character(target_character)
    or (
      public.owns_campaign(target_campaign)
      and exists (
        select 1 from public.campaign_members m
        where m.campaign_id = target_campaign
          and m.character_id = target_character
      )
    )
  into permitted;

  if not permitted then
    return null;
  end if;

  -- After the guard and before the write. The chair is checked again inside,
  -- against `auth.uid()`, so a seat named here is not a permission.
  perform public.arm_table_log(
    target_campaign, acting_seat, null, target_character, target_character
  );

  -- No row is a character deleted between the press and this call, which reads
  -- back as null exactly as a refusal does. A caller must not tell them apart.
  update public.characters c
    set current_hp = least(c.max_hp, greatest(0, c.current_hp + hp_delta))
    where c.id = target_character
    returning c.current_hp into clamped;

  return clamped;
end;
$fn$;

revoke all on function public.change_character_health(uuid, integer, uuid, uuid) from public;
revoke all on function public.change_character_health(uuid, integer, uuid, uuid) from anon;
grant execute on function public.change_character_health(uuid, integer, uuid, uuid) to authenticated;

-- --- Levels -----------------------------------------------------------------

drop function if exists public.set_character_level(uuid, integer, uuid);

create or replace function public.set_character_level(
  target_character uuid,
  new_level integer,
  target_campaign uuid,
  acting_seat uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  -- Mirrors `characters_level_check` in 20260811144707 and MIN_LEVEL/MAX_LEVEL
  -- in Sina/src/rules/level.js. Clamped rather than refused: the arrows that
  -- produce it work over this exact range.
  clamped integer := least(20, greatest(1, new_level));
begin
  if new_level is null then
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

  perform public.arm_table_log(
    target_campaign, acting_seat, null, target_character, target_character
  );

  update public.characters
    set level = clamped
    where id = target_character;

  return clamped;
end;
$fn$;

revoke all on function public.set_character_level(uuid, integer, uuid, uuid) from public;
revoke all on function public.set_character_level(uuid, integer, uuid, uuid) from anon;
grant execute on function public.set_character_level(uuid, integer, uuid, uuid) to authenticated;

-- --- Something used, dropped or taken back -----------------------------------

drop function if exists public.spend_inventory_item(uuid, text, integer);

create or replace function public.spend_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_quantity integer,
  p_campaign uuid default null,
  p_seat uuid default null,
  p_deed text default null
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

revoke all on function public.spend_inventory_item(uuid, text, integer, uuid, uuid, text) from public;
revoke all on function public.spend_inventory_item(uuid, text, integer, uuid, uuid, text) from anon;
grant execute on function public.spend_inventory_item(uuid, text, integer, uuid, uuid, text) to authenticated;

-- --- Something handed out ----------------------------------------------------

drop function if exists public.grant_inventory_item(
  uuid, text, text, text, text, integer, boolean, jsonb
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
  p_deed text default null
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

revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text) from public;
revoke all on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text) from anon;
grant execute on function public.grant_inventory_item(uuid, text, text, text, text, integer, boolean, jsonb, uuid, uuid, text) to authenticated;

-- --- Something handed over ---------------------------------------------------

drop function if exists public.transfer_inventory_item(
  uuid, uuid, text, text, text, text, integer, jsonb
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
  p_seat uuid default null
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

revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid) from public;
revoke all on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid) from anon;
grant execute on function public.transfer_inventory_item(uuid, uuid, text, text, text, text, integer, jsonb, uuid, uuid) to authenticated;
