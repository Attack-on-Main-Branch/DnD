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
  "id, kind, name, discriminator, race, archetype, class_id, alignment, color_theme, level, current_hp, max_hp, " +
  "ability_str, ability_dex, ability_con, ability_int, ability_wis, ability_cha, " +
  "ability_str_total, ability_dex_total, ability_con_total, ability_int_total, ability_wis_total, ability_cha_total, " +
  "skills, spell_slots, backstory, personality, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";
const UNDEFINED_FUNCTION = "42883";
const FOREIGN_KEY_VIOLATION = "23503";
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Not a SQLSTATE: PostgREST's own code for a function it has no entry for. The
 * call never reaches Postgres, which is why `42883` alone never fired for an
 * unpushed migration. `data/activity.js` says the same about a missing TABLE.
 */
const FUNCTION_CACHE_MISS = "PGRST202";

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

  // The table is there and a column of it is not: a migration written but
  // never pushed. Its own reason, because the fix is a specific one.
  if (error.code === UNDEFINED_COLUMN) {
    return "missing_column";
  }

  // A migration written but never pushed, which is what `npm run db:list` is
  // for. The tests never reach a database, so nothing else catches it.
  if (error.code === UNDEFINED_FUNCTION || error.code === FUNCTION_CACHE_MISS) {
    return "missing_function";
  }

  // The character went away between the page rendering and the write landing.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
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
    // A character starts the day whole.
    max_hp: values.maxHp,
    current_hp: values.maxHp,
    // Only the bought values are written. The six `_total` columns are
    // generated, and Postgres refuses an INSERT that names one.
    ability_str: values.abilities.str,
    ability_dex: values.abilities.dex,
    ability_con: values.abilities.con,
    ability_int: values.abilities.int,
    ability_wis: values.abilities.wis,
    ability_cha: values.abilities.cha,
    // Only the skills somebody touched; `{}` is the column's default.
    skills: values.skills,
    backstory: values.backstory,
    personality: values.personality,
  });

  return error ? failure(error) : { data: true, error: null };
}

/**
 * The sheet as its owner rewrote it, through a definer function for the reason
 * `set_character_health` is one: RLS grants rows and never columns, so the
 * narrowest UPDATE policy here would hand its holder the level a Dungeon Master
 * awards and the hit points a table calls out. The parameter list is the edit.
 *
 * `false` is a refusal or a miss, deliberately the same answer. A handle
 * somebody else holds arrives as a unique violation — `handle_taken`.
 */
export async function updateCharacter(supabase, { id, values }) {
  const { data, error } = await supabase.rpc("update_character", {
    target_character: id,
    new_name: values.name,
    new_discriminator: values.discriminator,
    new_race: values.race,
    new_archetype: values.archetype,
    new_class_id: values.classId,
    new_alignment: values.alignment,
    new_color_theme: values.colorTheme,
    new_max_hp: values.maxHp,
    new_ability_str: values.abilities.str,
    new_ability_dex: values.abilities.dex,
    new_ability_con: values.abilities.con,
    new_ability_int: values.abilities.int,
    new_ability_wis: values.abilities.wis,
    new_ability_cha: values.abilities.cha,
    new_skills: values.skills,
    new_backstory: values.backstory,
    new_personality: values.personality,
  });

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: true, error: null };
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

/**
 * Hit points, through the definer function rather than an UPDATE. RLS grants
 * rows and not columns, so the narrowest policy that would let this write also
 * lets its holder rewrite the name and the handle — see
 * 20260821140000_health_and_notes.sql. The function writes one column of one
 * row, for a character the caller owns or one sitting in a campaign they run.
 *
 * `campaignId` scopes the second of those: a character can play at more than
 * one table, so the question is "is this the Dungeon Master of the campaign
 * that character is in", and the function re-checks the membership itself.
 *
 * Anybody else gets null, which is what a deleted character gives too — a
 * caller must not be able to tell a refusal from a miss.
 */
export async function updateCharacterHealth(
  supabase,
  { id, hitPoints, campaignId },
) {
  const { data, error } = await supabase.rpc("set_character_health", {
    target_character: id,
    hit_points: hitPoints,
    target_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  if (data === null) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: { currentHp: data }, error: null };
}

/**
 * The level, through a definer function for the same reason hit points go
 * through one: RLS grants rows and never columns.
 *
 * The head of the table alone, unlike health — damage is called out by whoever
 * runs the session, but a level is theirs to award. Everybody else gets null,
 * which is what a deleted character gives too.
 */
export async function updateCharacterLevel(
  supabase,
  { id, level, campaignId },
) {
  const { data, error } = await supabase.rpc("set_character_level", {
    target_character: id,
    new_level: level,
    target_campaign: campaignId,
  });

  if (error) {
    return failure(error);
  }

  if (data === null) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: { level: data }, error: null };
}

/** Newest first: the table shows the last thing written at the top. */
export async function listCharacterNotes(supabase, characterId) {
  const { data, error } = await supabase
    .from("character_notes")
    .select("id, body, created_at")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `created_at` is deliberately absent from the insert — the column's default is
 * the database's clock, which is the one every reader's timestamp is formatted
 * from.
 */
export async function insertCharacterNote(supabase, { characterId, body }) {
  const { data, error } = await supabase
    .from("character_notes")
    .insert({ character_id: characterId, body })
    .select("id, body, created_at")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  // RLS refuses an insert for somebody else's character by returning no row
  // rather than by failing.
  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}
