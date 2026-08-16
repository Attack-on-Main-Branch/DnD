/**
 * Every read and write against the `characters` table.
 *
 * Failures come back as a `reason` code rather than a sentence: what went
 * wrong is a backend fact, how to phrase it for a person is a frontend
 * decision, and keeping them apart means the copy can change without anyone
 * touching a query.
 */

const COLUMNS =
  "id, kind, name, discriminator, race, archetype, class_id, alignment, color_theme, level, backstory, personality, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const UNDEFINED_TABLE = "42P01";
const INVALID_TEXT_REPRESENTATION = "22P02";

function classify(error) {
  if (error.code === UNIQUE_VIOLATION) {
    return "handle_taken";
  }

  // A row that got past validateCharacter and was still refused by a CHECK
  // constraint — a bug in the rules rather than something the user did, and it
  // needs its own reason so the caller can say something specific. Without it
  // the user gets the generic "could not save the character" where a precise
  // sentence was available. (The old stakes were higher: the action used to
  // fall back to `error.detail` and show the Postgres string verbatim.)
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // Raised by the characters_enforce_limit trigger.
  if (error.message?.includes("character_limit_reached")) {
    return "limit_reached";
  }

  if (error.code === UNDEFINED_TABLE) {
    return "missing_table";
  }

  // A malformed id — /dashboard/character/foo against a uuid column. Postgres
  // refuses the cast before considering a row, so it arrives as an error rather
  // than an empty result. A MISS, not a failure: without this case a hand-typed
  // URL classifies as `unknown` and the character route answers 500 where it
  // used to answer 404. A test fails if this branch is removed.
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
 * Row Level Security already scopes every one of these to the owner. The
 * explicit `user_id` filters are a second lock on the same door, so a mistake
 * in a policy cannot turn an id from a URL into somebody else's character.
 */
export async function listCharacters(supabase, userId) {
  const { data, error } = await supabase
    .from("characters")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

export async function getCharacter(supabase, { id, userId }) {
  // `maybeSingle` keeps a missing row a miss rather than a crash. It does NOT
  // cover a junk id — that comes back as `bad_id`, which callers should treat
  // the same way they treat null.
  const { data, error } = await supabase
    .from("characters")
    .select(COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return error ? failure(error) : { data, error: null };
}

export async function insertCharacter(supabase, { userId, values }) {
  const { error } = await supabase.from("characters").insert({
    user_id: userId,
    kind: "player",
    name: values.name,
    discriminator: values.discriminator,
    race: values.race,
    archetype: values.archetype,
    class_id: values.classId,
    alignment: values.alignment,
    color_theme: values.colorTheme,
    backstory: values.backstory,
    personality: values.personality,
  });

  return error ? failure(error) : { data: true, error: null };
}

/**
 * `.select("id")` makes the DELETE hand back the rows it actually removed, and
 * that is the whole point of it being here.
 *
 * A DELETE matching nothing is not an error in Postgres or PostgREST, and RLS
 * filters silently — so a stale id, or one belonging to somebody else, came
 * back indistinguishable from a successful delete and the action reported
 * success for work it had not done. The SELECT policy this needs already
 * exists, so it costs nothing.
 */
export async function removeCharacter(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("characters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: { reason: "not_found", detail: "No character matched that id." },
    };
  }

  return { data: true, error: null };
}
