-- What the table's log may now say about money.
--
-- Four entries, and they are the four things that can happen to a coin:
-- somebody spent one, somebody handed one over, the head of the table put one
-- in a purse, and the head of the table took one back out. Each is filed the
-- way its inventory counterpart is, and for the same reasons.
--
-- The denomination is a coin, checked here as it is checked in
-- `spend_currency`, and never a string the browser chose -- the payload rule at
-- the head of 20260823090000 has not moved.

-- Dropped and re-added rather than guarded on existence, exactly as
-- 20260823090000 says: this list is the one thing in that file which grows, and
-- an `if not exists` guard would leave the older, narrower version standing on
-- any database that already had one -- refusing `coin_spent` with nothing to
-- say why.
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
      'coin_revoked'
    )
  );

-- ---------------------------------------------------------------------------
-- Writing one down.
-- ---------------------------------------------------------------------------
--
-- The whole of 20260823120000's function again with a coin branch added, not a
-- patch over it: several files here `create or replace` the same function, so
-- this is now the highest-numbered one that touches it and the one to re-run
-- after any out-of-order paste.
--
-- Dropped first because the signature GROWS, for the reason that file gives:
-- two functions of one name with different arity is two doors, and PostgREST
-- resolves an overload by the exact set of keys it is handed -- so the
-- eleven-argument version would go on answering for anyone still calling it,
-- silently writing no coin.
drop function if exists public.record_campaign_activity(
  uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer
);

create or replace function public.record_campaign_activity(
  target_campaign uuid,
  actor_character uuid,
  action text,
  target_character uuid,
  item_name text,
  item_quantity integer,
  die_type text,
  roll_value integer,
  hp_delta integer,
  level_value integer,
  level_delta integer,
  coin_type text,
  coin_amount integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
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
    'dice_roll', 'secret_dice_roll', 'hp_change', 'level_change',
    'item_used', 'item_dropped', 'item_transferred',
    'item_granted', 'item_revoked',
    'coin_spent', 'coin_transferred', 'coin_granted', 'coin_revoked'
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

  -- The two halves of the purse the head of the table holds the pen over, and
  -- they are `grant_currency`'s permission written out again: coins are put in
  -- from that chair alone, and taking them back out of somebody else's purse is
  -- the same deed `item_revoked` is.
  if action in ('coin_granted', 'coin_revoked') and not head_of_table then
    return false;
  end if;

  -- A level is awarded rather than taken, which is the whole of
  -- `set_character_level`'s permission and so has to be the whole of this
  -- entry's too. `head_of_table` has already been through `my_seat_at_table`
  -- above, and for a null character that IS `owns_campaign`.
  if action = 'level_change' and not head_of_table then
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

  elsif action = 'level_change' then
    -- Bounded here as well as in Sina/src/rules/level.js, at the ends
    -- `characters_level_check` keeps.
    if level_value is null or level_value < 1 or level_value > 20
       or level_delta is null or level_delta = 0 or abs(level_delta) > 19 then
      return false;
    end if;

    -- Always named, unlike a hit-point change: the character is never the
    -- actor here, so the sentence is about them.
    select c.name into target
    from public.characters c
    join public.campaign_members m on m.character_id = c.id
    where c.id = target_character
      and m.campaign_id = target_campaign;

    if target is null then
      return false;
    end if;

    body := jsonb_build_object(
      'level', level_value,
      'delta', level_delta,
      'targetName', target
    );

  elsif action in (
    'coin_spent', 'coin_transferred', 'coin_granted', 'coin_revoked'
  ) then
    -- Bounded here as well as in Sina/src/rules/currency.js, at the ends
    -- `characters_currency_check` keeps. The denomination goes through the same
    -- `is_coin` the writes do, so the log and the purse agree on what a coin is.
    if not public.is_coin(coin_type)
       or coin_amount is null
       or coin_amount < 1
       or coin_amount > 9999999 then
      return false;
    end if;

    if action = 'coin_spent' then
      body := jsonb_build_object('coin', coin_type, 'amount', coin_amount);
    else
      if target_character is null then
        -- Only a Dungeon Master paying everybody at once, which is a grant with
        -- no single recipient. A fixed string, so there is still nothing here
        -- the caller wrote. Nothing is ever taken back from "the party": the
        -- stepper that revokes works one purse at a time.
        if action <> 'coin_granted' or not head_of_table then
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
        'coin', coin_type,
        'amount', coin_amount,
        'targetName', target
      );
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
$fn$;

revoke all on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer, text, integer) from public;
revoke all on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer, text, integer) from anon;
grant execute on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer, text, integer) to authenticated;
