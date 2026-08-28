-- Roll for initiative.
--
-- Combat is a state the TABLE is in, so it lives on `campaigns` beside
-- `active_map_id`: whether the party is fighting, whose turn it is, and which
-- round.
--
-- THE ORDER IS NOT STORED. It is derived every time from the `initiative` on the
-- pieces standing on the active map, so a piece put down mid-fight, lifted or
-- struck down changes the order without anything being renumbered. What is
-- stored is the cursor: `active_turn_token_id`, one row's id.
--
-- A TOKEN AND NOT A SEAT, because only the row can tell the second goblin from
-- the third. `on delete set null`, so a piece taken off the board takes the turn
-- with it rather than leaving the table pointing at nothing.
--
-- All four functions are the head of the table's alone.

-- ---------------------------------------------------------------------------
-- 1. What the table is in.
-- ---------------------------------------------------------------------------

alter table public.campaigns
  add column if not exists is_in_combat boolean not null default false;

alter table public.campaigns
  add column if not exists active_turn_token_id uuid;

alter table public.campaigns
  add column if not exists combat_round integer not null default 1;

do $$
begin
  -- Added apart from the column so a database that got the column from a
  -- half-applied run still ends up with the key.
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_active_turn_token_fkey'
  ) then
    alter table public.campaigns
      add constraint campaigns_active_turn_token_fkey
        foreign key (active_turn_token_id)
        references public.map_placed_tokens(id) on delete set null;
  end if;

  -- Rounds count from one. Mirrors MIN_COMBAT_ROUND in Sina/src/rules/combat.js.
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_combat_round_check'
  ) then
    alter table public.campaigns
      add constraint campaigns_combat_round_check check (combat_round >= 1);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. What a piece rolled.
-- ---------------------------------------------------------------------------
--
-- Null is "has not rolled yet", and it is the whole of what keeps a piece out of
-- the order: a monster the Dungeon Master has not got to yet is on the board and
-- not in the fight.
--
-- The bounds are wide on purpose. A d20 is the die, but the modifier is the
-- character's, and a table playing with a house rule that puts somebody on 31
-- should not be arguing with a constraint. Mirrors MIN_INITIATIVE and
-- MAX_INITIATIVE in Sina/src/rules/combat.js.

alter table public.map_placed_tokens
  add column if not exists initiative integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'map_placed_tokens_initiative_check'
  ) then
    alter table public.map_placed_tokens
      add constraint map_placed_tokens_initiative_check
        check (initiative is null or initiative between -20 and 99);
  end if;
end
$$;

-- The order's own read: one map, the pieces that have rolled.
create index if not exists map_placed_tokens_initiative
  on public.map_placed_tokens (map_id, initiative desc)
  where initiative is not null;

-- ---------------------------------------------------------------------------
-- 3. The order itself.
-- ---------------------------------------------------------------------------
--
-- Derived rather than stored, and derived HERE rather than in each of the three
-- functions below — an order that disagreed with itself between "start" and
-- "advance" is a turn that skips somebody.
--
-- DESCENDING, then by when the piece was put down, then by id. The last two are
-- not decoration: two pieces on the same initiative must resolve the same way on
-- every call. Mirrors `initiativeOrder` in Sina/src/rules/combat.js.
--
-- Out of it: a piece marked dead on the board, and a character marked dead on
-- their CARD — one character is one fact.

create or replace function public.combat_turn_order(p_map_id uuid)
returns table (token_id uuid, seat integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id,
         (row_number() over (
            order by t.initiative desc, t.placed_at asc, t.id asc
          ))::integer
  from public.map_placed_tokens t
  left join public.characters c on c.id = t.character_id
  where t.map_id = p_map_id
    and t.initiative is not null
    and not t.is_dead
    and not coalesce(c.is_dead, false);
$$;

revoke all on function public.combat_turn_order(uuid) from public;
revoke all on function public.combat_turn_order(uuid) from anon;
revoke all on function public.combat_turn_order(uuid) from authenticated;

-- ---------------------------------------------------------------------------
-- 4. Beginning it.
-- ---------------------------------------------------------------------------
--
-- The cursor lands on whoever rolled highest, or on nothing at all when nobody
-- has rolled yet; `set_token_initiative` picks it up at the first number typed.

create or replace function public.start_combat(p_campaign_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_map uuid;
  v_first uuid;
begin
  if not public.owns_campaign(p_campaign_id) then
    return false;
  end if;

  select c.active_map_id into v_map
  from public.campaigns c
  where c.id = p_campaign_id;

  select o.token_id into v_first
  from public.combat_turn_order(v_map) o
  order by o.seat
  limit 1;

  update public.campaigns
    set is_in_combat = true,
        combat_round = 1,
        active_turn_token_id = v_first
    where id = p_campaign_id;

  if not found then
    return false;
  end if;

  perform public.write_table_log(
    p_campaign_id, null, 'combat_started', null, '{}'::jsonb
  );

  return true;
end;
$$;

revoke all on function public.start_combat(uuid) from public;
revoke all on function public.start_combat(uuid) from anon;
grant execute on function public.start_combat(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Ending it.
-- ---------------------------------------------------------------------------
--
-- EVERY MAP'S NUMBERS GO, not only the one on the table: a fight that moved from
-- the courtyard to the cellar would otherwise leave an order behind on the first
-- picture. The board keeps its pieces; only the initiative is cleared.

create or replace function public.end_combat(p_campaign_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_campaign(p_campaign_id) then
    return false;
  end if;

  update public.campaigns
    set is_in_combat = false,
        combat_round = 1,
        active_turn_token_id = null
    where id = p_campaign_id;

  if not found then
    return false;
  end if;

  update public.map_placed_tokens t
    set initiative = null
    where t.initiative is not null
      and t.map_id in (
        select m.id from public.campaign_maps m
        where m.campaign_id = p_campaign_id
      );

  perform public.write_table_log(
    p_campaign_id, null, 'combat_ended', null, '{}'::jsonb
  );

  return true;
end;
$$;

revoke all on function public.end_combat(uuid) from public;
revoke all on function public.end_combat(uuid) from anon;
grant execute on function public.end_combat(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. A number written down.
-- ---------------------------------------------------------------------------
--
-- Null clears it, taking the piece back out of the fight.
--
-- AND THE CURSOR IS RE-EVALUATED, the order it points into having just changed.
-- Two cases only: the cursor is on nothing yet, or the piece it was on has just
-- left the order. A cursor still on a piece IN the order is left where it is —
-- renumbering somebody must not hand the turn to somebody else mid-round.

create or replace function public.set_token_initiative(
  p_token_id uuid,
  p_init integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_map uuid;
  v_active uuid;
  v_fighting boolean;
  v_first uuid;
begin
  select m.campaign_id, m.id into v_campaign, v_map
  from public.map_placed_tokens t
  join public.campaign_maps m on m.id = t.map_id
  where t.id = p_token_id;

  if v_campaign is null or not public.owns_campaign(v_campaign) then
    return false;
  end if;

  if p_init is not null and p_init not between -20 and 99 then
    return false;
  end if;

  update public.map_placed_tokens
    set initiative = p_init
    where id = p_token_id;

  select c.is_in_combat, c.active_turn_token_id into v_fighting, v_active
  from public.campaigns c
  where c.id = v_campaign;

  if not coalesce(v_fighting, false) then
    return true;
  end if;

  if v_active is not null and exists (
    select 1 from public.combat_turn_order(v_map) o where o.token_id = v_active
  ) then
    return true;
  end if;

  select o.token_id into v_first
  from public.combat_turn_order(v_map) o
  order by o.seat
  limit 1;

  update public.campaigns
    set active_turn_token_id = v_first
    where id = v_campaign;

  return true;
end;
$$;

revoke all on function public.set_token_initiative(uuid, integer) from public;
revoke all on function public.set_token_initiative(uuid, integer) from anon;
grant execute on function public.set_token_initiative(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. The next turn.
-- ---------------------------------------------------------------------------
--
-- Off the bottom is the top again, a round higher. That wrap is the only thing
-- that moves `combat_round`.
--
-- A CURSOR ON A PIECE NO LONGER IN THE ORDER — killed on its own turn, lifted
-- off the board — lands on the top WITHOUT counting a round: it lost the place
-- it was keeping rather than finishing a lap.

create or replace function public.advance_combat_turn(p_campaign_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_map uuid;
  v_active uuid;
  v_seat integer;
  v_count integer;
  v_next uuid;
begin
  if not public.owns_campaign(p_campaign_id) then
    return false;
  end if;

  select c.active_map_id, c.active_turn_token_id into v_map, v_active
  from public.campaigns c
  where c.id = p_campaign_id and c.is_in_combat;

  if not found then
    return false;
  end if;

  select count(*) into v_count from public.combat_turn_order(v_map);

  if v_count = 0 then
    update public.campaigns
      set active_turn_token_id = null
      where id = p_campaign_id;

    return true;
  end if;

  select o.seat into v_seat
  from public.combat_turn_order(v_map) o
  where o.token_id = v_active;

  -- The place the order was keeping is gone: back to the top, and no lap.
  if v_seat is null then
    select o.token_id into v_next
    from public.combat_turn_order(v_map) o
    order by o.seat
    limit 1;

    update public.campaigns
      set active_turn_token_id = v_next
      where id = p_campaign_id;

    return true;
  end if;

  select o.token_id into v_next
  from public.combat_turn_order(v_map) o
  where o.seat = case when v_seat >= v_count then 1 else v_seat + 1 end;

  update public.campaigns
    set active_turn_token_id = v_next,
        combat_round = case
          when v_seat >= v_count then combat_round + 1
          else combat_round
        end
    where id = p_campaign_id;

  return true;
end;
$$;

revoke all on function public.advance_combat_turn(uuid) from public;
revoke all on function public.advance_combat_turn(uuid) from anon;
grant execute on function public.advance_combat_turn(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Two more things the log can say.
-- ---------------------------------------------------------------------------
--
-- Dropped and re-added rather than guarded on existence, which is how this
-- schema has grown this list every time — see 20260823090000.

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
      'coin_revoked',
      'spell_cast',
      'chest_revealed',
      'chest_looted',
      'bag_transferred',
      'xp_change',
      'rest_taken',
      'max_hp_change',
      'instant_death',
      'death_save',
      'character_died',
      'character_revived',
      'condition_applied',
      'condition_removed',
      'combat_started',
      'combat_ended'
    )
  );

-- ---------------------------------------------------------------------------
-- 9. What the table is looking at, and whether it is fighting.
-- ---------------------------------------------------------------------------
--
-- 20260920090000's function with the three combat columns added. Dropped first
-- because the RETURN TYPE grows, which `create or replace` refuses outright.
--
-- Not narrowed to the Dungeon Master: every chair draws the turn's glow.

drop function if exists public.campaign_table(uuid);

create function public.campaign_table(target_campaign uuid)
returns table (
  id uuid,
  title text,
  world_description text,
  map_url text,
  active_map_id uuid,
  is_owner boolean,
  is_in_combat boolean,
  active_turn_token_id uuid,
  combat_round integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.world_description,
         coalesce(m.url, c.map_url),
         c.active_map_id,
         public.owns_campaign(target_campaign),
         c.is_in_combat,
         c.active_turn_token_id,
         c.combat_round
  from public.campaigns c
  left join public.campaign_maps m on m.id = c.active_map_id
  where c.id = target_campaign
    and (
      public.owns_campaign(target_campaign)
      or public.my_character_in_campaign(target_campaign)
    );
$$;

revoke all on function public.campaign_table(uuid) from public;
revoke all on function public.campaign_table(uuid) from anon;
grant execute on function public.campaign_table(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. What the table hears.
-- ---------------------------------------------------------------------------
--
-- Both are already published — `campaigns` since 20260920090000 and
-- `map_placed_tokens` since 20260922090000 — and these guards are here so this
-- file stands on its own. RLS still decides what is delivered.

do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'campaigns'
     )
  then
    alter publication supabase_realtime add table public.campaigns;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'map_placed_tokens'
     )
  then
    alter publication supabase_realtime add table public.map_placed_tokens;
  end if;
end;
$pub$;
