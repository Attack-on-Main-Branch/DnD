/**
 * Every read and write against `character_features`. Failures come back as a
 * `reason` code, not a sentence.
 *
 * PLAIN SELECTS AND PLAIN WRITES, unlike most of this layer. Every column here
 * is one the writer may set and every column is one the table may read, so the
 * policies in 20260913090000 are the whole permission — there is nothing for a
 * definer function's return type to narrow, and no deed with a transaction
 * behind it.
 *
 * `character_id` is in the column list on purpose, unlike `user_id` elsewhere:
 * the Dungeon Master reads the whole party's features in one query and has to
 * know whose each row is.
 */

const COLUMNS = "id, character_id, name, description, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const INVALID_TEXT_REPRESENTATION = "22P02";

/** PostgREST's own code for a table it has no entry for — see data/currency.js. */
const SCHEMA_CACHE_MISS = "PGRST205";

function classify(error) {
  // Trigger-raised, so matched on the message: it has no SQLSTATE of its own.
  if (error.message?.includes("feature_limit_reached")) {
    return "limit_reached";
  }

  // Past validateFeature but refused by the bounds CHECK: a disagreement
  // between Sina/src/rules/features.js and the migration.
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // The character went away between the page rendering and the write landing.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === UNDEFINED_TABLE || error.code === SCHEMA_CACHE_MISS) {
    return "missing_table";
  }

  // A malformed uuid: Postgres refuses the cast before considering a row, so
  // it arrives as an error. A miss, not a failure.
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

/** Oldest first, so a card keeps its place in the grid as others are added. */
export async function listCharacterFeatures(supabase, characterId) {
  const { data, error } = await supabase
    .from("character_features")
    .select(COLUMNS)
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The whole party's, in one round trip. RLS decides what comes back — and here
 * that is everybody's, because a feature is what a character can do and the
 * party finds that out the first time they do it.
 *
 * An empty party is answered without a query: PostgREST renders `in.()` as a
 * syntax error, and a campaign with nobody in it is the ordinary state of a new
 * one.
 */
export async function listPartyFeatures(supabase, characterIds) {
  if (!characterIds || characterIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("character_features")
    .select(COLUMNS)
    .in("character_id", characterIds)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `.select()` makes the INSERT report the row, so an RLS refusal — no row
 * rather than a failure — is told apart from a write that landed. The row comes
 * back because the card is drawn from it: an id made here is what a Remove
 * presses against a moment later.
 */
export async function insertCharacterFeature(
  supabase,
  { characterId, feature },
) {
  const { data, error } = await supabase
    .from("character_features")
    .insert({
      character_id: characterId,
      name: feature.name,
      description: feature.description,
    })
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/**
 * One struck out. `character_id` rides along as a second lock on the same door,
 * the way every read in this layer carries one — and a row the caller may not
 * touch comes back as no row rather than as a failure, which is the same answer
 * a feature somebody else has already removed gives.
 */
export async function deleteCharacterFeature(supabase, { id, characterId }) {
  const { data, error } = await supabase
    .from("character_features")
    .delete()
    .eq("id", id)
    .eq("character_id", characterId)
    .select("id")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}
