/**
 * The pieces a campaign invents, and where each of them stands on the board.
 * Failures come back as a `reason` code, not a sentence.
 *
 * EVERY WRITE HERE IS AN RPC, and none of them is an `update()` or a `delete()`
 * against the table. `map_placed_tokens` has no write policy at all — RLS grants
 * whole ROWS, so the narrowest UPDATE policy that let a player drag their own
 * piece would also let them hide it, or kill it, from a hand-built request. The
 * definer functions in 20260922090000 are the only writers.
 *
 * The templates DO take an insert and a delete, because there the whole row is
 * the Dungeon Master's own and there is nothing on it to narrow.
 */

import { removeObject, uploadObject } from "./storage.js";

/** The maps' bucket — the pieces live beside them, see rules/tokens.js. */
const BUCKET = "campaign-maps";

/** What this module's storage reasons are named after — see storage.js. */
const SUBJECT = "token";

/** `campaign_id` is present and wanted: the palette groups by it. */
const TEMPLATE_COLUMNS = "id, campaign_id, name, image_url, created_at";

/* `placed_at` is the first tie-break in the initiative order, and
   `combat_turn_order` breaks it the same way. */
const PLACED_COLUMNS =
  "id, map_id, character_id, template_id, is_party_marker, " +
  "hex_q, hex_r, world_x, world_y, ring_color, is_hidden, is_dead, " +
  "conditions, initiative, placed_at";

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/** Not SQLSTATEs: PostgREST's own codes for a table or function it has no
    entry for, so the call never reaches Postgres and the two above never fire. */
const TABLE_CACHE_MISS = "PGRST205";
const FUNCTION_CACHE_MISS = "PGRST202";

function classify(error) {
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // The one-per-map indexes. Reachable only if a definer function's upsert is
  // ever narrowed, so it says so rather than being folded into `invalid_value`.
  if (error.code === UNIQUE_VIOLATION) {
    return "already_placed";
  }

  // A campaign, a map or a character that went away mid-request.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  // Trigger-raised, so matched on the message: it has no SQLSTATE of its own
  // and stops being recognised if the migration changes the string.
  if (error.message?.includes("token_limit_reached")) {
    return "limit_reached";
  }

  if (error.code === UNDEFINED_TABLE || error.code === TABLE_CACHE_MISS) {
    return "missing_table";
  }

  // A migration written but never pushed.
  if (error.code === UNDEFINED_COLUMN) {
    return "missing_column";
  }

  if (error.code === UNDEFINED_FUNCTION || error.code === FUNCTION_CACHE_MISS) {
    return "missing_function";
  }

  // A malformed uuid: Postgres refuses the cast before considering a row, so it
  // arrives as an error. A miss, not a failure — 404 rather than 500.
  if (error.code === INVALID_TEXT_REPRESENTATION) {
    return "bad_id";
  }

  return "failed";
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/* ---------------------------------------------------------------------------
   THE HAND
   --------------------------------------------------------------------------- */

/**
 * Every piece this campaign has invented, oldest first — which is the order the
 * palette deals them out in and the order the slots fill.
 */
export async function listCampaignTokenTemplates(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_token_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * One piece into the hand. The id is the caller's because the object in storage
 * is named after it and had to be uploaded first — the same order, and the same
 * reason, as a map on the shelf.
 */
export async function insertTokenTemplate(
  supabase,
  { id, campaignId, name, imageUrl },
) {
  const { data, error } = await supabase
    .from("campaign_token_templates")
    .insert({
      id,
      campaign_id: campaignId,
      name,
      image_url: imageUrl,
    })
    .select(TEMPLATE_COLUMNS);

  if (error) {
    return failure(error);
  }

  return data?.length
    ? { data: data[0], error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/**
 * One piece out of it, and every copy standing on a board with it — the
 * placements cascade on `template_id`.
 *
 * `.select("image_url")` makes the DELETE report the row it removed, which is
 * the last chance to learn where the picture is before nothing points at it. An
 * empty result is a miss: already gone, or never this caller's.
 */
export async function removeTokenTemplate(supabase, { id, campaignId }) {
  const { data, error } = await supabase
    .from("campaign_token_templates")
    .delete()
    .eq("id", id)
    // The policy already answers this. Kept as the second lock on the same
    // door, as everywhere else in this layer.
    .eq("campaign_id", campaignId)
    .select("image_url");

  if (error) {
    return failure(error);
  }

  return data?.length
    ? { data: { imageUrl: data[0].image_url }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

export async function uploadTokenImage(supabase, { path, file }) {
  return uploadObject(supabase, {
    bucket: BUCKET,
    path,
    file,
    subject: SUBJECT,
  });
}

export async function removeTokenImage(supabase, path) {
  return removeObject(supabase, { bucket: BUCKET, path, subject: SUBJECT });
}

/* ---------------------------------------------------------------------------
   THE BOARD
   --------------------------------------------------------------------------- */

/**
 * What is standing on one map. A hidden piece is not in this list for anybody
 * but the Dungeon Master — the SELECT policy decides that, not the columns.
 *
 * `mapIds` rather than one map: the board holds every map's pieces so that
 * switching pictures is a filter rather than a round trip, exactly as the marks
 * were held. An empty list is no query at all.
 */
export async function listMapPlacedTokens(supabase, mapIds) {
  const ids = (mapIds ?? []).filter(Boolean);

  if (ids.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("map_placed_tokens")
    .select(PLACED_COLUMNS)
    .in("map_id", ids)
    .order("placed_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * A piece put down. `null` from the function is a refusal — the map does not
 * take that kind of piece, or the caller is not in that chair — and reads here
 * as `not_found`, the same answer a map that has gone gives.
 */
export async function placeMapToken(
  supabase,
  { mapId, characterId, templateId, isPartyMarker, x, y, q, r, ringColor },
) {
  const { data, error } = await supabase.rpc("place_map_token", {
    p_map_id: mapId,
    p_character_id: characterId ?? null,
    p_template_id: templateId ?? null,
    p_party: Boolean(isPartyMarker),
    p_x: x,
    p_y: y,
    // Null for a map with no grid: the point is where the piece IS, and the
    // cell is which square it is standing in. A board with no squares has none.
    p_q: Number.isInteger(q) ? q : null,
    p_r: Number.isInteger(r) ? r : null,
    p_ring_color: ringColor,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: { id: data }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/** One already down, moved. The id names the row; the function asks again
    whether this caller's hand may move it. */
export async function moveMapToken(supabase, { tokenId, x, y, q, r }) {
  const { data, error } = await supabase.rpc("move_map_token", {
    p_token_id: tokenId,
    p_x: x,
    p_y: y,
    p_q: Number.isInteger(q) ? q : null,
    p_r: Number.isInteger(r) ? r : null,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/**
 * Hidden, killed, and what it is suffering — together, because the menu that
 * sets them is one menu. An absent field leaves that column where it stands.
 */
export async function setMapTokenState(
  supabase,
  { tokenId, isHidden, isDead, conditions },
) {
  const { data, error } = await supabase.rpc("set_map_token_state", {
    p_token_id: tokenId,
    p_hidden: isHidden ?? null,
    p_dead: isDead ?? null,
    p_conditions: conditions ?? null,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

export async function removeMapToken(supabase, { tokenId }) {
  const { data, error } = await supabase.rpc("remove_map_token", {
    p_token_id: tokenId,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/**
 * Every piece off one map. What ruling a previously free-form board does — see
 * the migration's step 10 for why the pieces are swept rather than snapped.
 */
export async function clearMapPlacedTokens(supabase, { mapId }) {
  const { data, error } = await supabase.rpc("clear_map_placed_tokens", {
    p_map_id: mapId,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}
