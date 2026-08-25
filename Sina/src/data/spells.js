/**
 * Every read and write against `character_spells` and `campaign_spells`.
 * Failures come back as a `reason` code, not a sentence. The policies in
 * 20260825090000 and 20260828090000 are the whole permission.
 *
 * The SLOTS are the exception and are not on either table — they are a jsonb
 * column on `characters`, which has no UPDATE policy, so the two RPCs at the
 * foot of this file are the only door. Both are atomic under a row lock: two
 * browsers spending the last 3rd-level slot must not both find it there.
 */

/**
 * `character_id` is here on purpose, as in inventory.js: the Dungeon Master
 * reads the party's spellbooks in one query and has to know whose each row is.
 */
const COLUMNS =
  "id, character_id, spell_slug, name, level, school, casting_time, " +
  "range_text, components, material, duration, concentration, ritual, " +
  "attack_save, damage, description, higher_level, classes, " +
  "damage_by_level, heal_by_level, created_at";

/** The campaign's own: no `is_prepared`, and no scaling tables. */
const CATALOGUE_COLUMNS =
  "id, spell_slug, name, level, school, casting_time, range_text, " +
  "components, material, duration, concentration, ritual, attack_save, " +
  "damage, description, higher_level, classes, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const INVALID_TEXT_REPRESENTATION = "22P02";

/** PostgREST's own code for a table it has no entry for — see activity.js. */
const SCHEMA_CACHE_MISS = "PGRST205";

function classify(error) {
  // The spellbook is unique on `(character_id, spell_slug)`, so this is a spell
  // already on the shelf rather than a race: the drawers do not offer one
  // twice, and a page left open still can.
  if (error.code === UNIQUE_VIOLATION) {
    return "already_known";
  }

  // Trigger-raised, so matched on the message: it has no SQLSTATE of its own
  // and stops being recognised if the migration changes the string.
  if (error.message?.includes("spell_limit_reached")) {
    return "limit_reached";
  }

  // Past readCatalogueSpell but refused by the bounds CHECK: a disagreement
  // between Sina/src/rules/spells.js and the migration.
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
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * Ordered the way a spellbook is read, not by `created_at` like the pack: a pack
 * is a bag and a spellbook is an index.
 */
export async function listCharacterSpells(supabase, characterId) {
  const { data, error } = await supabase
    .from("character_spells")
    .select(COLUMNS)
    .eq("character_id", characterId)
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The whole party's spellbooks in one round trip; RLS decides what comes back.
 * An empty party is answered without a query — PostgREST renders `in.()` as a
 * syntax error, and a new campaign has nobody in it.
 */
export async function listPartySpells(supabase, characterIds) {
  if (!characterIds || characterIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("character_spells")
    .select(COLUMNS)
    .in("character_id", characterIds)
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `.select()` makes the INSERT report the row, so an RLS refusal — which is no
 * row rather than a failure — is told apart from a write that landed.
 */
export async function learnSpell(supabase, { characterId, spell }) {
  const { data, error } = await supabase
    .from("character_spells")
    .insert({
      character_id: characterId,
      spell_slug: spell.slug,
      name: spell.name,
      level: spell.level,
      school: spell.school ?? "",
      casting_time: spell.castingTime ?? "",
      range_text: spell.range ?? "",
      components: spell.components ?? "",
      material: spell.material ?? "",
      duration: spell.duration ?? "",
      concentration: spell.concentration ?? false,
      ritual: spell.ritual ?? false,
      attack_save: spell.attackSave ?? "",
      damage: spell.damage ?? "",
      description: spell.description ?? "",
      higher_level: spell.higherLevel ?? "",
      classes: spell.classes ?? "",
      damage_by_level: spell.damageByLevel ?? {},
      heal_by_level: spell.healByLevel ?? {},
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
 * `.select("id")` makes the DELETE report what it removed: a DELETE matching
 * nothing is not an error and RLS filters silently, so without it somebody
 * else's character id looks exactly like a successful forget.
 */
export async function forgetSpell(supabase, { characterId, slug }) {
  const { data, error } = await supabase
    .from("character_spells")
    .delete()
    .eq("character_id", characterId)
    .eq("spell_slug", slug)
    .select("id");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return { data: null, error: { reason: "not_found", detail: "no row" } };
  }

  return { data: { slug }, error: null };
}

/**
 * One slot spent. `null` is a refusal — no such character, no such slot, none
 * left, or not the caller's to spend, and a caller may not tell those apart.
 */
export async function consumeSpellSlot(supabase, { characterId, slotLevel }) {
  const { data, error } = await supabase.rpc("consume_spell_slot", {
    target_character: characterId,
    p_slot: slotLevel,
  });

  if (error) {
    return failure(error);
  }

  return data === null
    ? { data: null, error: { reason: "no_slots", detail: null } }
    : { data, error: null };
}

/**
 * One slot back. Clamped at zero, and admitted for the Dungeon Master alone —
 * see 20260827090000.
 */
export async function restoreSpellSlot(supabase, { characterId, slotLevel }) {
  const { data, error } = await supabase.rpc("restore_spell_slot", {
    target_character: characterId,
    p_slot: slotLevel,
  });

  if (error) {
    return failure(error);
  }

  return data === null
    ? { data: null, error: { reason: "not_found", detail: null } }
    : { data, error: null };
}

/**
 * The catalogue is the Dungeon Master's alone. A player asking gets an empty
 * list rather than a failure, which is how an RLS boundary reads from here.
 */
export async function listCampaignSpells(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_spells")
    .select(CATALOGUE_COLUMNS)
    .eq("campaign_id", campaignId)
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `.select()` makes the INSERT report the row, so an RLS refusal — which is no
 * row rather than a failure — is told apart from a write that landed.
 */
export async function insertCampaignSpell(supabase, { campaignId, spell }) {
  const { data, error } = await supabase
    .from("campaign_spells")
    .insert({
      campaign_id: campaignId,
      spell_slug: spell.slug,
      name: spell.name,
      level: spell.level,
      school: spell.school ?? "",
      casting_time: spell.castingTime ?? "",
      range_text: spell.range ?? "",
      components: spell.components ?? "",
      material: spell.material ?? "",
      duration: spell.duration ?? "",
      concentration: spell.concentration ?? false,
      ritual: spell.ritual ?? false,
      attack_save: spell.attackSave ?? "",
      damage: spell.damage ?? "",
      description: spell.description ?? "",
      higher_level: spell.higherLevel ?? "",
      classes: spell.classes ?? "",
    })
    .select(CATALOGUE_COLUMNS)
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
 * `.select("id")` makes the DELETE report what it removed: RLS filters
 * silently, so without it somebody else's id looks like a successful strike.
 * Nothing follows it into the spellbooks — those rows are copies.
 */
export async function removeCampaignSpell(supabase, { campaignId, id }) {
  const { data, error } = await supabase
    .from("campaign_spells")
    .delete()
    .eq("id", id)
    .eq("campaign_id", campaignId)
    .select("id");

  if (error) {
    return failure(error);
  }

  if (!data || data.length === 0) {
    return { data: null, error: { reason: "not_found", detail: "no row" } };
  }

  return { data: { id }, error: null };
}
