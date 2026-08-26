-- "Fern rolled 14 with 3d6."
--
-- A handful of dice rather than one. The rail's field says how many the next
-- throw is, and from here the log has to be told: a total is only believable
-- against a count, and 14 is a face no d6 has and a perfectly ordinary 3d6.
--
-- The whole of 20260826120000's function again with the roll's branch widened,
-- not a patch over it: several files here `create or replace` the same
-- function, so this is now the highest-numbered one that touches it and the one
-- to re-run after any out-of-order paste.
--
-- No change to the action list, so no constraint to drop: `dice_roll` and
-- `secret_dice_roll` have been admitted since 20260823090000 and this only
-- widens what rides with them.
--
-- Dropped first because the signature GROWS, for the reason 20260823120000
-- gives: two functions of one name with different arity is two doors, and
-- PostgREST resolves an overload by the exact set of keys it is handed -- so
-- the seventeen-argument version would go on answering for anyone still calling
-- it, silently writing every handful down as one die.
drop function if exists public.record_campaign_activity(
  uuid, uuid, text, uuid, text, integer, text, integer, integer, integer,
  integer, text, integer, text, integer, text, text
);

create or replace function public.record_campaign_activity(
  target_campaign uuid,
  actor_character uuid,
  action text,
  target_character uuid,
  item_name text,
  item_quantity integer,
  die_type text,
  dice_count integer,
  roll_value integer,
  hp_delta integer,
  level_value integer,
  level_delta integer,
  coin_type text,
  coin_amount integer,
  spell_name text,
  spell_level integer,
  spell_damage text,
  spell_save text
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
  thrown integer;
  actor text;
  target text;
  item text;
  spell text;
  dice text;
  save_of text;
  count_of integer;
  body jsonb;
begin
  if action not in (
    'dice_roll', 'secret_dice_roll', 'hp_change', 'level_change',
    'item_used', 'item_dropped', 'item_transferred',
    'item_granted', 'item_revoked',
    'coin_spent', 'coin_transferred', 'coin_granted', 'coin_revoked',
    'spell_cast'
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
  -- they are `move_campaign_currency`'s permission written out again: coins are
  -- put in and taken back from that chair alone.
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

    -- How many of them. Bounded here as well as in Sina/src/rules/dice.js, at
    -- MAX_DICE_COUNT. Refused rather than clamped, unlike `parseDiceCount`:
    -- this describes a throw that has already happened, so a count the rail
    -- could not have thrown is a caller disagreeing with the board. A call from
    -- before the field existed passes none and meant one.
    thrown := coalesce(dice_count, 1);

    if thrown < 1 or thrown > 20 then
      return false;
    end if;

    if action = 'secret_dice_roll' then
      -- No `value` key in this branch and nowhere to add one. What was rolled
      -- behind the veil is not written down at all.
      body := jsonb_build_object('dieType', die_type, 'count', thrown);
    else
      -- A TOTAL, so the floor is one per die and the ceiling is all their
      -- faces: 14 is a face no d6 has and an ordinary 3d6.
      if roll_value is null
         or roll_value < thrown
         or roll_value > thrown * faces then
        return false;
      end if;

      body := jsonb_build_object(
        'value', roll_value,
        'dieType', die_type,
        'count', thrown
      );
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

  elsif action = 'spell_cast' then
    -- Bounded here as well as in Sina/src/rules/spells.js, at the ends
    -- `character_spells_bounds_check` keeps. A cantrip is level zero, so the
    -- floor is 0 and not 1 -- the one number in this function where it is.
    --
    -- `spell_level` is the level it was CAST AT and not the level it is
    -- written at: an upcast Magic Missile is a different event from the one on
    -- the page, and the shelf is the only thing that says so.
    --
    -- Nobody is named: a spell is cast AT the table rather than at a character,
    -- and this log has never recorded who was on the wrong end of anything.
    spell := btrim(coalesce(spell_name, ''));

    if char_length(spell) < 1 or char_length(spell) > 80
       or spell_level is null
       or spell_level < 0
       or spell_level > 9 then
      return false;
    end if;

    body := jsonb_build_object('spellName', spell, 'spellLevel', spell_level);

    -- What it threw and what it asked for, bounded at the two columns'
    -- own length in 20260825090000. Absent keys rather than empty strings, the
    -- way `targetName` is absent when nobody is addressed: Counterspell rolls
    -- nothing and asks for nothing, and its line should say neither.
    dice := left(btrim(coalesce(spell_damage, '')), 120);
    save_of := left(btrim(coalesce(spell_save, '')), 120);

    if dice <> '' then
      body := body || jsonb_build_object('spellDamage', dice);
    end if;

    if save_of <> '' then
      body := body || jsonb_build_object('spellSave', save_of);
    end if;

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
        -- The head of the table paying everybody at once, or taking from
        -- everybody at once. A fixed string, so there is still nothing here the
        -- caller wrote. A TRANSFER is never addressed to the party: one player
        -- hands coins to one other, and `transfer_currency` has no branch that
        -- does anything else.
        if action = 'coin_transferred' or not head_of_table then
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
        -- is a grant with no single recipient. Nothing is ever taken back from
        -- "the party": the stepper that revokes works one pack at a time, and
        -- unlike the purse next door that has not changed.
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

revoke all on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer, integer, text, integer, text, integer, text, text) from public;
revoke all on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer, integer, text, integer, text, integer, text, text) from anon;
grant execute on function public.record_campaign_activity(uuid, uuid, text, uuid, text, integer, text, integer, integer, integer, integer, integer, text, integer, text, integer, text, text) to authenticated;
