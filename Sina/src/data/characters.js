/**
 * Every read and write against the `characters` table and the
 * `character-avatars` bucket. Failures come back as a `reason` code rather
 * than a sentence.
 */

import { removeObject, uploadObject } from "./storage.js";

/** The bucket, and what its reasons are named after — see storage.js. */
const BUCKET = "character-avatars";
const SUBJECT = "avatar";

/**
 * A column list rather than `*`, so `user_id` never travels to the client — a
 * test asserts it stays out. The generated `_total` columns are read alongside
 * the base ones, so the sheet prints the number Postgres would sort by.
 */
const COLUMNS =
  "id, kind, name, discriminator, race, archetype, class_id, alignment, dice_color, avatar_url, level, xp, current_hp, max_hp, " +
  "armor_class, death_saves, is_dead, hit_dice_spent, custom_proficiencies, conditions, " +
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
export async function insertCharacter(supabase, { id, userId, values }) {
  const { error } = await supabase.from("characters").insert({
    /* Named by the caller, because the portrait's object is named after the
       character and had to be uploaded before the row could exist — the same
       order, and the same reason, as a campaign and its map. */
    id,
    user_id: userId,
    kind: "player",
    name: values.name,
    discriminator: values.discriminator,
    race: values.race,
    archetype: values.archetype,
    class_id: values.classId,
    alignment: values.alignment,
    /* `color_theme` is NOT written here and must not be: the trigger added in
       20260919090000 mirrors it off this column, which is what keeps the name
       it used to go by from ever disagreeing with the one it goes by now. */
    dice_color: values.diceColor,
    avatar_url: values.avatarUrl ?? null,
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
 * THE PORTRAIT IS A URL AND NOT A FILE. The object is already in the bucket by
 * the time this runs — the Server Action puts it there — so what the sheet
 * carries is where it landed, and `null` is a character back to their disc.
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
    new_dice_color: values.diceColor,
    new_avatar_url: values.avatarUrl ?? null,
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
 * `.select(…)` makes the DELETE report the row it removed. A DELETE matching
 * nothing is not an error and RLS filters silently, so without this a stale or
 * someone else's id looked exactly like a successful delete.
 *
 * The portrait's URL comes back with it: this is the last moment anything
 * points at that object, and a character who is gone should not leave a face
 * behind in the bucket. The caller does the sweeping — the same division
 * `removeCampaign` and its map are written along.
 */
export async function removeCharacter(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("characters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, avatar_url");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return {
      data: null,
      error: { reason: "not_found", detail: "No character matched that id." },
    };
  }

  return { data: { avatarUrl: data[0].avatar_url }, error: null };
}

/**
 * Where a character's portrait is now, and nothing else.
 *
 * The edit sheet needs it twice over: to leave the column alone when no new
 * picture was chosen, and to know which object to sweep up when one was. A
 * column list of one, because that is the whole question.
 */
export async function getCharacterAvatarUrl(supabase, { id, userId }) {
  const { data, error } = await supabase
    .from("characters")
    .select("avatar_url")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return error
    ? failure(error)
    : { data: data?.avatar_url ?? null, error: null };
}

/**
 * The portrait, up into the bucket. Server-side only, like every other query
 * here: the session cookies are `httpOnly`, so a browser client would reach
 * Storage unauthenticated and be refused by the policy in silence.
 *
 * The path names the owner's uid in its first segment and the policy compares
 * exactly that — see `avatarObjectPath` in rules/character.js.
 */
export async function uploadCharacterAvatar(supabase, { path, file }) {
  return uploadObject(supabase, {
    bucket: BUCKET,
    path,
    file,
    subject: SUBJECT,
  });
}

/**
 * The portrait a character has stopped wearing: replaced, cleared, or one whose
 * row never landed. Reports rather than throws, for the reason a map's cleanup
 * does — an orphaned object is invisible to everyone but an operator.
 */
export async function removeCharacterAvatar(supabase, path) {
  return removeObject(supabase, { bucket: BUCKET, path, subject: SUBJECT });
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

/**
 * What happens at zero hit points, and the shield that decides how often you get
 * there. Five doors, all of them RPCs, all of them definers — see
 * 20260909090000 for why each is a function rather than a policy.
 *
 * The campaign and the chair ride along on every one: a character sits at more
 * than one table, so "may the Dungeon Master do this" is never a question about
 * a character alone, and the log needs both to leave a line.
 *
 * NULL FROM ANY OF THEM IS A REFUSAL, and it reads the same as a character
 * deleted between the press and the call. A caller must not be able to tell
 * those apart.
 */
async function deed(supabase, name, args, shape) {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    return failure(error);
  }

  if (data === null || data === undefined) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: shape(data), error: null };
}

/** A hit point figure and the two flags that go with it, off a jsonb answer. */
function readState(answer) {
  return {
    currentHp: answer.current_hp,
    isDead: Boolean(answer.is_dead),
    deathSaves: {
      successes: answer.successes ?? 0,
      failures: answer.failures ?? 0,
    },
    instantDeath: Boolean(answer.instant_death),
  };
}

export async function applyDamage(
  supabase,
  { id, damage, campaignId, seatCharacterId = null },
) {
  return deed(
    supabase,
    "apply_damage",
    {
      p_char_id: id,
      p_damage: damage,
      p_campaign: campaignId,
      p_seat: seatCharacterId,
    },
    readState,
  );
}

export async function applyHeal(
  supabase,
  { id, heal, campaignId, seatCharacterId = null },
) {
  return deed(
    supabase,
    "apply_heal",
    {
      p_char_id: id,
      p_heal: heal,
      p_campaign: campaignId,
      p_seat: seatCharacterId,
    },
    readState,
  );
}

/**
 * One death save. `roll` is the face the table's own d20 came to rest on — the
 * board is a physics simulation and cannot be told what to land on, so the
 * number it produced is what the rules are applied to. Null lets the database
 * roll its own, which is what a table with the board switched off gets.
 */
export async function rollDeathSave(
  supabase,
  { id, roll = null, campaignId, seatCharacterId = null },
) {
  return deed(
    supabase,
    "roll_death_save",
    {
      p_char_id: id,
      p_roll_override: roll,
      p_campaign: campaignId,
      p_seat: seatCharacterId,
    },
    (answer) => ({
      ...readState(answer),
      roll: answer.roll,
      outcome: answer.outcome,
      revived: Boolean(answer.revived),
    }),
  );
}

/**
 * The blow that finishes somebody already at zero. The head of the table's
 * alone, and only on a character who is down — `kill_character` refuses the rest.
 */
export async function killCharacter(supabase, { id, campaignId }) {
  return deed(
    supabase,
    "kill_character",
    { p_char_id: id, p_campaign: campaignId },
    readState,
  );
}

/** The head of the table's alone — `revive_character` refuses anybody else. */
export async function reviveCharacter(supabase, { id, campaignId }) {
  return deed(
    supabase,
    "revive_character",
    { p_char_id: id, p_campaign: campaignId },
    readState,
  );
}

/**
 * One hit die out of the pool, at the face the table's own die came to rest on.
 * `spend_hit_die` turns it into hit points through `apply_heal`, so the bar, the
 * death saves and the log all move the way they do for any other heal.
 */
export async function spendHitDie(
  supabase,
  { id, roll = null, campaignId, seatCharacterId = null },
) {
  return deed(
    supabase,
    "spend_hit_die",
    {
      p_char_id: id,
      p_roll_override: roll,
      p_campaign: campaignId,
      p_seat: seatCharacterId,
    },
    (answer) => ({
      roll: answer.roll,
      faces: answer.faces,
      modifier: answer.modifier,
      gained: answer.gained,
      hitDiceSpent: answer.hit_dice_spent,
      currentHp: answer.current_hp,
    }),
  );
}

/**
 * One condition on or off, decided against the row the function has locked. The
 * answer says which way it went: neither the log line nor the toast can work
 * that out from an array.
 */
export async function toggleCondition(
  supabase,
  { id, key, campaignId, seatCharacterId = null },
) {
  return deed(
    supabase,
    "toggle_character_condition",
    {
      p_char_id: id,
      p_key: key,
      p_campaign: campaignId,
      p_seat: seatCharacterId,
    },
    (answer) => ({
      applied: Boolean(answer.applied),
      conditions: answer.conditions ?? [],
      characterIds: answer.characterIds ?? [],
    }),
  );
}

/**
 * The same for everybody at a table. One direction for the whole party — see
 * `toggle_party_condition`, which decides it — so the answer carries no list of
 * conditions, only who it reached.
 */
export async function togglePartyCondition(
  supabase,
  { campaignId, key, characterIds = null, seatCharacterId = null },
) {
  return deed(
    supabase,
    "toggle_party_condition",
    {
      p_campaign: campaignId,
      p_key: key,
      p_char_ids: characterIds,
      p_seat: seatCharacterId,
    },
    (answer) => ({
      applied: Boolean(answer.applied),
      characterIds: answer.characterIds ?? [],
    }),
  );
}

export async function updateArmorClass(
  supabase,
  { id, armorClass, campaignId },
) {
  return deed(
    supabase,
    "update_armor_class",
    { p_char_id: id, p_ac: armorClass, p_campaign: campaignId },
    (landed) => ({ armorClass: landed }),
  );
}

/**
 * One of the six, set by the head of the table. `total` is the number on the
 * card and the column holds the award alone; `set_ability_score` does that
 * subtraction against the row it locks, so what comes back is what landed.
 *
 * THE DUNGEON MASTER'S ALONE, unlike `update_armor_class` next door: a player
 * raising their own Strength is the fifteen-point budget being walked around.
 */
export async function updateAbilityScore(
  supabase,
  { id, ability, total, campaignId },
) {
  return deed(
    supabase,
    "set_ability_score",
    {
      p_char_id: id,
      p_ability: ability,
      p_total: total,
      p_campaign: campaignId,
    },
    (landed) => ({ total: landed }),
  );
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

/**
 * One note rewritten. `body` and nothing else — `character_id` is what decides
 * whose the row is, and the UPDATE policy in 20260908090000 checks the same
 * predicate before and after, so it could not be moved anyway.
 *
 * `created_at` is left where it was: the note is when it was written, not when
 * it was last touched, and a ledger that reordered itself under a typo fix
 * would lose the thread of the session it belongs to.
 *
 * A row the caller does not own is refused by RLS as no row rather than as a
 * failure, which is the same answer a note somebody has already struck out
 * gives — and a caller must not be able to tell those apart.
 */
export async function updateCharacterNote(supabase, { id, characterId, body }) {
  const { data, error } = await supabase
    .from("character_notes")
    .update({ body })
    .eq("id", id)
    // A second lock on the same door, the way every read here carries one.
    .eq("character_id", characterId)
    .select("id, body, created_at")
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data, error: null };
}

/** The same door the other way. A note struck out is gone, not hidden. */
export async function deleteCharacterNote(supabase, { id, characterId }) {
  const { data, error } = await supabase
    .from("character_notes")
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
