-- "Frieren levelled down to Lvl 4."
--
-- Experience taken back now falls down the ladder the same way it climbed it.
--
-- 20260903090000 stopped a loss at zero: a rung already spent — new slots, a new
-- proficiency bonus — looked like more than one button should undo. But it made
-- the two buttons asymmetric, so giving 100 and taking 100 back left a character
-- somewhere they had never been. A loss that runs past zero now falls into the
-- rung below and lands as far short of ITS threshold as the shortfall leaves
-- them, which puts them exactly where the award found them.
--
-- 1st level with nothing is the floor. The level trigger writes the line either
-- way — `characters_log_level` has always read a signed delta.
--
-- `create or replace` and not a drop: the signature is 20260903090000's, and
-- only the body between the two loops has changed. This is now the
-- highest-numbered file touching `xp_after`.

create or replace function public.xp_after(
  p_level integer,
  p_xp integer,
  p_delta integer
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_level integer := least(20, greatest(1, coalesce(p_level, 1)));
  v_xp integer := greatest(0, coalesce(p_xp, 0)) + coalesce(p_delta, 0);
  v_cost integer;
begin
  if coalesce(p_delta, 0) < 0 then
    -- Down: each rung fallen into gives back what it cost to leave.
    while v_xp < 0 and v_level > 1 loop
      v_level := v_level - 1;
      v_xp := v_xp + public.xp_threshold(v_level);
    end loop;

    return jsonb_build_object('level', v_level, 'xp', greatest(0, v_xp));
  end if;

  -- Up: each threshold crossed is spent, and the remainder carries.
  v_cost := public.xp_threshold(v_level);

  while v_cost is not null and v_xp >= v_cost loop
    v_xp := v_xp - v_cost;
    v_level := v_level + 1;
    v_cost := public.xp_threshold(v_level);
  end loop;

  -- Nothing to progress towards at the top, so nothing is banked there.
  if v_cost is null then
    v_xp := 0;
  end if;

  return jsonb_build_object('level', v_level, 'xp', least(100000, v_xp));
end;
$fn$;

revoke all on function public.xp_after(integer, integer, integer) from public;
revoke all on function public.xp_after(integer, integer, integer) from anon;
grant execute on function public.xp_after(integer, integer, integer) to authenticated;
