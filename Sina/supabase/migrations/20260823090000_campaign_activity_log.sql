-- What the table has just seen happen: the last ten things, in order.
--
-- A table, unlike the dice in 20260822090000_table_rolls.sql, and the reason is
-- the opposite of that file's. A roll is worth watching for the two seconds it
-- is in the air; a LOG is worth reading by somebody who looked away, or who sat
-- down a minute late, and neither of those is served by a broadcast nobody
-- kept. So this is written down -- and then, ten entries later, forgotten.
--
-- Ten and no more, enforced by the trigger at the foot of this file rather than
-- by whoever reads it. A log with no ceiling is a table that grows for as long
-- as a campaign is played, and nothing in this app would ever delete from it.
--
-- NOTHING IN THE PAYLOAD COMES FROM THE BROWSER. `record_campaign_activity`
-- takes typed arguments and BUILDS the jsonb itself, so the column can only
-- ever hold a shape this file wrote. That is what makes the secret roll safe:
-- there is no branch in which a value is put into a `secret_dice_roll` payload,
-- so a kept number cannot reach the log even if a caller sends one.
--
-- The actor is derived too. A player asking to be written down as "Dungeon
-- Master" is the obvious abuse of a log everybody reads, and the name below
-- comes from `characters` or from the fixed string, never from an argument.

create table if not exists public.campaign_activity_logs (
  id uuid primary key default gen_random_uuid(),

  campaign_id uuid not null
    references public.campaigns (id) on delete cascade,

  -- A copy, not a reference. A character who leaves the party -- or is deleted
  -- outright -- does not unsay what they did while they were here, and the
  -- entry is gone within ten actions anyway.
  actor_name text not null,
  actor_type text not null,

  action_type text not null,

  payload jsonb not null,

  created_at timestamptz not null default now()
);

-- Dropped and re-added rather than guarded on existence, which is how the rest
-- of this schema adds a constraint. The list below is the one thing here that
-- grows, and an `if not exists` guard would leave an older, narrower version of
-- it standing on any database that already had one -- refusing an action this
-- file admits, with nothing to say why.
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
      'item_used',
      'item_dropped',
      'item_transferred',
      'item_granted',
      'item_revoked'
    )
  );

-- Mirrors ACTION_TYPES and MAX_ACTOR_NAME_LENGTH in Sina/src/rules/activity.js.
-- `char_length` counts code points, which is what the rules layer counts too.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'campaign_activity_logs_actor_check'
  ) then
    alter table public.campaign_activity_logs
      add constraint campaign_activity_logs_actor_check
      check (char_length(btrim(actor_name)) between 1 and 80);
  end if;
end;
$ck$;

-- The read and the purge ask the same question in the same order, which is the
-- whole of this table's traffic. Unlike `character_inventory` next door, this
-- one is written on every roll and read newest-first, so the ordering index
-- pays for itself.
create index if not exists campaign_activity_logs_recent_idx
  on public.campaign_activity_logs (campaign_id, created_at desc, id desc);

-- The whole old row on the wire for a delete, not just the key. Realtime
-- evaluates the SELECT policy below against what it is given, and the purge
-- trigger deletes on every eleventh entry -- so without this the oldest row
-- would stay on every other screen until it reloaded. The same reason
-- `campaign_marks` carries it.
alter table public.campaign_activity_logs replica identity full;

alter table public.campaign_activity_logs enable row level security;

-- Everyone at the table reads the whole log -- that is what a log is for. The
-- two definer helpers from 20260818160000 ask the question `campaign_marks` and
-- the presence channel ask, so a chair at this table means the same thing
-- everywhere it is asked about.
drop policy if exists "The table reads its own log" on public.campaign_activity_logs;
create policy "The table reads its own log"
  on public.campaign_activity_logs for select to authenticated
  using (
    public.owns_campaign(campaign_id)
    or public.my_character_in_campaign(campaign_id)
  );

-- No INSERT, UPDATE or DELETE policy, deliberately -- the same shape
-- `notifications` and `campaign_marks` have. A policy grants whole rows, and
-- "may write this entry" is a question about which chair the caller is in and
-- what they are claiming to have done, which no `with check` can express.

-- ---------------------------------------------------------------------------
-- Writing one down.
-- ---------------------------------------------------------------------------
--
-- Typed arguments rather than a jsonb the caller composed, for the reason at
-- the head of this file. Everything is re-derived or re-checked here: the
-- actor's name, the target's name, the die's faces, the bounds on a quantity.
--
-- `false` rather than an exception for anything refused, the way
-- `place_campaign_mark` answers. A log entry is a side effect of something that
-- has already happened, and failing to write one must never fail the roll, the
-- hit point or the hand-over it describes.
--
-- EVERY entry is filed under the seat that did it -- `actor_character`, null for
-- the head of the table -- and `my_seat_at_table` is what says the caller is
-- actually in that chair.
--
-- `target_character` is the second name in the sentence, and it means a
-- different thing per action: whose bar moved, or whose pack the item went into
-- or came out of. Where it is set the name is read from `characters` here, so
-- "to Frieren" is never a string the browser chose.
--
-- A hit-point entry therefore needs a second permission on top of the seat --
-- being in a chair does not let you write down damage to somebody else's
-- character -- and it is exactly the rule `set_character_health` runs on in
-- 20260821160000: the character's owner, or the Dungeon Master of the campaign
-- that character is playing in.
create or replace function public.record_campaign_activity(
  target_campaign uuid,
  actor_character uuid,
  action text,
  target_character uuid,
  item_name text,
  item_quantity integer,
  die_type text,
  roll_value integer,
  hp_delta integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  head_of_table boolean := actor_character is null;
  faces integer;
  actor text;
  target text;
  item text;
  count_of integer;
  body jsonb;
begin
  if action not in (
    'dice_roll', 'secret_dice_roll', 'hp_change',
    'item_used', 'item_dropped', 'item_transferred',
    'item_granted', 'item_revoked'
  ) then
    return false;
  end if;

  -- The chair, first and for everything.
  if not public.my_seat_at_table(target_campaign, actor_character) then
    return false;
  end if;

  -- And then the pen over the bar this entry is about. See the note above.
  if action = 'hp_change'
     and (
       target_character is null
       or not (
         public.owns_character(target_character)
         or (
           public.owns_campaign(target_campaign)
           and exists (
             select 1 from public.campaign_members m
             where m.campaign_id = target_campaign
               and m.character_id = target_character
           )
         )
       )
     ) then
    return false;
  end if;

  -- Taking something back out of a pack is the head of the table's alone: it is
  -- the one movement here that empties somebody else's without their asking.
  if action = 'item_revoked' and not head_of_table then
    return false;
  end if;

  -- The veil is the head of the table's alone, exactly as the dice rail is:
  -- a player has no switch to keep a roll back with, so a player claiming a
  -- kept roll is a claim about a control they do not have.
  if action = 'secret_dice_roll' and not head_of_table then
    return false;
  end if;

  -- The name, from the row rather than from the caller. A character deleted
  -- between the deed and this call leaves nothing to file the entry under.
  if head_of_table then
    actor := 'Dungeon Master';
  else
    select c.name into actor
    from public.characters c
    where c.id = actor_character;

    if actor is null then
      return false;
    end if;
  end if;

  if action in ('dice_roll', 'secret_dice_roll') then
    faces := case die_type
      when 'd4' then 4
      when 'd6' then 6
      when 'd8' then 8
      when 'd10' then 10
      when 'd12' then 12
      when 'd20' then 20
      when 'd100' then 100
    end;

    if faces is null then
      return false;
    end if;

    if action = 'secret_dice_roll' then
      -- No `value` key in this branch and nowhere to add one. What was rolled
      -- behind the veil is not written down at all.
      body := jsonb_build_object('dieType', die_type);
    else
      if roll_value is null or roll_value < 1 or roll_value > faces then
        return false;
      end if;

      body := jsonb_build_object('value', roll_value, 'dieType', die_type);
    end if;

  elsif action = 'hp_change' then
    -- A change, never a total -- the log says what happened, and the bar
    -- beside it already says where that left them. Zero is not an event.
    if hp_delta is null or hp_delta = 0 or abs(hp_delta) > 100 then
      return false;
    end if;

    select c.name into target
    from public.characters c
    join public.campaign_members m on m.character_id = c.id
    where c.id = target_character
      and m.campaign_id = target_campaign;

    if target is null then
      return false;
    end if;

    -- Somebody moving their OWN bar names nobody: "Frieren lost 10 HP" reads as
    -- one event, and "Frieren dealt 10 HP to Frieren" reads as a bug. The
    -- absent key is what Maria's copy branches on.
    if actor_character is not distinct from target_character then
      body := jsonb_build_object('delta', hp_delta);
    else
      body := jsonb_build_object('delta', hp_delta, 'targetName', target);
    end if;

  else
    -- Bounded here as well as in Sina/src/rules/inventory.js, which is the run
    -- that bound the write this entry describes.
    item := btrim(coalesce(item_name, ''));
    count_of := item_quantity;

    if char_length(item) < 1 or char_length(item) > 80
       or count_of is null or count_of < 1 or count_of > 999 then
      return false;
    end if;

    if action in ('item_transferred', 'item_granted', 'item_revoked') then
      if target_character is null then
        -- Only a Dungeon Master handing something to everyone at once, which
        -- is a grant with no single recipient. A fixed string, so there is
        -- still nothing here the caller wrote. Nothing is ever taken back from
        -- "the party": the stepper that revokes works one pack at a time.
        if action <> 'item_granted' or not head_of_table then
          return false;
        end if;

        target := 'the party';
      else
        select c.name into target
        from public.characters c
        join public.campaign_members m on m.character_id = c.id
        where c.id = target_character
          and m.campaign_id = target_campaign;

        if target is null then
          return false;
        end if;
      end if;

      body := jsonb_build_object(
        'itemName', item,
        'quantity', count_of,
        'targetName', target
      );
    else
      body := jsonb_build_object('itemName', item, 'quantity', count_of);
    end if;
  end if;

  insert into public.campaign_activity_logs (
    campaign_id, actor_name, actor_type, action_type, payload
  )
  values (
    target_campaign,
    left(actor, 80),
    case when head_of_table then 'dm' else 'player' end,
    action,
    body
  );

  return true;
end;
$$;

revoke all on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer) from public;
revoke all on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer) from anon;
grant execute on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Forgetting the eleventh.
-- ---------------------------------------------------------------------------
--
-- The ceiling, kept by the table itself rather than by whoever writes to it.
-- AFTER INSERT, so the row that has just arrived is counted among the ten it is
-- keeping.
--
-- The advisory lock is `enforce_campaign_item_limit`'s, for the same reason and
-- with the same care: under READ COMMITTED two entries arriving together each
-- read a pre-state without the other, and both decide the same row is the
-- eleventh -- leaving eleven. Seed 3 keeps it clear of the character (0),
-- campaign (1) and campaign-item (2) counters, which are keyed on ids that
-- would otherwise collide by coincidence of hashing.
--
-- `created_at desc, id desc` and not `created_at` alone: `now()` is the
-- transaction's clock, so two entries written in one transaction tie exactly,
-- and a `limit 10` over a tie is a coin toss about which one survives.
--
-- Mirrors MAX_ACTIVITY_ENTRIES in Sina/src/rules/activity.js. Changing one
-- means changing both.
create or replace function public.purge_campaign_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.campaign_id::text, 3));

  -- The delete takes no alias, and `keep` is the only one in here. `old` and
  -- `new` are PL/pgSQL's own records inside a trigger function, so an alias by
  -- either name is read as the record and not as the table: `old` is unassigned
  -- on an INSERT, and the whole entry failed with "record old is not assigned
  -- yet" — the row silently never written and the log always empty.
  delete from public.campaign_activity_logs
  where campaign_id = new.campaign_id
    and id not in (
      select keep.id
      from public.campaign_activity_logs keep
      where keep.campaign_id = new.campaign_id
      order by keep.created_at desc, keep.id desc
      limit 10
    );

  return null;
end;
$$;

-- A SECURITY DEFINER function is executable by PUBLIC unless told otherwise,
-- and this one deletes rows across every campaign. Nothing may call it except
-- the trigger that owns it.
revoke all on function public.purge_campaign_activity() from public;
revoke all on function public.purge_campaign_activity() from anon;
revoke all on function public.purge_campaign_activity() from authenticated;

drop trigger if exists campaign_activity_logs_purge on public.campaign_activity_logs;
create trigger campaign_activity_logs_purge
  after insert on public.campaign_activity_logs
  for each row execute function public.purge_campaign_activity();

-- Realtime, so an entry lands on every screen at the table rather than on the
-- writer's alone -- the point of a shared log. Guarded on both sides so the
-- file stays safe to re-run, and so a database without Supabase's own
-- publication does not fail on this line. The SELECT policy above is what
-- decides who is told.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaign_activity_logs'
     )
  then
    alter publication supabase_realtime add table public.campaign_activity_logs;
  end if;
end;
$pub$;
