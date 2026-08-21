-- The Dungeon Master's pen over the whole party's hit points.
--
-- 20260821140000 gave the write to the character's owner alone, which is right
-- for a sheet and wrong for a table: damage is called out by whoever is running
-- the session, and asking six people to each type their own number is not how
-- anybody plays. So the campaign's owner may set the hit points of a character
-- sitting in that campaign, and nothing else about it — this function's shape
-- is still the whole of the permission.
--
-- Scoped by campaign, deliberately. A character can sit at more than one table,
-- so "is a Dungeon Master" is not the question; "is the Dungeon Master of the
-- campaign this character is playing in" is. `target_campaign` is what makes
-- that askable, and membership is re-checked here rather than trusted from the
-- caller.

-- Replaced rather than overloaded: two functions of the same name with
-- different arity is two doors, and the two-argument one would go on answering
-- for anyone who called it.
drop function if exists public.set_character_health(uuid, integer);

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
  clamped integer := least(100, greatest(0, hit_points));
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

  update public.characters
    set current_hp = clamped
    where id = target_character;

  return clamped;
end;
$$;

revoke all on function public.set_character_health(uuid, integer, uuid) from public;
revoke all on function public.set_character_health(uuid, integer, uuid) from anon;
grant execute on function public.set_character_health(uuid, integer, uuid) to authenticated;
