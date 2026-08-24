-- The eighteen skills, and the pen that writes them.
--
-- A skill is two facts about a character — trained in it or not, and a number
-- somebody may have written over the calculated one — so the eighteen live in
-- one jsonb column rather than thirty-six of their own. Nothing queries across
-- them; the sheet reads the whole object and so does the grid that edits it.
--
-- The shape is the rules layer's, mirrored here because PostgREST sits in front
-- of the Server Actions and `characters` has an INSERT policy: application code
-- cannot be the only check on what lands in the column.

alter table public.characters
  add column if not exists skills jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- What a well-formed skills object is.
-- ---------------------------------------------------------------------------
--
-- A function rather than an inline CHECK because the test is per-entry and a
-- CHECK expression may not contain a subquery. Immutable, which is what lets a
-- constraint call it at all.
--
-- The key list mirrors SKILLS in Sina/src/rules/skills.js and the bounds mirror
-- MIN_SKILL_BONUS / MAX_SKILL_BONUS beside them. Changing one means changing
-- both. `custom_bonus` may be absent, JSON null, or a whole number in range —
-- an absent key and a null mean the same thing, which is "use the calculated
-- number".
create or replace function public.skills_are_valid(payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select payload is null or (
    jsonb_typeof(payload) = 'object'
    and not exists (
      select 1
      from jsonb_each(payload) as entry(skill, state)
      where skill <> all (array[
              'athletics',
              'acrobatics', 'sleight_of_hand', 'stealth',
              'arcana', 'history', 'investigation', 'nature', 'religion',
              'animal_handling', 'insight', 'medicine', 'perception', 'survival',
              'deception', 'intimidation', 'performance', 'persuasion'
            ])
         or jsonb_typeof(state) <> 'object'
         or jsonb_typeof(state -> 'proficient') is distinct from 'boolean'
         or coalesce(jsonb_typeof(state -> 'custom_bonus'), 'null')
              not in ('null', 'number')
         or (
              jsonb_typeof(state -> 'custom_bonus') = 'number'
              and (
                (state ->> 'custom_bonus')::numeric not between -20 and 20
                or (state ->> 'custom_bonus')::numeric
                     <> trunc((state ->> 'custom_bonus')::numeric)
              )
            )
    )
  );
$$;

-- Left executable, unlike the trigger functions 20260811141732 shut off. A
-- CHECK expression is evaluated as the user doing the write, so revoking here
-- would refuse the insert rather than harden it — and this is a pure predicate
-- over its argument, reaching no table and disclosing nothing.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_skills_check'
  ) then
    alter table public.characters
      add constraint characters_skills_check
      check (public.skills_are_valid(skills));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The character sheet, rewritten by its owner — now with the skills on it.
-- ---------------------------------------------------------------------------
--
-- The body from 20260824160000_editing_the_sheet.sql with one parameter added.
-- Dropped first because a new parameter makes an overload rather than a
-- replacement, which would leave two functions of this name for PostgREST to
-- choose between; the grants are restated below since a drop takes them with
-- it. If the two files are ever pasted out of order, re-run this one.
drop function if exists public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, text, text
);

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
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from public;
revoke all on function public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) from anon;
grant execute on function public.update_character(
  uuid, text, text, text, text, text, text, text, integer,
  integer, integer, integer, integer, integer, integer, jsonb, text, text
) to authenticated;
