/**
 * Every read and write against `character_inventory` and `campaign_items`.
 * Failures come back as a `reason` code, not a sentence.
 *
 * The three writes go through an RPC for two different reasons.
 * `grant_inventory_item` and `spend_inventory_item` run with the CALLER's
 * rights — the policies in 20260822120000 are the whole permission, and the
 * functions exist because PostgREST can set a quantity but not add to one.
 * `transfer_inventory_item` is the definer: it writes a row into somebody
 * else's pack, which no policy grants and none should.
 */

/**
 * `character_id` is here on purpose, unlike `user_id` elsewhere in this layer:
 * the Dungeon Master reads the whole party's packs in one query and has to know
 * whose each row is.
 */
const COLUMNS =
  "id, character_id, item_slug, name, category, description, quantity, " +
  "is_custom, facts, created_at";

const CATALOGUE_COLUMNS =
  "id, item_slug, name, category, description, cost_quantity, cost_unit, " +
  "weight, damage_dice, damage_type, armor_class, properties, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

function classify(error) {
  // A catalogue entry written twice under one name. The pack's own functions
  // swallow the ordinary case with `on conflict`; the catalogue means it.
  if (error.code === UNIQUE_VIOLATION) {
    return "already_carried";
  }

  // Trigger-raised, so matched on the message: it has no SQLSTATE of its own
  // and stops being recognised if the migration changes the string.
  if (error.message?.includes("item_limit_reached")) {
    return "limit_reached";
  }

  // Past validateItem but refused by the bounds CHECK: a disagreement between
  // Sina/src/rules/inventory.js and the migration.
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // The character went away between the page rendering and the write landing.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === UNDEFINED_TABLE) {
    return "missing_table";
  }

  // A migration written but never pushed, which is what `npm run db:list` is
  // for. The tests never reach a database, so nothing else catches it.
  if (error.code === UNDEFINED_FUNCTION) {
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
    error: { reason: classify(error), detail: error.message },
  };
}

/** Oldest first, so a stack keeps its place in the grid as its quantity moves. */
export async function listCharacterInventory(supabase, characterId) {
  const { data, error } = await supabase
    .from("character_inventory")
    .select(COLUMNS)
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The whole party's packs in one round trip. RLS decides what comes back — a
 * player calling this gets their own rows and nobody else's.
 *
 * An empty party is answered without a query: PostgREST renders `in.()` as a
 * syntax error, and a campaign with nobody in it is the ordinary state of a new
 * one.
 */
export async function listPartyInventory(supabase, characterIds) {
  if (!characterIds || characterIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("character_inventory")
    .select(COLUMNS)
    .in("character_id", characterIds)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * The catalogue is the Dungeon Master's alone — see the policies in
 * 20260822160000. A player asking gets an empty list rather than a failure,
 * which is how an RLS boundary reads from this side.
 */
export async function listCampaignItems(supabase, campaignId) {
  const { data, error } = await supabase
    .from("campaign_items")
    .select(CATALOGUE_COLUMNS)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `.select()` makes the INSERT report the row, so an RLS refusal — which is no
 * row rather than a failure — is told apart from a write that landed.
 */
export async function insertCampaignItem(supabase, { campaignId, item }) {
  const { data, error } = await supabase
    .from("campaign_items")
    .insert({
      campaign_id: campaignId,
      item_slug: item.slug,
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      cost_quantity: item.cost ?? 0,
      cost_unit: item.costUnit ?? "",
      weight: item.weight ?? 0,
      damage_dice: item.damageDice ?? "",
      damage_type: item.damageType ?? "",
      armor_class: item.armorClass ?? 0,
      properties: item.properties ?? "",
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
 * `.select("id")` makes the DELETE report what it removed: a DELETE matching
 * nothing is not an error and RLS filters silently, so without it somebody
 * else's id looks exactly like a successful delete.
 *
 * Nothing follows it into the packs — what a character is already carrying is a
 * copy made when it was handed over. See the note atop 20260822160000.
 */
export async function removeCampaignItem(supabase, { campaignId, id }) {
  const { data, error } = await supabase
    .from("campaign_items")
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

/**
 * Null from the function is a refusal — an out-of-range quantity, or policies
 * that matched no row — and reads here as `not_found`, which is also what a
 * deleted character gives. A caller must not be able to tell them apart.
 */
export async function grantInventoryItem(
  supabase,
  { characterId, item, quantity },
) {
  const { data, error } = await supabase.rpc("grant_inventory_item", {
    target_character: characterId,
    p_item_slug: item.slug,
    p_name: item.name,
    p_desc: item.description ?? "",
    p_category: item.category,
    p_quantity: quantity,
    p_is_custom: item.isCustom ?? false,
    p_facts: item.facts ?? {},
  });

  if (error) {
    return failure(error);
  }

  if (data === null) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: { quantity: data }, error: null };
}

/**
 * Used, dropped, or revoked by the Dungeon Master: the three differ in what is
 * written in the notes afterwards, not in what happens to the row.
 *
 * `remaining` is zero when the stack is gone; null is nothing there, or nothing
 * granted.
 */
export async function spendInventoryItem(
  supabase,
  { characterId, slug, quantity },
) {
  const { data, error } = await supabase.rpc("spend_inventory_item", {
    target_character: characterId,
    p_item_slug: slug,
    p_quantity: quantity,
  });

  if (error) {
    return failure(error);
  }

  if (data === null) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  return { data: { remaining: data }, error: null };
}

/**
 * One pack to another, in one transaction. `false` is a refusal — not enough of
 * it, not at the same table, or not the caller's to move — and comes back as
 * `not_found` because the three must not be distinguishable from outside.
 */
export async function transferInventoryItem(
  supabase,
  { fromCharacterId, toCharacterId, item, quantity },
) {
  const { data, error } = await supabase.rpc("transfer_inventory_item", {
    p_from_char_id: fromCharacterId,
    p_to_char_id: toCharacterId,
    p_item_slug: item.slug,
    p_name: item.name,
    p_desc: item.description ?? "",
    p_category: item.category,
    p_quantity: quantity,
    p_facts: item.facts ?? {},
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: { quantity }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}
