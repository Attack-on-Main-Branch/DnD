"use server";

import { listCampaignActivity } from "sina/data/activity";
import {
  hideChest,
  revealChest,
  stockContainerItem,
  takeChestItem,
  transferContainer,
} from "sina/data/containers";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { MAX_CONTAINER_AUDIENCE } from "sina/rules/containers";
import {
  MAX_ITEM_QUANTITY,
  parseQuantity,
  readCatalogueItem,
  validateItem,
} from "sina/rules/inventory";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Everything the containers write from the table. Its own file rather than more
 * of pack-actions.js: that one moves what is in somebody's hands, these move
 * what is not.
 *
 * NOTHING HERE IS A PERMISSION. Each of the five is a definer function whose own
 * guards decide the answer; the ids arrive from a drawer, and a drawer decides
 * nothing.
 *
 * ONE ROUND TRIP EACH: the entry is written inside the same transaction as the
 * deed. Two of the five write no entry at all — stocking a chest and shutting
 * one are preparation, not something that happened at the table.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const CHEST_COPY = {
  not_found: "That is no longer there to open.",
  already_carried: "That is already in the chest. Try again.",
  invalid_value: "That is outside what a container can hold.",
  limit_reached: "There is no room for another container.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That is no longer at this table.",
};

async function signedIn(action) {
  const supabase = await createClient();
  const { user, error } = await getCurrentUser(supabase);

  return user ? { supabase } : { rejection: sessionRejection(action, error) };
}

function refused(action, error, fallback) {
  const copy = CHEST_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/** The log after the write that has just landed; absent if it cannot be read. */
async function freshLog(supabase, campaignId) {
  const { data, error } = await listCampaignActivity(
    supabase,
    campaignId,
    MAX_ACTIVITY_ENTRIES,
  );

  if (error) {
    logFailure("listCampaignActivity", error);
    return undefined;
  }

  return readActivityLog(data);
}

/**
 * The item and the amount, put back through the rules. The slug is re-derived
 * rather than trusted: it is the stacking key. `readMove`'s twin in
 * pack-actions.js, and deliberately identical.
 */
function readMove(item, quantity) {
  const values = item?.isCustom
    ? validateItem({ ...item, quantity: 1 }).values
    : readCatalogueItem(item ?? {});

  if (!values) {
    return { rejection: rejected("That is not an item a container can hold.") };
  }

  const count = parseQuantity(quantity);

  if (count === null || count < 1) {
    return { rejection: rejected(`A quantity is 1 to ${MAX_ITEM_QUANTITY}.`) };
  }

  return { values, count };
}

/**
 * A chest opened to the characters named, and to nobody else. The list is
 * bounded here and filtered against the party inside `reveal_chest` — this is
 * the one array in the app where one account names another's characters.
 *
 * Revealing to nobody is refused rather than treated as hiding: the drawer has
 * a Hide button for that.
 */
export async function revealChestTo(campaignId, containerId, visibleTo) {
  const named = [...new Set((visibleTo ?? []).filter(Boolean))];

  if (named.length === 0) {
    return rejected("Choose who may see it.");
  }

  if (named.length > MAX_CONTAINER_AUDIENCE) {
    return rejected("That is more characters than sit at this table.");
  }

  const { supabase, rejection } = await signedIn("revealChestTo");

  if (rejection) {
    return rejection;
  }

  const { error } = await revealChest(supabase, {
    containerId,
    visibleTo: named,
  });

  if (error) {
    return refused("revealChestTo", error, "Could not reveal that.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/** And shut again. No entry: the log is not the Dungeon Master's notebook. */
export async function hideChestFrom(campaignId, containerId) {
  const { supabase, rejection } = await signedIn("hideChestFrom");

  if (rejection) {
    return rejection;
  }

  const { error } = await hideChest(supabase, { containerId });

  if (error) {
    return refused("hideChestFrom", error, "Could not hide that.");
  }

  return { kind: "success" };
}

/**
 * Loot in, or loot back out. A CHANGE and not a total: a total is computed
 * against a row that may have moved since the drawer was drawn.
 *
 * No entry in the log — a line saying so would tell the party what is in it.
 */
export async function stockChestItem(campaignId, containerId, item, delta) {
  const size = Math.abs(Number(delta) || 0);
  const { values, count, rejection: bad } = readMove(item, size);

  if (bad) {
    return bad;
  }

  const { supabase, rejection } = await signedIn("stockChestItem");

  if (rejection) {
    return rejection;
  }

  const { error } = await stockContainerItem(supabase, {
    containerId,
    item: values,
    delta: delta > 0 ? count : -count,
  });

  if (error) {
    return refused("stockChestItem", error, "Could not change that.");
  }

  return { kind: "success" };
}

/**
 * Something taken out of a chest and into a pack. The ROW is named rather than
 * the slug: a slug alone would let a caller name something the chest never
 * held. Which pack it lands in is `take_chest_item`'s to check.
 */
export async function lootChestItem(
  campaignId,
  containerId,
  itemId,
  characterId,
  quantity,
) {
  const count = parseQuantity(quantity);

  if (count === null || count < 1) {
    return rejected(`A quantity is 1 to ${MAX_ITEM_QUANTITY}.`);
  }

  if (!containerId || !itemId || !characterId) {
    return rejected("There is nothing there to take.");
  }

  const { supabase, rejection } = await signedIn("lootChestItem");

  if (rejection) {
    return rejection;
  }

  const { error } = await takeChestItem(supabase, {
    containerId,
    itemId,
    characterId,
    quantity: count,
  });

  if (error) {
    return refused("lootChestItem", error, "Could not take that.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/**
 * A whole bag into somebody else's hands. One transaction: the bag, every row
 * inside it and the line in the log together.
 *
 * The seat is for the sentence and not the permission — the function re-derives
 * the chair and re-checks that this bag was the caller's to let go of.
 */
export async function passContainerTo(
  campaignId,
  containerId,
  ownerCharacterId,
  seatCharacterId = null,
) {
  if (!containerId) {
    return rejected("There is no bag to hand over.");
  }

  if (ownerCharacterId && ownerCharacterId === seatCharacterId) {
    return rejected("Choose who is being handed it.");
  }

  const { supabase, rejection } = await signedIn("passContainerTo");

  if (rejection) {
    return rejection;
  }

  const { error } = await transferContainer(supabase, {
    containerId,
    ownerCharacterId: ownerCharacterId ?? null,
    seatCharacterId,
  });

  if (error) {
    return refused("passContainerTo", error, "Could not hand that over.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}
