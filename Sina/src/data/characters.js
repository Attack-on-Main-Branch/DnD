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

/**
 * A new sheet. NOTHING HERE SETS A MAXIMUM: `characters_sync_max_hp` derives one
 * from the path, the rung and the Constitution before the row lands, and starts
 * the character whole. See 20260907090000 — the same trigger is what keeps the
 * figure true through every later edit, so the app has one door to it and not
 * four.
 */
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
    // Only the skills somebody touched; `{}` is the column's default.
    skills: values.skills,
    backstory: values.backstory,
    personality: values.personality,
  });

  return error ? failure(error) : { data: true, error: null };
}

/**
 * The sheet as its owner rewrote it, through a definer function for the reason
 * `change_character_health` is one: RLS grants rows and never columns, so the
 * narrowest UPDATE policy here would hand its holder the level a Dungeon Master
 * awards and the hit points a table calls out. The parameter list is the edit.
 *
 * NO MAXIMUM AMONG THE ARGUMENTS since 20260907090000. A race, a path or a
 * Constitution moving is exactly what decides one, so the trigger recomputes it
 * behind this write and carries the bar with it — there is nothing left for a
 * caller to get wrong.
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
 * A CHANGE AND NOT A TOTAL: the database adds `delta` to the row it has locked,
 * because a total posted a round trip later undoes anything that landed in
 * between — and the bar is the one number here two people move at once.
 *
 * `campaignId` scopes the second half of the permission: a character can play at
 * more than one table, and the function re-checks the membership itself.
 * Anybody else gets null, which is what a deleted character gives too.
 *
 * `seatCharacterId` is the CHAIR that acted, null for the head of the table. It
 * is what the log entry is filed under — the trigger on this column cannot read
 * that off the row — and omitting it moves the bar and writes no line.
 */
export async function updateCharacterHealth(
  supabase,
  { id, delta, campaignId, seatCharacterId = null },
) {
  const { data, error } = await supabase.rpc("change_character_health", {
    target_character: id,
    hp_delta: delta,
    target_campaign: campaignId,
    acting_seat: seatCharacterId,
  });

  if (error) {
    return failure(error);
  }

  if (data === null) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: { currentHp: data }, error: null };
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
