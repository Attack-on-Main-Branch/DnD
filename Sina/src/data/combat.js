/**
 * Beginning a fight, ending one, writing a number down and handing the turn on.
 * Failures come back as a `reason` code, not a sentence.
 *
 * EVERY WRITE IS AN RPC, for the reason every write in tokens.js is one: RLS
 * grants whole ROWS, so a policy narrow enough to let a Dungeon Master set
 * `is_in_combat` would hand them every other column of the campaign with it.
 * The definer functions in 20260926090000 are the only writers.
 *
 * `false` from one of them is a refusal and reads as `not_found`, the same
 * answer a campaign that has gone gives — a player probing somebody else's table
 * learns nothing either way.
 */

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

  // A campaign or a piece that went away mid-request.
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

  // A malformed uuid: Postgres refuses the cast before considering a row, so it
  // arrives as an error. A miss, not a failure.
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

/** What a `false` from one of the four functions comes back as. */
const REFUSED = {
  data: null,
  error: { reason: "not_found", detail: null },
};

function answer({ data, error }) {
  if (error) {
    return failure(error);
  }

  return data ? { data: true, error: null } : REFUSED;
}

/** The cursor lands on whoever is highest, or on nothing where nobody has
    rolled yet. */
export async function startCombat(supabase, campaignId) {
  return answer(
    await supabase.rpc("start_combat", { p_campaign_id: campaignId }),
  );
}

/** The cursor cleared, the round back to one, and every number on every one of
    this campaign's maps wiped. The pieces stay where they are. */
export async function endCombat(supabase, campaignId) {
  return answer(
    await supabase.rpc("end_combat", { p_campaign_id: campaignId }),
  );
}

/** Null takes the piece back out of the fight. */
export async function setTokenInitiative(supabase, { tokenId, initiative }) {
  return answer(
    await supabase.rpc("set_token_initiative", {
      p_token_id: tokenId,
      p_init: initiative ?? null,
    }),
  );
}

/** Off the bottom is the top again, a round later. */
export async function advanceCombatTurn(supabase, campaignId) {
  return answer(
    await supabase.rpc("advance_combat_turn", { p_campaign_id: campaignId }),
  );
}
