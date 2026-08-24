-- A character's own maximum, and a pen over the two sheets.
--
-- Two things arrive together because they need each other. Max HP is a number
-- somebody types when they make a character, which means it is a number they
-- will want to change afterwards; and neither `characters` nor `campaigns` has
-- ever had an UPDATE door of any kind.
--
-- Both doors are definer functions rather than UPDATE policies, and that choice
-- is the whole of the permission. RLS grants rows and never columns, so the
-- narrowest policy expressible on `characters` would hand its holder the level
-- a Dungeon Master awards and the hit points a table calls out — see the note
-- above `set_character_health` in 20260821140000. The parameter lists below are
-- what may be edited; everything absent from them stays out of reach.

-- ---------------------------------------------------------------------------
-- The maximum itself.
-- ---------------------------------------------------------------------------
--
-- Until now the bar drew against a hard-coded hundred: MAX_HP in
-- Sina/src/rules/health.js, mirrored by the `current_hp` CHECK below it. That
-- constant keeps its name and its value, but its meaning narrows — it is the
-- ceiling a maximum may be SET to, not every character's maximum.
--
-- Added nullable and backfilled rather than defaulted straight in. Every
-- existing character was drawn against a hundred and may be standing at a
-- hundred, so a column that defaulted them all to 20 would put `current_hp`
-- above `max_hp` on the first row it touched. New characters get 20; the ones
-- already here keep the maximum they have been playing with.
alter table public.characters
  add column if not exists max_hp integer;

update public.characters set max_hp = 100 where max_hp is null;

alter table public.characters alter column max_hp set default 20;
alter table public.characters alter column max_hp set not null;

-- Mirrors MIN_MAX_HP and MAX_HP in Sina/src/rules/health.js. Changing one means
-- changing both.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_max_hp_check'
  ) then
    alter table public.characters
      add constraint characters_max_hp_check
      check (max_hp between 1 and 100);
  end if;

  -- The invariant the bar depends on. Both writers hold it — the health
  -- function clamps to this column, and `update_character` below lowers
  -- `current_hp` in the same statement that lowers the maximum — so this is
  -- what stands behind anything that reaches the table another way.
  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_current_hp_within_max_check'
  ) then
    alter table public.characters
      add constraint characters_current_hp_within_max_check
      check (current_hp <= max_hp);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Health, clamped to the character's own maximum.
-- ---------------------------------------------------------------------------
--
-- The body from 20260821160000_dm_edits_party_health.sql with `least(100, ...)`
-- replaced by the row's own maximum. Re-running that file after this one puts
-- the hundred back and lets a heal overshoot a 20 HP character into a CHECK
-- violation; if the two are ever pasted out of order, re-run this one.
create or replace function public.set_character_health(
  target_character uuid,
  hit_points integer,
  target_campaign uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ceiling integer;
  clamped integer;
  permitted boolean;
begin
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

  -- Read after the guard, not before: a caller with no business here learns
  -- nothing about whether the row exists.
  select c.max_hp into ceiling
  from public.characters c
  where c.id = target_character;

  if ceiling is null then
    return null;
  end if;

  clamped := least(ceiling, greatest(0, hit_points));

  update public.characters
    set current_hp = clamped
    where id = target_character;

  return clamped;
end;
$$;

revoke all on function public.set_character_health(uuid, integer, uuid) from public;
revoke all on function public.set_character_health(uuid, integer, uuid) from anon;
grant execute on function public.set_character_health(uuid, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The party list, carrying the maximum its bars are drawn against.
-- ---------------------------------------------------------------------------
--
-- The body from 20260821220000_party_level.sql with one column added. Dropped
-- first because `create or replace` refuses to change a function's OUT
-- parameters (SQLSTATE 42P13), and the grants are restated below since a drop
-- takes them with it. If this is ever pasted before that file, re-run this one.
--
-- `max_hp` joins the display subset for the same reason `current_hp` did: the
-- board draws the whole party's health, and a bar is a fraction — the
-- denominator is no more private than the numerator beside it.
drop function if exists public.campaign_party(uuid);

create function public.campaign_party(target_campaign uuid)
returns table (
  id uuid,
  name text,
  discriminator text,
  race text,
  archetype text,
  class_id text,
  color_theme text,
  level integer,
  current_hp integer,
  max_hp integer,
  is_mine boolean,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.discriminator, c.race,
         c.archetype, c.class_id, c.color_theme,
         c.level, c.current_hp, c.max_hp,
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
-- The character sheet, rewritten by its owner.
-- ---------------------------------------------------------------------------
--
-- Its owner alone, unlike health: what a character IS belongs to the person
-- playing them, and a Dungeon Master with a pen over somebody's backstory is
-- not a table anybody asked to sit at.
--
-- Note what is not a parameter. `user_id` and `kind` are identity, `level` is
-- the Dungeon Master's to award, and `current_hp` moves only through
-- `set_character_health` — except where lowering the maximum drags it down,
-- which happens in the same statement, so the CHECK above is never crossed.
--
-- The six ability scores are here because the sheet asks for them together and
-- the budget is checked in the rules layer; the generated `_total` columns
-- follow on their own, and naming one in an UPDATE is an error.
--
-- `false` for a character that is not the caller's, which is what a deleted one
-- gives too — a caller must not be able to tell a refusal from a miss. A handle
-- somebody else already holds is a different answer: `characters_handle_key`
-- raises a unique violation, which the data layer reads as `handle_taken`.
create or replace function public.update_character(
  target_character uuid,
  new_name text,
  new_discriminator text,
  new_race text,
  new_archetype text,
  new_class_id text,
  new_alignment text,
  new_color_theme text,
  new_max_hp integer,
  new_ability_str integer,
  new_ability_dex integer,
  new_ability_con integer,
  new_ability_int integer,
  new_ability_wis integer,
  new_ability_cha integer,
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
        color_theme = new_color_theme,
        max_hp = new_max_hp,
        -- A character cut down to a smaller frame arrives at it full rather
        -- than overflowing. The health function's clamp says the same thing
        -- from the other side.
        current_hp = least(current_hp, new_max_hp),
        ability_str = new_ability_str,
        ability_dex = new_ability_dex,
        ability_con = new_ability_con,
        ability_int = new_ability_int,
        ability_wis = new_ability_wis,
        ability_cha = new_ability_cha,
        backstory = new_backstory,
        personality = new_personality
    where id = target_character;

  return found;
end;
$$;

revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, text, text
) from public;
revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, text, text
) from anon;
grant execute on function public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- The campaign sheet, rewritten by its Dungeon Master.
-- ---------------------------------------------------------------------------
--
-- `change_map` is the difference between "the map was left alone" and "the map
-- was taken away": both reach here with a null `new_map_url`, and only one of
-- them should clear the column.
--
-- The OLD `map_url` comes back because the object it names has to be deleted
-- after the row stops pointing at it, and once the row is written nothing is
-- left that knows where the file was. The other order would leave a campaign
-- pointing at a URL answering 404 if the update were then refused.
create or replace function public.update_campaign(
  target_campaign uuid,
  new_title text,
  new_world_description text,
  new_map_url text,
  change_map boolean
)
returns table (updated boolean, previous_map_url text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  old_map text;
begin
  if not public.owns_campaign(target_campaign) then
    return query select false, null::text;
    return;
  end if;

  select c.map_url into old_map
  from public.campaigns c
  where c.id = target_campaign;

  update public.campaigns c
    set title = new_title,
        world_description = new_world_description,
        map_url = case when change_map then new_map_url else c.map_url end
    where c.id = target_campaign;

  if not found then
    return query select false, null::text;
    return;
  end if;

  return query select true, old_map;
end;
$$;

revoke all on function public.update_campaign(uuid, text, text, text, boolean) from public;
revoke all on function public.update_campaign(uuid, text, text, text, boolean) from anon;
grant execute on function public.update_campaign(uuid, text, text, text, boolean) to authenticated;
