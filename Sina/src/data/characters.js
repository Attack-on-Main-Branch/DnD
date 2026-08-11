/**
 * Every read and write against the `characters` table.
 *
 * Failures come back as a `reason` code rather than a sentence: what went
 * wrong is a backend fact, how to phrase it for a person is a frontend
 * decision, and keeping them apart means the copy can change without anyone
 * touching a query.
 */

const COLUMNS =
  "id, kind, name, discriminator, race, alignment, color_theme, level, backstory, personality, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const UNDEFINED_TABLE = "42P01";

function classify(error) {
  if (error.code === UNIQUE_VIOLATION) {
    return "handle_taken";
  }

  // Raised by the characters_enforce_limit trigger.
  if (error.message?.includes("character_limit_reached")) {
    return "limit_reached";
  }

  if (error.code === UNDEFINED_TABLE) {
    return "missing_table";
  }

  return "unknown";
}

function failure(error) {
  return { data: null, error: { reason: classify(error), detail: error.message } };
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
  // `maybeSingle` keeps a junk id a miss rather than a crash.
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
    alignment: values.alignment,
    color_theme: values.colorTheme,
    backstory: values.backstory,
    personality: values.personality,
  });

  return error ? failure(error) : { data: true, error: null };
}

export async function removeCharacter(supabase, { id, userId }) {
  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  return error ? failure(error) : { data: true, error: null };
}
