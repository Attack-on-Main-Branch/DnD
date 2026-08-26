/**
 * The two rests, as one door each. Failures come back as a `reason` code, not a
 * sentence.
 *
 * Both delegate to `trigger_rest`, which is where the atomicity lives: a long
 * rest is hit points AND every slot, across as many as six characters, and a
 * party half-rested because the second statement failed is worse than a party
 * that has not rested at all.
 *
 * `characterIds` is WHO — one of them, several, or the whole party. The function
 * narrows the list to this party and to the characters the caller may rest, the
 * way `reveal_chest` narrows an audience; nothing here decides it.
 */

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

const SCHEMA_CACHE_MISS = "PGRST205";
const FUNCTION_CACHE_MISS = "PGRST202";

function classify(error) {
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === UNDEFINED_TABLE || error.code === SCHEMA_CACHE_MISS) {
    return "missing_table";
  }

  if (error.code === UNDEFINED_COLUMN) {
    return "missing_column";
  }

  if (error.code === UNDEFINED_FUNCTION || error.code === FUNCTION_CACHE_MISS) {
    return "missing_function";
  }

  if (error.code === INVALID_TEXT_REPRESENTATION) {
    return "bad_id";
  }

  return "unknown";
}

function failure(error) {
  return {
    data: null,
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * Whoever rested, and the numbers they woke on. An empty list is a refusal —
 * a chair that is not the caller's, or a party nobody may rest — and reads the
 * way every other refusal in this layer does.
 */
async function performRest(
  supabase,
  { campaignId, characterIds, restType, seatCharacterId = null },
) {
  const { data, error } = await supabase.rpc("trigger_rest", {
    p_campaign_id: campaignId,
    p_target_char_ids: characterIds ?? [],
    p_rest_type: restType,
    p_seat: seatCharacterId,
  });

  if (error) {
    return failure(error);
  }

  const rested = (data ?? []).map((row) => ({
    id: row.id,
    currentHp: row.current_hp,
    spellSlots: row.spell_slots,
  }));

  return rested.length > 0
    ? { data: rested, error: null }
    : { data: null, error: { reason: "not_found", detail: "refused" } };
}

/** An hour by the fire: what returns on the hour, and nothing else. */
export async function performShortRest(supabase, options) {
  return performRest(supabase, { ...options, restType: "short" });
}

/** A night: hit points to the character's own maximum, every slot unspent. */
export async function performLongRest(supabase, options) {
  return performRest(supabase, { ...options, restType: "long" });
}
