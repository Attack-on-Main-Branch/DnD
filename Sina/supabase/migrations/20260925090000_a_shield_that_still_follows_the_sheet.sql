-- A chosen armour class still follows the sheet.
--
-- 20260910090000 asked two questions before it would move a shield, and the
-- second one was too strict:
--
--   is the standing value still the OLD base?  — otherwise somebody has already
--     set it by hand, and a dexterity raised at eighth level must not take their
--     plate off.
--
-- The intent was right and the consequence was not. A table that sets an armour
-- class by hand has said "this is what I am WEARING", not "stop counting my
-- dexterity" — so raising the score that ought to raise the armour class did
-- nothing at all, for the rest of that character's life. Ten set to twelve, then
-- two points of dexterity, and the shield still read twelve.
--
-- WHAT IT KEEPS IS THE DIFFERENCE. A chosen figure is a base plus an offset, and
-- the offset is theirs; the base underneath it goes on being derived. Twelve
-- over a base of ten is `+2`, so a base that climbs to twelve carries the shield
-- to fourteen. An untouched armour class has an offset of nought and follows
-- exactly as it always did — the old behaviour is this one's zero case, which is
-- why the second question can go rather than be added to.
--
-- Still no "has been set" column, and still none needed. The difference between
-- the value and the base IS that column, and it says how much rather than only
-- whether.

create or replace function public.sync_armor_class()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  v_was integer;
  v_now integer;
begin
  if tg_op = 'INSERT' then
    new.armor_class := public.row_base_armor_class(new);

    return new;
  end if;

  -- This statement IS the stepper, or `update_armor_class`: what it names is
  -- what the table meant, and deriving over it would make the shield unmovable.
  if new.armor_class is distinct from old.armor_class then
    return new;
  end if;

  v_was := public.row_base_armor_class(old);
  v_now := public.row_base_armor_class(new);

  if v_now = v_was then
    return new;
  end if;

  -- The offset carried across the move. Bounded by the same ends the column's
  -- own CHECK keeps — see MIN_ARMOR_CLASS and MAX_ARMOR_CLASS in
  -- Sina/src/rules/death.js.
  new.armor_class := least(99, greatest(0, old.armor_class + (v_now - v_was)));

  return new;
end;
$fn$;

revoke all on function public.sync_armor_class() from public;
revoke all on function public.sync_armor_class() from anon;
revoke all on function public.sync_armor_class() from authenticated;

-- The trigger from 20260910090000 stands as it is; only the body above moved.
