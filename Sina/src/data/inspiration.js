/**
 * The one write against `characters.inspiration`. Failures come back as a
 * `reason` code, not a sentence.
 *
 * An RPC and a definer, for the reason 20260821140000 gives about hit points:
 * RLS grants rows and never columns, so an UPDATE policy narrow enough to admit
 * this one would admit the name, the race and the backstory beside it. It is
 * also where the asymmetry lives — a player spends their own and may not hand
 * one back — see `sina/rules/inspiration`.
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

  // A migration written but never pushed, which `npm run db:list` catches.
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
 * One mark, given or spent. A CHANGE and never a total: the database adds it to
 * the row it has locked, so two presses in the same breath stack rather than one
 * overwriting the other.
 *
 * Null is a refusal — a character who is not the caller's to write for, a player
 * reaching for a mark they may only spend, or one that left the party between
 * the press and the call. A caller must not be able to tell those apart.
 */
export async function moveCharacterInspiration(
  supabase,
  { campaignId, characterId, delta },
) {
  const { data, error } = await supabase.rpc("move_character_inspiration", {
    p_char_id: characterId,
    p_delta: delta,
    p_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  return data === null
    ? { data: null, error: { reason: "not_found", detail: "refused" } }
    : { data: { inspiration: data }, error: null };
}
