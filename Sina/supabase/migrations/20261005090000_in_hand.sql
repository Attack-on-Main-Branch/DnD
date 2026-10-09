-- What a character is holding: one stack of their pack, marked, and still in
-- the pack. Holding something is not moving it, so no quantity changes and the
-- log stays quiet -- nothing is armed, and `log_pack_change` returns at once.
--
-- A FLAG ON THE ROW rather than a column on `characters`, so it goes where the
-- row goes: used up, dropped or handed over to the last, the row is deleted
-- and the hand is empty with it. A Dungeon Master already reads the party's
-- packs, so they see what everybody is holding with no new policy.

alter table public.character_inventory
  add column if not exists in_hand boolean not null default false;

-- The pack itself, never a bag. `transfer_container` hands a bag's rows to
-- somebody else by rewriting `character_id`, and a held row riding along would
-- put a second thing in the receiver's hand -- which the index below refuses,
-- so the whole hand-over would fail.
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'character_inventory_in_hand_check'
  ) then
    alter table public.character_inventory
      add constraint character_inventory_in_hand_check
      check (not in_hand or container_id is null);
  end if;
end;
$ck$;

-- One thing in hand at a time.
create unique index if not exists character_inventory_one_in_hand
  on public.character_inventory (character_id)
  where in_hand;

-- ---------------------------------------------------------------------------
-- Taking something in hand, or putting it down.
-- ---------------------------------------------------------------------------
--
-- SECURITY INVOKER: the pack's own policies are the whole permission, as for
-- `grant_inventory_item`. A function only so the old row is let go and the new
-- one taken in one transaction, in that order -- the index above would refuse
-- the other.
--
-- A null item empties the hand. False is a refusal: not a stack in this pack,
-- in a bag, a Dice Pouch (mirrors `DICE_POUCH_SLUG`), or not the caller's.
create or replace function public.hold_in_hand(
  target_character uuid,
  p_item_id uuid default null
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $fn$
declare
  v_id uuid;
begin
  if not (
    public.owns_character(target_character)
    or public.character_at_my_table(target_character)
  ) then
    return false;
  end if;

  if p_item_id is not null then
    select i.id into v_id
    from public.character_inventory i
    where i.id = p_item_id
      and i.character_id = target_character
      and i.container_id is null
      and i.item_slug <> 'dice-pouch'
    for update;

    if v_id is null then
      return false;
    end if;
  end if;

  update public.character_inventory
    set in_hand = false
    where character_id = target_character
      and in_hand
      and id is distinct from v_id;

  if v_id is not null then
    update public.character_inventory
      set in_hand = true
      where id = v_id
        and not in_hand;
  end if;

  return true;
end;
$fn$;

revoke all on function public.hold_in_hand(uuid, uuid) from public;
revoke all on function public.hold_in_hand(uuid, uuid) from anon;
grant execute on function public.hold_in_hand(uuid, uuid) to authenticated;
