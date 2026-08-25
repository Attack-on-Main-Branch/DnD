/**
 * Every read and write against `containers` and `container_items`. Failures
 * come back as a `reason` code, not a sentence.
 *
 * THE READS ARE PLAIN SELECTS and the WRITES ARE ALL RPCs. Every column here is
 * shareable with whoever may see the row at all, so RLS granting the row grants
 * the right thing; but every write is a deed with a transaction behind it —
 * handing a bag over moves what is inside it, revealing a chest writes a line
 * in the log — and neither is a column PostgREST should set on its own.
 *
 * `container_id` is in the item columns on purpose, unlike `user_id` elsewhere:
 * a drawer reads every chest at the table in one query.
 */

const COLUMNS =
  "id, campaign_id, name, type, owner_character_id, is_revealed, " +
  "visible_to_character_ids, created_at";

const ITEM_COLUMNS =
  "id, container_id, item_slug, name, category, description, quantity, " +
  "is_custom, facts, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNDEFINED_TABLE = "42P01";
const UNDEFINED_FUNCTION = "42883";
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Not SQLSTATEs: PostgREST's own codes for a function or a table it has no
 * entry for. The call never reaches Postgres, which is why `42883` alone never
 * fired for an unpushed migration. See the note in data/currency.js.
 */
const FUNCTION_CACHE_MISS = "PGRST202";
const SCHEMA_CACHE_MISS = "PGRST205";

function classify(error) {
  // Trigger-raised, so matched on the message: it has no SQLSTATE of its own
  // and stops being recognised if the migration changes the string.
  if (error.message?.includes("container_limit_reached")) {
    return "limit_reached";
  }

  // Two containers of one name are perfectly legal; this is the item key
  // inside one, and it means the same thing the pack's does.
  if (error.code === UNIQUE_VIOLATION) {
    return "already_carried";
  }

  // Past validateContainer but refused by the bounds CHECK: a disagreement
  // between Sina/src/rules/containers.js and the migration.
  if (error.code === CHECK_VIOLATION) {
    return "invalid_value";
  }

  // The campaign or the character went away between the page rendering and the
  // write landing.
  if (error.code === FOREIGN_KEY_VIOLATION) {
    return "not_found";
  }

  if (error.code === UNDEFINED_TABLE || error.code === SCHEMA_CACHE_MISS) {
    return "missing_table";
  }

  // A migration written but never pushed, which is what `npm run db:list` is
  // for. The tests never reach a database, so nothing else catches it.
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
    error: { reason: classify(error), detail: error.message },
  };
}

/**
 * False from a definer function is a refusal — not yours to move, not at this
 * table, not that kind of container — and reads as `not_found`, which is also
 * what a struck-out container gives. A caller must not be able to tell them
 * apart.
 */
const REFUSED = { data: null, error: { reason: "not_found", detail: null } };

/**
 * Every container the caller may see — RLS decides which. Oldest first, so a
 * card keeps its place as its contents move.
 */
export async function listCampaignContainers(supabase, campaignId) {
  const { data, error } = await supabase
    .from("containers")
    .select(COLUMNS)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * What is inside the ones nobody is carrying: every chest, and every bag not
 * yet picked up. A carried bag keeps its contents in `character_inventory`.
 *
 * An empty set is answered without a query — PostgREST renders `in.()` as a
 * syntax error.
 */
export async function listContainerItems(supabase, containerIds) {
  if (!containerIds || containerIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("container_items")
    .select(ITEM_COLUMNS)
    .in("container_id", containerIds)
    .order("created_at", { ascending: true });

  return error ? failure(error) : { data: data ?? [], error: null };
}

/**
 * `.select()` makes the INSERT report the row, so an RLS refusal — no row
 * rather than a failure — is told apart from a write that landed.
 *
 * The name and the kind, and nothing else: `is_revealed` and
 * `owner_character_id` are `reveal_chest`'s and `transfer_container`'s alone.
 */
export async function insertContainer(supabase, { campaignId, container }) {
  const { data, error } = await supabase
    .from("containers")
    .insert({
      campaign_id: campaignId,
      name: container.name,
      type: container.type,
    })
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  return data ? { data, error: null } : REFUSED;
}

/**
 * `.select("id")` makes the DELETE report what it removed: RLS filters
 * silently, so without it somebody else's id looks like a successful delete.
 * What is inside goes with it — both tables cascade on `container_id`.
 */
export async function removeContainer(supabase, { campaignId, id }) {
  const { data, error } = await supabase
    .from("containers")
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
 * The head of the table's stepper. A CHANGE and not a total: a total is
 * computed against a row that may have moved since the drawer was drawn.
 * `quantity` is what the container now holds; zero is a stack emptied.
 */
export async function stockContainerItem(
  supabase,
  { containerId, item, delta },
) {
  const { data, error } = await supabase.rpc("stock_container_item", {
    p_container_id: containerId,
    p_item_slug: item.slug,
    p_name: item.name,
    p_desc: item.description ?? "",
    p_category: item.category,
    p_facts: item.facts ?? {},
    p_is_custom: item.isCustom ?? false,
    p_delta: delta,
  });

  if (error) {
    return failure(error);
  }

  return data === null ? REFUSED : { data: { quantity: data }, error: null };
}

/**
 * A whole bag into somebody else's hands, in one transaction: the bag and
 * everything in it move together or neither does. The seat is for the line in
 * the log and is not a permission — `transfer_container` re-derives the chair.
 */
export async function transferContainer(
  supabase,
  { containerId, ownerCharacterId, seatCharacterId = null },
) {
  const { data, error } = await supabase.rpc("transfer_container", {
    p_container_id: containerId,
    p_new_owner_id: ownerCharacterId,
    p_seat: seatCharacterId,
  });

  if (error) {
    return failure(error);
  }

  return data
    ? { data: { ownerCharacterId }, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

/** Shown to the named characters, and to nobody else. The head of the table's. */
export async function revealChest(supabase, { containerId, visibleTo }) {
  const { data, error } = await supabase.rpc("reveal_chest", {
    p_container_id: containerId,
    p_visible_char_ids: visibleTo ?? [],
  });

  if (error) {
    return failure(error);
  }

  return data ? { data: { visibleTo }, error: null } : REFUSED;
}

/** And back into the dark. The audience is kept — see the migration. */
export async function hideChest(supabase, { containerId }) {
  const { data, error } = await supabase.rpc("hide_chest", {
    p_container_id: containerId,
  });

  if (error) {
    return failure(error);
  }

  return data ? { data: { containerId }, error: null } : REFUSED;
}

/**
 * Loot out of a chest and into a pack. The ROW is named rather than the slug: a
 * slug alone would let a caller name something the chest never held.
 * `remaining` is what is left in the chest — zero when the stack is gone.
 */
export async function takeChestItem(
  supabase,
  { containerId, itemId, characterId, quantity },
) {
  const { data, error } = await supabase.rpc("take_chest_item", {
    p_container_id: containerId,
    p_item_id: itemId,
    p_target_char_id: characterId,
    p_quantity: quantity,
  });

  if (error) {
    return failure(error);
  }

  return data === null ? REFUSED : { data: { remaining: data }, error: null };
}
