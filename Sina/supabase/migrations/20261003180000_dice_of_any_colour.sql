-- Dice of any colour, kept on a tab of their own.
--
-- `dice_color` stops being one of twelve slugs and becomes any `#rrggbb`, and
-- the sheet's editor stops writing it: the Dice tab does, through
-- `set_character_dice`, along with the style. Mirrors `readDiceColor` and
-- DICE_SKIN_VALUES in Sina/src/rules/character.js.

-- ---------------------------------------------------------------------------
-- 1. `color_theme` is left where it stands.
-- ---------------------------------------------------------------------------
--
-- 20260919090000 mirrored it off `dice_color` so an older deploy could still
-- read a slug. Its own CHECK admits only the twelve, so a hex would be refused;
-- the mirror goes and the column keeps the last slug it was given.

drop trigger if exists characters_mirror_dice_color on public.characters;
drop function if exists public.characters_mirror_dice_color();

-- ---------------------------------------------------------------------------
-- 2. The colour, as a hex.
-- ---------------------------------------------------------------------------

alter table public.characters
  drop constraint if exists characters_dice_color_check;

-- The twelve, at the values the swatches always painted them.
update public.characters
set dice_color = case dice_color
  when 'rose' then '#e11d48'
  when 'orange' then '#ea580c'
  when 'amber' then '#d97706'
  when 'lime' then '#65a30d'
  when 'emerald' then '#059669'
  when 'teal' then '#0d9488'
  when 'cyan' then '#0891b2'
  when 'sky' then '#0284c7'
  when 'blue' then '#2563eb'
  when 'violet' then '#7c3aed'
  when 'fuchsia' then '#c026d3'
  when 'pink' then '#db2777'
  else '#e11d48'
end
where dice_color !~ '^#[0-9a-f]{6}$';

alter table public.characters
  alter column dice_color set default '#e11d48';

alter table public.characters
  add constraint characters_dice_color_check
    check (dice_color ~ '^#[0-9a-f]{6}$');

-- ---------------------------------------------------------------------------
-- 3. The styles.
-- ---------------------------------------------------------------------------

alter table public.characters
  drop constraint if exists characters_dice_skin_check;

alter table public.characters
  add constraint characters_dice_skin_check
    check (dice_skin in ('classic', 'metal-rimmed', 'gold-rimmed', 'brass-rimmed'));

-- ---------------------------------------------------------------------------
-- 4. The sheet, as its owner rewrote it — without the dice.
-- ---------------------------------------------------------------------------
--
-- Both earlier signatures dropped: 20261003120000's, and 20260919090000's in
-- case that one never ran. PostgREST resolves an overload by the exact set of
-- keys it is handed.

drop function if exists public.update_character(
  uuid, text, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
);

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
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from public;
revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from anon;
grant execute on function public.update_character(
  uuid, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. The dice, from the Dice tab.
-- ---------------------------------------------------------------------------
--
-- A definer function for `update_character`'s reason: RLS grants rows, never
-- columns. The two CHECKs above are what bound the values.

create or replace function public.set_character_dice(
  target_character uuid,
  new_dice_color text,
  new_dice_skin text
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
    set dice_color = new_dice_color,
        dice_skin = new_dice_skin
    where id = target_character;

  return found;
end;
$$;

revoke all on function public.set_character_dice(uuid, text, text) from public;
revoke all on function public.set_character_dice(uuid, text, text) from anon;
grant execute on function public.set_character_dice(uuid, text, text)
  to authenticated;
