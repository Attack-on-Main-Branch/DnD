-- A face of your own, and the colour your dice come up in.
--
-- Two things a character gains here. `avatar_url` is a portrait, uploaded and
-- kept in a bucket of its own; `dice_color` is the twelve-swatch choice that
-- used to dress an initialled disc and now dresses the dice that character
-- throws at the table.
--
-- `color_theme` is not dropped and not written by hand any more. A trigger
-- mirrors it off `dice_color`, so the name it used to go by can never disagree
-- with the name it goes by now, and a deploy rolled back to the release before
-- this one still finds every colour where it left it.

-- ---------------------------------------------------------------------------
-- 1. The two columns.
-- ---------------------------------------------------------------------------

alter table public.characters
  add column if not exists avatar_url text,
  add column if not exists dice_color text;

-- Backfilled from the column it grew out of, so nobody's colour moves on the
-- day this lands. Idempotent, and safe against a table that already has both.
update public.characters
set dice_color = color_theme
where dice_color is null;

alter table public.characters
  alter column dice_color set default 'rose',
  alter column dice_color set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_dice_color_check'
  ) then
    alter table public.characters
      add constraint characters_dice_color_check check (dice_color in (
        'rose', 'orange', 'amber', 'lime', 'emerald', 'teal',
        'cyan', 'sky', 'blue', 'violet', 'fuchsia', 'pink'
      ));
  end if;

  -- A URL, and a bounded one: the column is written from a path this app
  -- builds, and nothing about that shape reaches four hundred characters.
  if not exists (
    select 1 from pg_constraint where conname = 'characters_avatar_url_check'
  ) then
    alter table public.characters
      add constraint characters_avatar_url_check
        check (avatar_url is null or char_length(avatar_url) between 1 and 400);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. `color_theme`, kept in step.
-- ---------------------------------------------------------------------------
--
-- The shape `characters_sync_max_hp` is written in: a derived column is the
-- database's to hold, so no caller has two places to get one choice right.
-- Narrowed to the column it copies, and not `security definer` — it touches
-- nothing but `new`. The revokes below are 20260811141732's reasoning.

create or replace function public.characters_mirror_dice_color()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.color_theme := new.dice_color;
  return new;
end;
$$;

revoke all on function public.characters_mirror_dice_color() from public;
revoke all on function public.characters_mirror_dice_color() from anon;
revoke all on function public.characters_mirror_dice_color() from authenticated;

drop trigger if exists characters_mirror_dice_color on public.characters;
create trigger characters_mirror_dice_color
  before insert or update of dice_color on public.characters
  for each row execute function public.characters_mirror_dice_color();

-- Rows written before the trigger existed, brought level with it.
update public.characters
set color_theme = dice_color
where color_theme is distinct from dice_color;

-- ---------------------------------------------------------------------------
-- 3. Storage: the `character-avatars` bucket.
-- ---------------------------------------------------------------------------
--
-- Public, for the reason `campaign-maps` is: rendered from a plain URL with no
-- signing round trip. The URLs carry a uuid and a stamp and are not
-- enumerable, but they are not secret — the right trade for a face the whole
-- party sees on every card.
--
-- Write is not open: an object may only be created under a folder named after
-- the uploader's own uid. NOT the character's — a character does not exist
-- while its sheet is being written, so a policy asking who owns the row could
-- never admit a first portrait.
--
-- These statements touch the `storage` schema, which the migration runner owns
-- on a hosted project. If your role cannot create them, create the bucket in
-- Storage -> New bucket (public), then paste the four policies into the SQL
-- editor as the owner.

insert into storage.buckets (id, name, public)
values ('character-avatars', 'character-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Character avatars are publicly readable" on storage.objects;
create policy "Character avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'character-avatars');

drop policy if exists "Users upload their own character avatars" on storage.objects;
create policy "Users upload their own character avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'character-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Pinned at both ends: `using` decides which rows may be targeted, `with check`
-- what they may become. Without the second, a caller could move somebody
-- else's object into their own folder.
drop policy if exists "Users replace their own character avatars" on storage.objects;
create policy "Users replace their own character avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'character-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'character-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete their own character avatars" on storage.objects;
create policy "Users delete their own character avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'character-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 4. The sheet, as its owner rewrote it.
-- ---------------------------------------------------------------------------
--
-- 20260907090000's function with the colour renamed and the portrait added.
-- Dropped first: PostgREST resolves an overload by the exact set of keys it is
-- handed, so the seventeen-argument version would go on answering anyone still
-- sending `new_color_theme` -- and that caller writes a column this release has
-- handed to a trigger.

drop function if exists public.update_character(
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
);

create or replace function public.update_character(
  target_character uuid,
  new_name text,
  new_discriminator text,
  new_race text,
  new_archetype text,
  new_class_id text,
  new_alignment text,
  new_dice_color text,
  new_avatar_url text,
  new_ability_str integer,
  new_ability_dex integer,
  new_ability_con integer,
  new_ability_int integer,
  new_ability_wis integer,
  new_ability_cha integer,
  new_skills jsonb,
  new_backstory text,
  new_personality text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_character(target_character) then
    return false;
  end if;

  update public.characters
    set name = new_name,
        discriminator = new_discriminator,
        race = new_race,
        archetype = new_archetype,
        class_id = new_class_id,
        alignment = new_alignment,
        dice_color = new_dice_color,
        -- Null is an answer: a character who has taken their portrait down.
        -- The object itself is swept up by the caller, which is the only side
        -- holding the URL this one replaced.
        avatar_url = new_avatar_url,
        ability_str = new_ability_str,
        ability_dex = new_ability_dex,
        ability_con = new_ability_con,
        ability_int = new_ability_int,
        ability_wis = new_ability_wis,
        ability_cha = new_ability_cha,
        -- The whole object, not a merge: the grid submits every skill it knows
        -- about, so an entry that is gone from the payload is one the player
        -- cleared.
        skills = coalesce(new_skills, '{}'::jsonb),
        backstory = new_backstory,
        personality = new_personality
    where id = target_character;

  return found;
end;
$$;

revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from public;
revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from anon;
grant execute on function public.update_character(
  uuid, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. What a party is shown of itself.
-- ---------------------------------------------------------------------------
--
-- 20260914090000's function with the colour renamed and the portrait added.
-- Dropped first because the RETURN TYPE changes, which `create or replace`
-- refuses outright.
--
-- The portrait is as public as the name beside it: both are drawn on every
-- card at the table, and the URL is already fetchable by anyone holding it.

drop function if exists public.campaign_party(uuid);

create function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  dice_color text,
  avatar_url text,
  level integer,
  xp integer,
  inspiration integer,
  current_hp integer,
  max_hp integer,
  armor_class integer,
  death_saves jsonb,
  is_dead boolean,
  conditions text[],
  is_mine boolean,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.dice_color, c.avatar_url,
         c.level, c.xp,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.inspiration
         end,
         c.current_hp, c.max_hp,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.armor_class
         end,
         c.death_saves, c.is_dead, c.conditions,
         public.owns_character(c.id), m.added_at
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    )
  order by m.added_at;
$$;

revoke all on function public.campaign_party(uuid) from public;
revoke all on function public.campaign_party(uuid) from anon;
grant execute on function public.campaign_party(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. What a Dungeon Master finds when they go looking.
-- ---------------------------------------------------------------------------
--
-- 20260818180000's function, same guard and same escaping, carrying the two new
-- columns. Dropped first for the reason above: the return type changes.

drop function if exists public.search_characters(text, text);

create function public.search_characters(
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
  dice_color text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race, c.archetype, c.class_id,
         c.dice_color, c.avatar_url
  from public.characters c
  where
    (nullif(btrim(name_prefix), '') is not null
     or nullif(btrim(discriminator_prefix), '') is not null)
    and (
      nullif(btrim(name_prefix), '') is null
      -- The escape character is doubled first: under standard_conforming_strings
      -- a literal backslash is one character, so replacing it with one is a
      -- no-op that leaves the following % unescaped.
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

-- ---------------------------------------------------------------------------
-- 7. The seat a log line was filed under.
-- ---------------------------------------------------------------------------
--
-- The panel draws a face beside every entry now, and A NAME IS NOT AN IDENTITY:
-- two characters at one table may answer to the same one. So the seat is stored
-- beside the name the function read off it.
--
-- `on delete set null` and not `cascade`: a character leaving does not unhappen
-- what they did, and `actor_name` is a copy taken at the time for exactly that
-- reason. The column is nullable regardless -- the head of the table has no
-- character, and no row written before this migration has a seat to name.
--
-- No index. The log is read one campaign at a time, ten rows at most -- the
-- purge trigger sees to that -- and this column is never a filter.

alter table public.campaign_activity_logs
  add column if not exists actor_character uuid
    references public.characters(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 8. The entry itself.
-- ---------------------------------------------------------------------------
--
-- 20260902090000's function with one more column on the INSERT. The whole list
-- again rather than a patch, which is what every release that has touched this
-- function has had to do: a `create or replace` carries no diff.

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
    campaign_id, actor_character, actor_name, actor_type, action_type, payload
  )
  values (
    target_campaign,
    -- The SEAT, kept beside the name it was read off. Null for the head of the
    -- table, which is the same thing `actor_type` says a second way.
    actor_character,
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
