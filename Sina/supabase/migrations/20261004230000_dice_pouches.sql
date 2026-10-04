-- Dice sets are unlocked, and Dice Pouches are how.
--
-- Every character starts with Classic and nothing else. The rest are found in
-- Dice Pouches, which only the Dungeon Master hands out, one set per pouch, a
-- rarer set less likely than a commoner one and never a set already owned.
--
-- A POUCH IS A STACK IN THE PACK, under the reserved slug `dice-pouch`, so it is
-- carried, counted, watched and taken back exactly as anything else is. What
-- makes it special is `guard_dice_pouch`: the policies on `character_inventory`
-- let an owner fill their own pack, so without the trigger a player could hand
-- themselves pouches straight through PostgREST.
--
-- THE DRAW IS THE DATABASE'S. A browser that chose its own set, or told a
-- function which one it got, could choose Gold-rimmed every time.
--
-- OPENING AND TELLING THE TABLE ARE TWO CALLS. The set is decided and kept the
-- moment the pouch opens, but the line in the log waits for
-- `announce_dice_skins`, which the opener's browser calls once the reel has
-- stopped — otherwise the log would give the result away before the reveal. An
-- opening never announced is told the next time that character announces.

-- ---------------------------------------------------------------------------
-- 1. How rare each set is.
-- ---------------------------------------------------------------------------
--
-- Mirrors DICE_SKINS_BY_RARITY in Sina/src/rules/character.js. A table rather
-- than a CASE so the two functions below, and the foreign key under them, read
-- one list. Read by definer functions alone: RLS on, no policy.

create table if not exists public.dice_skins (
  skin text primary key,
  rarity text not null
    check (rarity in ('common', 'rare', 'epic', 'legendary'))
);

alter table public.dice_skins enable row level security;

insert into public.dice_skins (skin, rarity) values
  ('classic', 'common'),
  ('crystal', 'common'),
  ('glass', 'common'),
  ('fade', 'common'),
  ('ornate', 'common'),
  ('metal-rimmed', 'rare'),
  ('metal-inlaid', 'rare'),
  ('cracked', 'rare'),
  ('galaxy', 'rare'),
  ('paper', 'rare'),
  ('brass-rimmed', 'epic'),
  ('brass-inlaid', 'epic'),
  ('wood', 'epic'),
  ('epoxy', 'epic'),
  ('gold-rimmed', 'legendary'),
  ('gold-inlaid', 'legendary'),
  ('asiimov', 'legendary'),
  ('companion', 'legendary')
on conflict (skin) do update set rarity = excluded.rarity;

-- The column points at this table, in place of the CHECK every new style used
-- to rewrite in full: a style is now one row here. A foreign key reads past
-- RLS, so the table needs no policy for it.
alter table public.characters
  drop constraint if exists characters_dice_skin_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_dice_skin_fkey'
  ) then
    alter table public.characters
      add constraint characters_dice_skin_fkey
        foreign key (dice_skin) references public.dice_skins (skin);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. What a character has unlocked.
-- ---------------------------------------------------------------------------
--
-- Classic is everybody's and is never stored. No write policy at all: a row is
-- written by `open_dice_pouch` and by nothing else. The owner reads their own;
-- the Dungeon Master reads the party's, to know who has nothing left to find.

create table if not exists public.character_dice_skins (
  character_id uuid not null
    references public.characters (id) on delete cascade,
  skin text not null references public.dice_skins (skin),
  unlocked_at timestamptz not null default now(),
  announced boolean not null default false,
  primary key (character_id, skin)
);

alter table public.character_dice_skins enable row level security;

drop policy if exists "Owners and their DM read unlocked dice"
  on public.character_dice_skins;
create policy "Owners and their DM read unlocked dice"
  on public.character_dice_skins for select to authenticated
  using (
    public.owns_character(character_id)
    or public.character_at_my_table(character_id)
  );

-- Nobody loses what they are already rolling: a set chosen before sets had to
-- be found is theirs. Announced, because nothing was opened.
insert into public.character_dice_skins (character_id, skin, announced)
select c.id, c.dice_skin, true
from public.characters c
where c.dice_skin <> 'classic'
on conflict (character_id, skin) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Only an unlocked set can be chosen.
-- ---------------------------------------------------------------------------
--
-- On the column rather than in `set_character_dice`, so every path to it is
-- held: an owner may update their own row through PostgREST directly. A row
-- whose set did not change is let through, so an edit to anything else never
-- trips on it.

create or replace function public.guard_dice_skin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.dice_skin = 'classic'
    or (tg_op = 'UPDATE' and new.dice_skin is not distinct from old.dice_skin)
  then
    return new;
  end if;

  if not exists (
    select 1 from public.character_dice_skins o
    where o.character_id = new.id and o.skin = new.dice_skin
  ) then
    raise exception 'dice_skin_locked';
  end if;

  return new;
end;
$fn$;

revoke all on function public.guard_dice_skin() from public;
revoke all on function public.guard_dice_skin() from anon;
revoke all on function public.guard_dice_skin() from authenticated;

drop trigger if exists characters_guard_dice_skin on public.characters;
create trigger characters_guard_dice_skin
  before insert or update of dice_skin on public.characters
  for each row execute function public.guard_dice_skin();

-- ---------------------------------------------------------------------------
-- 4. Only the Dungeon Master puts a pouch in a pack.
-- ---------------------------------------------------------------------------
--
-- Fewer is always allowed — opened, dropped, taken back. More, or a new stack,
-- only for the Dungeon Master of a table the character sits at, and only into
-- the pack itself. That also refuses a player handing one across the table or
-- stowing it in a bag: both write a new stack under the player's own rights.

create or replace function public.guard_dice_pouch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.item_slug <> 'dice-pouch' then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.item_slug = new.item_slug
    and old.container_id is not distinct from new.container_id
    and new.quantity <= old.quantity
  then
    return new;
  end if;

  if new.container_id is null
    and public.character_at_my_table(new.character_id)
  then
    return new;
  end if;

  raise exception 'dice_pouch_dm_only';
end;
$fn$;

revoke all on function public.guard_dice_pouch() from public;
revoke all on function public.guard_dice_pouch() from anon;
revoke all on function public.guard_dice_pouch() from authenticated;

drop trigger if exists character_inventory_guard_dice_pouch
  on public.character_inventory;
create trigger character_inventory_guard_dice_pouch
  before insert or update on public.character_inventory
  for each row execute function public.guard_dice_pouch();

-- ---------------------------------------------------------------------------
-- 5. Opening one.
-- ---------------------------------------------------------------------------
--
-- A rarity first, by its odds among the rarities that still have a set left
-- for this character; then one of that rarity's sets, evenly. The odds mirror
-- DICE_POUCH_ODDS in Sina/src/rules/dice-pouch.js.
--
-- Null is a refusal — not their seat, or no pouch in the pack. A character with
-- every set already raises instead, keeping the pouch: there is nothing to put
-- in it, and taking it would be a pouch lost for nothing.

create or replace function public.open_dice_pouch(
  p_campaign uuid,
  p_character uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_pouch uuid;
  v_have integer;
  v_roll double precision := random();
  v_rarity text;
  v_skin text;
begin
  if p_character is null
    or not public.my_seat_at_table(p_campaign, p_character)
  then
    return null;
  end if;

  select i.id, i.quantity into v_pouch, v_have
  from public.character_inventory i
  where i.character_id = p_character
    and i.item_slug = 'dice-pouch'
    and i.container_id is null
  for update;

  if v_pouch is null or v_have < 1 then
    return null;
  end if;

  with odds (rarity, weight, rank) as (
    values ('common', 60, 1), ('rare', 25, 2), ('epic', 11, 3), ('legendary', 4, 4)
  ),
  pool as (
    select s.skin, s.rarity
    from public.dice_skins s
    where s.skin <> 'classic'
      and not exists (
        select 1 from public.character_dice_skins o
        where o.character_id = p_character and o.skin = s.skin
      )
  ),
  ladder as (
    select o.rarity,
           sum(o.weight) over (order by o.rank) as reach,
           sum(o.weight) over () as total
    from odds o
    where exists (select 1 from pool p where p.rarity = o.rarity)
  )
  select l.rarity into v_rarity
  from ladder l
  where l.reach > v_roll * l.total
  order by l.reach
  limit 1;

  if v_rarity is null then
    raise exception 'dice_pouch_empty';
  end if;

  select s.skin into v_skin
  from public.dice_skins s
  where s.rarity = v_rarity
    and s.skin <> 'classic'
    and not exists (
      select 1 from public.character_dice_skins o
      where o.character_id = p_character and o.skin = s.skin
    )
  order by random()
  limit 1;

  insert into public.character_dice_skins (character_id, skin)
  values (p_character, v_skin);

  if v_have > 1 then
    update public.character_inventory
      set quantity = v_have - 1
      where id = v_pouch;
  else
    delete from public.character_inventory where id = v_pouch;
  end if;

  return v_skin;
end;
$fn$;

revoke all on function public.open_dice_pouch(uuid, uuid) from public;
revoke all on function public.open_dice_pouch(uuid, uuid) from anon;
grant execute on function public.open_dice_pouch(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. What the log can say about it.
-- ---------------------------------------------------------------------------
--
-- 20260926090000's list with `dice_pouch_opened` added.

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
      'combat_ended',
      'dice_pouch_opened'
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Telling the table.
-- ---------------------------------------------------------------------------
--
-- Every set this character has opened and not yet told, one line each, filed
-- under their own seat so the line wears their face. The rarity is the one the
-- set has now, written into the line so a later reshuffle does not rewrite
-- history. The count is how many lines were written.

create or replace function public.announce_dice_skins(
  p_campaign uuid,
  p_character uuid
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_name text;
  v_told integer;
begin
  if p_character is null
    or not public.my_seat_at_table(p_campaign, p_character)
  then
    return 0;
  end if;

  select c.name into v_name
  from public.characters c
  where c.id = p_character;

  with told as (
    update public.character_dice_skins o
      set announced = true
      where o.character_id = p_character
        and not o.announced
      returning o.skin, o.unlocked_at
  )
  insert into public.campaign_activity_logs (
    campaign_id, actor_character, actor_name, actor_type, action_type, payload
  )
  select p_campaign,
         p_character,
         left(v_name, 80),
         'player',
         'dice_pouch_opened',
         jsonb_build_object('skin', t.skin, 'rarity', s.rarity)
  from told t
  join public.dice_skins s on s.skin = t.skin
  order by t.unlocked_at;

  get diagnostics v_told = row_count;

  return v_told;
end;
$fn$;

revoke all on function public.announce_dice_skins(uuid, uuid) from public;
revoke all on function public.announce_dice_skins(uuid, uuid) from anon;
grant execute on function public.announce_dice_skins(uuid, uuid) to authenticated;
