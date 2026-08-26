-- Three marks a character holds, on the right of their card at the table.
--
-- WHO MAY MOVE ONE IS NOT SYMMETRIC, and that asymmetry is the whole feature.
-- Inspiration is GIVEN by whoever is running the session and SPENT by whoever
-- holds it, so a player may press a lit mark to use it and nothing else —
-- handing one back to yourself is the press this must never admit. The head of
-- the table does both, for anybody in their party.
--
-- WHOSE MARKS ARE VISIBLE is the other half. A Dungeon Master reads the whole
-- party's; a player reads their own and nobody else's — so `campaign_party`
-- answers with a NULL for every row the caller may not see it on, rather than
-- the app hiding a number it was handed. See CLAUDE.md on RLS granting rows and
-- never columns: this is the definer function choosing its own column list, one
-- row at a time.
--
-- Mirrors Sina/src/rules/inspiration.js. Changing one means changing both.

-- ---------------------------------------------------------------------------
-- The column.
-- ---------------------------------------------------------------------------
--
-- Three by default, and three is also the ceiling: a character arrives at the
-- table with all of them, which is what the pips draw before anybody presses.
alter table public.characters
  add column if not exists inspiration integer not null default 3;

do $ck$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_inspiration_check'
  ) then
    alter table public.characters
      add constraint characters_inspiration_check
      check (inspiration between 0 and 3);
  end if;
end;
$ck$;

-- ---------------------------------------------------------------------------
-- The party, now carrying its marks.
-- ---------------------------------------------------------------------------
--
-- 20260903090000's function with one column added, and that column is the first
-- here to be answered CONDITIONALLY: everything else this returns is display
-- subset the whole party may read, and a character's inspiration is not.
--
-- Dropped first because the RETURN TYPE grows, which `create or replace`
-- refuses outright.
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
  xp integer,
  inspiration integer,
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
         c.level, c.xp,
         case
           when public.owns_campaign(target_campaign)
             or public.owns_character(c.id)
           then c.inspiration
         end,
         c.current_hp, c.max_hp,
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
-- Moving one.
-- ---------------------------------------------------------------------------
--
-- A CHANGE and never a total, for the reason `change_character_health` is one:
-- the figure is added to the row this statement has locked, so two presses in
-- the same breath stack rather than one overwriting the other.
--
-- NULL is a refusal, and every refusal answers alike — a character who is not
-- the caller's to write for, a player reaching for a mark they may only spend,
-- and one who left the party between the press and the call. A caller must not
-- be able to tell those apart.
--
-- No log entry: a mark is a thing a table keeps between itself, and the ten
-- lines the log holds are for what moved a bar, a pack or a purse.
create or replace function public.move_character_inspiration(
  p_char_id uuid,
  p_delta integer,
  p_campaign uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_head boolean := public.owns_campaign(p_campaign);
  v_mine boolean := public.owns_character(p_char_id);
  v_next integer;
begin
  -- One at a time is all the pips ever ask for; three is the whole row.
  if p_delta is null or p_delta = 0 or abs(p_delta) > 3 then
    return null;
  end if;

  if not exists (
    select 1 from public.campaign_members m
    where m.campaign_id = p_campaign
      and m.character_id = p_char_id
  ) then
    return null;
  end if;

  -- The asymmetry, and the only place it is enforced: a player SPENDS.
  if not v_head and not (v_mine and p_delta < 0) then
    return null;
  end if;

  update public.characters c
    set inspiration = least(3, greatest(0, c.inspiration + p_delta))
    where c.id = p_char_id
    returning c.inspiration into v_next;

  return v_next;
end;
$fn$;

revoke all on function public.move_character_inspiration(uuid, integer, uuid) from public;
revoke all on function public.move_character_inspiration(uuid, integer, uuid) from anon;
grant execute on function public.move_character_inspiration(uuid, integer, uuid) to authenticated;
