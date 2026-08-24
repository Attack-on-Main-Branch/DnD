-- The party's numbers, for the head of the table.
--
-- The board grew a fourth mark: the scores and the eighteen skills. A player
-- reads their own row through `characters`; a Dungeon Master has no such door,
-- since "users read their own characters" is that table's only SELECT policy.
--
-- A function of its own rather than more columns on `campaign_party`, and the
-- difference is who may ask. That one answers the whole table, so widening it
-- would hand every player the party's ability scores. This answers the owner
-- alone and gives everybody else no rows — RLS grants rows and never columns,
-- so a definer function's WHERE clause is where a narrower audience is written.
--
-- What is NOT in the column list is the point of having one: no `user_id`, no
-- backstory, no personality, no name. The pills come from `campaign_party` as
-- everything else at the table does; this fills in the numbers behind them.
create or replace function public.campaign_sheets(target_campaign uuid)
returns table (
  id uuid,
  level integer,
  skills jsonb,
  ability_str integer,
  ability_dex integer,
  ability_con integer,
  ability_int integer,
  ability_wis integer,
  ability_cha integer,
  ability_str_total integer,
  ability_dex_total integer,
  ability_con_total integer,
  ability_int_total integer,
  ability_wis_total integer,
  ability_cha_total integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.level, c.skills,
         c.ability_str, c.ability_dex, c.ability_con,
         c.ability_int, c.ability_wis, c.ability_cha,
         c.ability_str_total, c.ability_dex_total, c.ability_con_total,
         c.ability_int_total, c.ability_wis_total, c.ability_cha_total
  from public.campaign_members m
  join public.characters c on c.id = m.character_id
  where m.campaign_id = target_campaign
    and public.owns_campaign(target_campaign)
  order by m.added_at;
$$;

revoke all on function public.campaign_sheets(uuid) from public;
revoke all on function public.campaign_sheets(uuid) from anon;
grant execute on function public.campaign_sheets(uuid) to authenticated;
