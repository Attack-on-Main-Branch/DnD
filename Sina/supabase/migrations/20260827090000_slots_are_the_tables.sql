-- A slot leaves a player's sheet by being cast, and comes back from the head of
-- the table.
--
-- 20260826090000 admitted the character's own owner to all three slot
-- functions. That is wrong: a slot is a RESOURCE the table spends against, and
-- a player who can put one back at will has no resource at all. So:
--
--   consume_spell_slot     the owner, and their Dungeon Master  (unchanged)
--   restore_spell_slot     the Dungeon Master alone             (narrowed here)
--   long_rest_spell_slots  nobody                               (dropped here)
--
-- PostgREST sits in front of the Server Actions, so the UI cannot be the only
-- check -- this file is what makes the read-only bar a rule.

-- Dropped rather than left standing unused: SECURITY DEFINER with EXECUTE
-- granted to `authenticated` is a door a caller could still have opened.
drop function if exists public.long_rest_spell_slots(uuid);

-- ---------------------------------------------------------------------------
-- Putting one back.
-- ---------------------------------------------------------------------------
--
-- The whole of 20260826090000's function again with one guard changed: this is
-- now the highest-numbered file that touches it and the one to re-run after any
-- out-of-order paste. No `drop` first, since the signature does not change.
create or replace function public.restore_spell_slot(
  target_character uuid,
  p_slot integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_class text;
  v_level integer;
  v_slots jsonb;
  v_max integer;
  v_used integer;
begin
  if p_slot is null or p_slot < 1 or p_slot > 9 then
    return null;
  end if;

  -- The one line that changed. `owns_character` is deliberately absent: a
  -- character's own owner may spend a slot and may not give one back.
  if not public.character_at_my_table(target_character) then
    return null;
  end if;

  select c.class_id, c.level, coalesce(c.spell_slots, '{}'::jsonb)
    into v_class, v_level, v_slots
  from public.characters c
  where c.id = target_character
  for update;

  if not found then
    return null;
  end if;

  v_slots := public.spell_slots_for(v_class, v_level, v_slots);
  v_max := public.spell_slot_maximum(v_class, v_level, p_slot);

  if v_max = 0 then
    return null;
  end if;

  v_used := (v_slots -> p_slot::text ->> 'used')::integer;

  -- Clamped rather than refused, unlike spending: giving back a slot that was
  -- never spent is a miscount being corrected, and the bar is where somebody
  -- corrects it.
  v_slots := jsonb_set(
    v_slots, array[p_slot::text, 'used'], to_jsonb(greatest(0, v_used - 1))
  );

  update public.characters set spell_slots = v_slots where id = target_character;

  return v_slots;
end;
$fn$;

revoke all on function public.restore_spell_slot(uuid, integer) from public;
revoke all on function public.restore_spell_slot(uuid, integer) from anon;
grant execute on function public.restore_spell_slot(uuid, integer) to authenticated;

-- `character_spells.is_prepared` is left standing and no longer read: dropping
-- it is the one irreversible thing this file could do, and preparing spells is
-- a rule a table may want back.
