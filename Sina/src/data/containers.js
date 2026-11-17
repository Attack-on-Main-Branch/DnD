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

import { classifyDatabaseError } from "./database-errors.js";
import { COIN_TYPES } from "../rules/currency.js";

const COLUMNS =
  "id, campaign_id, name, type, owner_character_id, is_revealed, " +
  `visible_to_character_ids, created_at, ${COIN_TYPES.join(", ")}`;

const ITEM_COLUMNS =
  "id, container_id, item_slug, name, category, description, quantity, " +
  "is_custom, facts, created_at";

/** Postgres SQLSTATEs we can say something specific about. */
const UNIQUE_VIOLATION = "23505";

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

  if (error.code === "42703") {
    return "unknown";
  }

  return classifyDatabaseError(error);
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
export function listCampaignContainers(supabase, campaignId) {
  return listContainersForCampaigns(supabase, [campaignId]);
}

export async function listContainersForCampaigns(supabase, campaignIds) {
  if (!campaignIds?.length) {
    return { data: [], error: null };
  }

  const query = supabase.from("containers").select(COLUMNS);
  const scoped =
    campaignIds.length === 1
      ? query.eq("campaign_id", campaignIds[0])
      : query.in("campaign_id", campaignIds);
  const { data, error } = await scoped.order("created_at", { ascending: true });

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
 * Chests can start with coins. `is_revealed` and
 * `owner_character_id` are `reveal_chest`'s and `transfer_container`'s alone.
 */
export async function insertContainer(
  supabase,
  { campaignId, container, coins },
) {
  const { data, error } = await supabase
    .from("containers")
    .insert({
      campaign_id: campaignId,
      name: container.name,
      type: container.type,
      ...(container.type === "chest" && coins),
    })
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return failure(error);
  }

  return data ? { data, error: null } : REFUSED;
}

/**
 * The name and the kind, the only two columns 20261002090000 grants. A carried
 * bag turned into a chest is refused by `containers_bounds_check`, and reads as
 * `invalid_value`.
 */
export async function updateContainer(supabase, { campaignId, id, container }) {
  const { data, error } = await supabase
    .from("containers")
    .update({ name: container.name, type: container.type })
    .eq("id", id)
    .eq("campaign_id", campaignId)
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

export async function stockChestCoins(
  supabase,
  { campaignId, containerId, coin, amount },
) {
  const { data, error } = await supabase.rpc("stock_chest_coins", {
    p_campaign_id: campaignId,
    p_container_id: containerId,
    p_coin: coin,
    p_amount: amount,
  });
  return error
    ? failure(error)
    : data === null
      ? REFUSED
      : { data: { moved: data }, error: null };
}

export async function takeChestCoins(
  supabase,
  { campaignId, containerId, characterId, coin, amount },
) {
  const { data, error } = await supabase.rpc("take_chest_coins", {
    p_campaign_id: campaignId,
    p_container_id: containerId,
    p_character_id: characterId,
    p_coin: coin,
    p_amount: amount,
  });
  return error
    ? failure(error)
    : data === null
      ? REFUSED
      : { data: { moved: data }, error: null };
}
