/**
 * The fog over a map: the switch, and the mask that records where the light has
 * been painted. Failures come back as a `reason` code, not a sentence.
 *
 * The write is an RPC for the reason every write against `campaign_maps` is one:
 * RLS grants whole ROWS, so the narrowest UPDATE policy that would let a Dungeon
 * Master paint a map would let them rewrite its URL with it.
 *
 * THE MASK IS UPSERTED IN PLACE — the one object in this app that is. See
 * `fogMaskObjectPath`, and `uploadObject`'s `rewritable` for what it costs.
 */

import { removeObject, uploadObject } from "./storage.js";

const BUCKET = "campaign-fog-masks";

/** What this module's storage reasons are named after — see storage.js. */
const SUBJECT = "fog";

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
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

  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
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

  // A malformed uuid: Postgres refuses the cast before considering a row.
  if (error.code === INVALID_TEXT_REPRESENTATION) {
    return "bad_id";
  }

  return "unknown";
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message ?? null },
  };
}

/** `touchMask` tells a write that says nothing about the mask from one that
    says the mask is now nothing; a null on its own could not mean both. */
export async function updateMapFogState(
  supabase,
  { mapId, enabled = null, maskUrl = null, touchMask = false },
) {
  const { data, error } = await supabase.rpc("update_map_fog_state", {
    p_map_id: mapId,
    p_enabled: enabled,
    p_mask_url: maskUrl,
    p_touch_mask: touchMask,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

export async function uploadFogMask(supabase, { path, file }) {
  return uploadObject(supabase, {
    bucket: BUCKET,
    path,
    file,
    subject: SUBJECT,
    // One path for the life of the map, so it lands on itself every time.
    rewritable: true,
  });
}

/** Cleanup for a mask whose row was refused. */
export async function removeFogMask(supabase, path) {
  return removeObject(supabase, { bucket: BUCKET, path, subject: SUBJECT });
}
