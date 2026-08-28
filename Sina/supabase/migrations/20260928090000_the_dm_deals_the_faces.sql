-- The Dungeon Master deals the faces.
--
-- `place_map_token` let a player put their own face on the board. Moving one
-- that is already down and taking it off again are untouched — see
-- `move_map_token` and `remove_map_token` in 20260922090000, whose rule is
-- still "your own, or anything at a table you run".
--
-- Everything below is 20260922090000's function with that one branch narrowed.

create or replace function public.place_map_token(
  p_map_id uuid,
  p_character_id uuid,
  p_template_id uuid,
  p_party boolean,
  p_x double precision,
  p_y double precision,
  p_q integer,
  p_r integer,
  p_ring_color text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_campaign uuid;
  v_world boolean;
  v_owner boolean;
  v_ring text;
  v_id uuid;
begin
  if p_x is null or p_y is null or p_x <> p_x or p_y <> p_y then
    return null;
  end if;

  -- Exactly one face, asked here as well as by the CHECK: a refusal is a null
  -- rather than an exception the caller has to classify.
  if (p_character_id is not null)::integer
     + (p_template_id is not null)::integer
     + coalesce(p_party, false)::integer <> 1
  then
    return null;
  end if;

  select m.campaign_id, m.is_world_map into v_campaign, v_world
  from public.campaign_maps m
  where m.id = p_map_id;

  if v_campaign is null then
    return null;
  end if;

  v_owner := public.owns_campaign(v_campaign);

  if v_world then
    -- The party alone, and only the hand that speaks for the party.
    if not coalesce(p_party, false) or not v_owner then
      return null;
    end if;
  else
    -- Everywhere else the party marker is a piece with nothing to stand for:
    -- the faces themselves are on the board.
    if coalesce(p_party, false) then
      return null;
    end if;

    if p_template_id is not null then
      -- An invented piece is the Dungeon Master's to deal, and only one from
      -- this campaign's own hand.
      if not v_owner or not exists (
        select 1 from public.campaign_token_templates t
        where t.id = p_template_id and t.campaign_id = v_campaign
      ) then
        return null;
      end if;
    else
      -- The head of the table's alone, and only for a character still in this
      -- party. A player moves their face once it is down and takes it off
      -- through the menu; putting it there is not theirs.
      if not (
        v_owner
        and exists (
          select 1 from public.campaign_members m
          where m.campaign_id = v_campaign
            and m.character_id = p_character_id
        )
      ) then
        return null;
      end if;
    end if;
  end if;

  -- A colour outside the shape the CHECK allows takes the default rather than
  -- raising: it is a swatch the browser picked, not something typed.
  v_ring := case
    when p_ring_color ~ '^#[0-9a-f]{6}$' then p_ring_color
    else '#ef4444'
  end;

  if p_template_id is not null then
    insert into public.map_placed_tokens (
      map_id, template_id, world_x, world_y, hex_q, hex_r, ring_color
    )
    values (
      p_map_id, p_template_id,
      least(1, greatest(0, p_x)), least(1, greatest(0, p_y)),
      p_q, p_r, v_ring
    )
    returning id into v_id;

    return v_id;
  end if;

  if coalesce(p_party, false) then
    insert into public.map_placed_tokens (
      map_id, is_party_marker, world_x, world_y, hex_q, hex_r, ring_color
    )
    values (
      p_map_id, true,
      least(1, greatest(0, p_x)), least(1, greatest(0, p_y)),
      p_q, p_r, v_ring
    )
    on conflict (map_id) where is_party_marker do update
      set world_x = excluded.world_x,
          world_y = excluded.world_y,
          hex_q = excluded.hex_q,
          hex_r = excluded.hex_r,
          placed_at = now()
    returning id into v_id;

    return v_id;
  end if;

  insert into public.map_placed_tokens (
    map_id, character_id, world_x, world_y, hex_q, hex_r, ring_color
  )
  values (
    p_map_id, p_character_id,
    least(1, greatest(0, p_x)), least(1, greatest(0, p_y)),
    p_q, p_r, v_ring
  )
  on conflict (map_id, character_id) where character_id is not null do update
    set world_x = excluded.world_x,
        world_y = excluded.world_y,
        hex_q = excluded.hex_q,
        hex_r = excluded.hex_r,
        placed_at = now()
  returning id into v_id;

  return v_id;
end;
$$;
