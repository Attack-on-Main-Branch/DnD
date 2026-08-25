-- Moving a stack between a pack and one of its own bags.
--
-- 20260831090000 gave a character more than one place to keep a thing and no
-- way to move anything between them: loot arrived in the pack, a bag was filled
-- when it was made, and that was where both stayed. This is the missing verb.
--
-- NOT A TRANSFER. `transfer_inventory_item` moves something between two
-- PEOPLE: it checks they share a table and it writes a line in the log. This
-- moves a stack between two pockets of one coat, so the log stays quiet — hence
-- the disarm below, or the pack trigger would file a line per row changed.
--
-- SECURITY DEFINER, though every write it makes is one the caller's own policies
-- would allow. The guard that needs the definer is the CONTAINER: a player may
-- write their own pack rows, so without it they could tag one with a bag id
-- that is not theirs, which every drawer would then decline to draw.

create or replace function public.move_inventory_item(
  target_character uuid,
  p_item_slug text,
  p_quantity integer,
  p_from_container uuid default null,
  p_to_container uuid default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_have integer;
  v_name text;
  v_desc text;
  v_category text;
  v_custom boolean;
  v_facts jsonb;
  v_moved integer;
  v_left integer;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 999 then
    return null;
  end if;

  -- The pack is a NULL container: `null = null` is null, which would let a
  -- move to nowhere through.
  if p_from_container is not distinct from p_to_container then
    return null;
  end if;

  -- Whose coat this is — the pair the pack's policies ask.
  if not (
    public.owns_character(target_character)
    or public.character_at_my_table(target_character)
  ) then
    return null;
  end if;

  -- Both ends have to be a bag THIS character is carrying. The pack is null
  -- and always theirs, so only the named ones are checked.
  if p_from_container is not null and not exists (
    select 1 from public.containers k
    where k.id = p_from_container
      and k.type = 'bag'
      and k.owner_character_id = target_character
  ) then
    return null;
  end if;

  if p_to_container is not null and not exists (
    select 1 from public.containers k
    where k.id = p_to_container
      and k.type = 'bag'
      and k.owner_character_id = target_character
  ) then
    return null;
  end if;

  -- FOR UPDATE, so two browsers moving the last of something cannot both pass.
  select i.id, i.quantity, i.name, i.description, i.category, i.is_custom,
         i.facts
    into v_id, v_have, v_name, v_desc, v_category, v_custom, v_facts
  from public.character_inventory i
  where i.character_id = target_character
    and i.item_slug = p_item_slug
    and i.container_id is not distinct from p_from_container
  for update;

  if v_id is null then
    return null;
  end if;

  -- More than is there moves what is there: a drawer left open is not an error.
  v_moved := least(p_quantity, v_have);
  v_left := v_have - v_moved;

  if v_moved < 1 then
    return null;
  end if;

  -- Nothing armed. A pocket is not a table.
  perform public.arm_table_log(
    null::uuid, null::uuid, null::text, null::uuid, null::uuid
  );

  if v_left = 0 then
    delete from public.character_inventory where id = v_id;
  else
    update public.character_inventory
      set quantity = v_left
      where id = v_id;
  end if;

  insert into public.character_inventory
    (character_id, container_id, item_slug, name, category, description,
     quantity, is_custom, facts)
  values (
    target_character,
    p_to_container,
    p_item_slug,
    v_name,
    coalesce(nullif(btrim(v_category), ''), 'Equipment'),
    coalesce(v_desc, ''),
    v_moved,
    coalesce(v_custom, false),
    coalesce(v_facts, '{}'::jsonb)
  )
  on conflict (character_id, item_slug, container_id) do update
    set quantity = least(999, character_inventory.quantity + excluded.quantity);

  return v_left;
end;
$fn$;

revoke all on function public.move_inventory_item(uuid, text, integer, uuid, uuid) from public;
revoke all on function public.move_inventory_item(uuid, text, integer, uuid, uuid) from anon;
grant execute on function public.move_inventory_item(uuid, text, integer, uuid, uuid) to authenticated;
