/**
 * Every read and write against the `characters` table. Failures come back as a
 * `reason` code rather than a sentence.
 */

/**
 * A column list rather than `*`, so `user_id` never travels to the client — a
 * test asserts it stays out. The generated `_total` columns are read alongside
 * the base ones, so the sheet prints the number Postgres would sort by.
 */
const COLUMNS =
  "id, kind, name, discriminator, race, archetype, class_id, alignment, color_theme, level, " +
  "ability_str, ability_dex, ability_con, ability_int, ability_wis, ability_cha, " +
  "ability_str_total, ability_dex_total, ability_con_total, ability_int_total, ability_wis_total, ability_cha_total, " +
  "backstory, personality, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const UNDEFINED_TABLE = "42P01";
const INVALID_TEXT_REPRESENTATION = "22P02";

function classify(error) {
  if (error.code === UNIQUE_VIOLATION) {
    return "handle_taken";
  }

  // Past validateCharacter but refused by a CHECK constraint: a bug in the
  // rules, and it needs its own reason so the caller can be specific.
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

  // A malformed uuid: Postgres refuses the cast before considering a row, so it
  // arrives as an error. A miss, not a failure — 404 rather than 500.
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
  // `maybeSingle` keeps a missing row a miss. A junk id does not come through
  // here — it arrives as `bad_id`, which callers should treat as null.
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
    // Only the bought values are written. The six `_total` columns are
    // generated, and Postgres refuses an INSERT that names one.
    ability_str: values.abilities.str,
    ability_dex: values.abilities.dex,
    ability_con: values.abilities.con,
    ability_int: values.abilities.int,
    ability_wis: values.abilities.wis,
    ability_cha: values.abilities.cha,
    backstory: values.backstory,
    personality: values.personality,
  });

  return error ? failure(error) : { data: true, error: null };
}

/**
 * `.select("id")` makes the DELETE report the rows it removed. A DELETE
 * matching nothing is not an error and RLS filters silently, so without this a
 * stale or someone else's id looked exactly like a successful delete.
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
