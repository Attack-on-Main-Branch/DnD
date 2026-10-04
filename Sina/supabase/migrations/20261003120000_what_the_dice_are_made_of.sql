-- What a character's dice are made of, beside the colour they come in.
--
-- `dice_skin` names a generated dice theme. `classic` is the die every
-- character has thrown until now, so the default moves nobody's dice. Mirrors
-- DICE_SKIN_VALUES in Sina/src/rules/character.js.

-- ---------------------------------------------------------------------------
-- 1. The column.
-- ---------------------------------------------------------------------------

alter table public.characters
  add column if not exists dice_skin text not null default 'classic';

-- Dropped and re-added rather than guarded, so a later release adding a skin
-- can rewrite the list the same way.
alter table public.characters
  drop constraint if exists characters_dice_skin_check;

alter table public.characters
  add constraint characters_dice_skin_check
    check (dice_skin in ('classic', 'metal-rimmed'));

-- ---------------------------------------------------------------------------
-- 2. The sheet, as its owner rewrote it.
-- ---------------------------------------------------------------------------
--
-- 20260919090000's function with the skin added. Dropped first: PostgREST
-- resolves an overload by the exact set of keys it is handed.

drop function if exists public.update_character(
  uuid, text, text, text, text, text, text, text, text,
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
  new_dice_skin text,
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
        dice_skin = new_dice_skin,
        avatar_url = new_avatar_url,
        ability_str = new_ability_str,
        ability_dex = new_ability_dex,
        ability_con = new_ability_con,
        ability_int = new_ability_int,
        ability_wis = new_ability_wis,
        ability_cha = new_ability_cha,
        skills = coalesce(new_skills, '{}'::jsonb),
        backstory = new_backstory,
        personality = new_personality
    where id = target_character;

  return found;
end;
$$;

revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from public;
revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from anon;
grant execute on function public.update_character(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. What a party is shown of itself.
-- ---------------------------------------------------------------------------
--
-- 20260919090000's function with the skin added: every chair at the table
-- draws everybody's dice, so it is as public as the colour beside it. Dropped
-- first because the return type changes.

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
  dice_skin text,
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
         c.archetype, c.class_id, c.dice_color, c.dice_skin, c.avatar_url,
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
