import { classifyDatabaseError } from "./database-errors.js";

// Unlocks are read-only; the database draws and records every pouch reward.
const COLUMNS = "character_id, skin, unlocked_at";

function classify(error) {
  // Trigger- and function-raised, so matched on the message: they have no
  // SQLSTATE of their own and stop being recognised if the migration changes
  // the string.
  if (error.message?.includes("dice_pouch_empty")) {
    return "collection_complete";
  }

  if (error.message?.includes("dice_pouch_dm_only")) {
    return "dm_only";
  }

  switch (error.code) {
    case "23514":
    case "23503":
    case "42703":
      return "unknown";
  }

  return classifyDatabaseError(error);
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * The sets these characters have found, Classic aside — it is never stored.
 * RLS decides whose come back: an owner's own, and the party's for their
 * Dungeon Master. An empty list is answered without a query, since PostgREST
 * renders `in.()` as a syntax error.
 */
async function listUnlocks(supabase, characterIds, kind) {
  if (!characterIds || characterIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from(`character_${kind}_skins`)
    .select(COLUMNS)
    .in("character_id", characterIds)
    .order("unlocked_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

export function listDiceSkinUnlocks(supabase, characterIds) {
  return listUnlocks(supabase, characterIds, "dice");
}

export function listBannerSkinUnlocks(supabase, characterIds) {
  return listUnlocks(supabase, characterIds, "banner");
}

/**
 * One pouch out of the pack, and the skin it held. Null from the function is a
 * refusal — not their seat, or no pouch to open — and reads as `not_found`.
 */
export async function openSkinPouch(supabase, { campaignId, characterId }) {
  const { data, error } = await supabase.rpc("open_pouch", {
    p_campaign: campaignId,
    p_character: characterId,
  });

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/** The log lines for every set opened and not yet told. */
export async function announceSkins(supabase, { campaignId, characterId }) {
  const { data, error } = await supabase.rpc("announce_skins", {
    p_campaign: campaignId,
    p_character: characterId,
  });

  if (error) {
    return failure(error);
  }

  return { data: { announced: data ?? 0 }, error: null };
}
