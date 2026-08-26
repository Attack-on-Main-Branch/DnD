/**
 * Every write against `characters.xp`. Failures come back as a `reason` code,
 * not a sentence.
 *
 * One door, and it is an RPC: a level rides on an award, so the figure and the
 * rung have to move in one statement or a browser could read a bar that has
 * filled past a level nobody climbed. `modify_character_xp` is a definer for the
 * reason 20260821140000 gives about hit points — RLS grants rows and never
 * columns, so an UPDATE policy narrow enough to admit `xp` would admit the name,
 * the race and the backstory beside it.
 */

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/** PostgREST's own codes: the call never reaches Postgres, so no SQLSTATE. */
const SCHEMA_CACHE_MISS = "PGRST205";
const FUNCTION_CACHE_MISS = "PGRST202";

function classify(error) {
  // Past the rules layer but refused by the bounds CHECK: a disagreement
  // between Sina/src/rules/xp.js and the migration.
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
 * A CHANGE and never a total: the database adds it to the row it has locked, so
 * two awards in the same breath stack rather than one overwriting the other.
 *
 * `characterIds` is WHO — one of them, several, or the whole party. The function
 * narrows the list to this party and to the characters the caller may write for,
 * the way `reveal_chest` narrows an audience; nothing here decides it.
 *
 * `seatCharacterId` is the CHAIR that pressed, null for the head of the table,
 * and it decides only what the log entry is filed under — `modify_character_xp`
 * puts the seat back through `my_seat_at_table` and asks `owns_character` for
 * the pen itself.
 *
 * No rows is a refusal: a character who is not the caller's to write for, or one
 * that left the party between the press and the call. A caller must not be able
 * to tell those apart, so both read as `not_found`.
 */
export async function modifyCharacterXp(
  supabase,
  { campaignId, characterIds, delta, seatCharacterId = null },
) {
  const { data, error } = await supabase.rpc("modify_character_xp", {
    p_char_ids: characterIds ?? [],
    p_delta: delta,
    p_campaign: campaignId,
    p_seat: seatCharacterId,
  });

  if (error) {
    return failure(error);
  }

  const awarded = (data ?? []).map((row) => ({
    id: row.id,
    xp: row.xp,
    level: row.level,
    levelsGained: row.levels_gained,
  }));

  return awarded.length > 0
    ? { data: awarded, error: null }
    : { data: null, error: { reason: "not_found", detail: "refused" } };
}
