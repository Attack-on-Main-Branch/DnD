"use server";

import { revalidatePath } from "next/cache";
import { insertCharacterNote } from "sina/data/characters";
import {
  grantInventoryItem,
  spendInventoryItem,
  transferInventoryItem,
} from "sina/data/inventory";
import {
  MAX_ITEM_QUANTITY,
  parseQuantity,
  readCatalogueItem,
  validateItem,
} from "sina/rules/inventory";

import { logFailure, logUncovered } from "@/lib/errors";
import { campaignTablePath, characterSheetPath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Everything the pack writes. Its own file rather than more of actions.js next
 * door: that one is the board's — health, notes and marks.
 *
 * The validation here is the run that counts. The drawers run the same
 * `sina/rules/inventory` functions in the browser for speed, and nothing that
 * arrives at these functions is believed.
 */

function rejected(message) {
  return { kind: "rejected", message };
}

/**
 * No error means auth said no and signing in again fixes it; an error means it
 * could not answer, and a login form only repeats the failure.
 */
function sessionRejection(action, error) {
  if (!error) {
    return rejected("Your session has expired. Sign in again.");
  }

  logFailure(`${action}/auth`, error);
  return rejected(
    "Could not reach the sign-in service. Try again in a moment.",
  );
}

/** Sina reports why; the wording lives here, where the user can see it. */
const PACK_COPY = {
  not_found: "That is no longer yours to carry.",
  already_carried: "That is already in the pack. Try again.",
  invalid_value: "That is outside what a pack can hold.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
};

/** Every character a write touched, so a transfer refreshes both ends of itself. */
function revalidatePacks(campaignId, characterIds) {
  revalidatePath(campaignTablePath(campaignId));

  for (const id of new Set(characterIds.filter(Boolean))) {
    revalidatePath(characterSheetPath(id));
  }
}

async function signedIn(action) {
  const supabase = await createClient();
  const { user, error } = await getCurrentUser(supabase);

  return user ? { supabase } : { rejection: sessionRejection(action, error) };
}

function refused(action, error, fallback) {
  const copy = PACK_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/**
 * The item and the amount, both put back through the rules. The slug is
 * re-derived rather than trusted, which is the whole reason this exists.
 */
function readMove(item, quantity) {
  const values = item?.isCustom
    ? validateItem({ ...item, quantity: 1 }).values
    : readCatalogueItem(item ?? {});

  if (!values) {
    return { rejection: rejected("That is not an item this pack can hold.") };
  }

  const count = parseQuantity(quantity);

  if (count === null || count < 1) {
    return { rejection: rejected(`A quantity is 1 to ${MAX_ITEM_QUANTITY}.`) };
  }

  return { values, count };
}

/**
 * Loot into one pack, or into every pack at the table. "All party" duplicates
 * rather than splits: a Dungeon Master handing out torches means one each.
 *
 * A grant that fails for one character does not roll back the others — there is
 * no transaction spanning six packs and there should not be.
 */
export async function grantPackItems(campaignId, characterIds, item, quantity) {
  const { values, count, rejection: bad } = readMove(item, quantity);

  if (bad) {
    return bad;
  }

  const targets = [...new Set((characterIds ?? []).filter(Boolean))];

  if (targets.length === 0) {
    return rejected("Choose who is being given it.");
  }

  const { supabase, rejection } = await signedIn("grantPackItems");

  if (rejection) {
    return rejection;
  }

  // Together rather than one after another: six round trips in sequence is a
  // visible pause on a control that has already told the user it worked.
  const results = await Promise.all(
    targets.map((characterId) =>
      grantInventoryItem(supabase, {
        characterId,
        item: values,
        quantity: count,
      }),
    ),
  );

  const failed = results.find((result) => result.error);

  revalidatePacks(campaignId, targets);

  return failed
    ? refused("grantPackItems", failed.error, "Could not hand that over.")
    : { kind: "success" };
}

/**
 * The Dungeon Master's stepper. A CHANGE and not a total, for the reason the
 * health band's reducer takes one: a total is computed against a row that may
 * have moved since the page was drawn, so two quick presses would both aim at
 * the same number.
 */
export async function adjustPackItem(campaignId, characterId, item, delta) {
  const size = Math.abs(Number(delta) || 0);
  const { values, count, rejection: bad } = readMove(item, size);

  if (bad) {
    return bad;
  }

  const { supabase, rejection } = await signedIn("adjustPackItem");

  if (rejection) {
    return rejection;
  }

  const { error } =
    delta > 0
      ? await grantInventoryItem(supabase, {
          characterId,
          item: values,
          quantity: count,
        })
      : await spendInventoryItem(supabase, {
          characterId,
          slug: values.slug,
          quantity: count,
        });

  if (error) {
    return refused("adjustPackItem", error, "Could not change that.");
  }

  revalidatePacks(campaignId, [characterId]);
  return { kind: "success" };
}

/**
 * Something used up, and the line about it in the character's own notebook.
 *
 * The note is best-effort: an item that has been drunk has been drunk, and a
 * failed write to `character_notes` is not a reason to tell the player
 * otherwise.
 */
export async function consumePackItem(campaignId, characterId, item, quantity) {
  const spent = await spendPack(
    "consumePackItem",
    campaignId,
    characterId,
    item,
    quantity,
    "Could not use that.",
  );

  if (spent.kind !== "success") {
    return spent;
  }

  const { error } = await insertCharacterNote(spent.supabase, {
    characterId,
    body: `Used ${spent.item.name}${spent.count > 1 ? ` ×${spent.count}` : ""}`,
  });

  if (error) {
    logFailure("consumePackItem/note", error);
  }

  return { kind: "success" };
}

/** Something thrown away. No note: what a party drops is not worth a line. */
export async function dropPackItem(campaignId, characterId, item, quantity) {
  const spent = await spendPack(
    "dropPackItem",
    campaignId,
    characterId,
    item,
    quantity,
    "Could not drop that.",
  );

  return spent.kind === "success" ? { kind: "success" } : spent;
}

/**
 * What Use and Drop have in common, which is everything but the note. Not
 * exported: the client it hands back must not cross the Action boundary.
 */
async function spendPack(
  action,
  campaignId,
  characterId,
  item,
  quantity,
  copy,
) {
  const { values, count, rejection: bad } = readMove(item, quantity);

  if (bad) {
    return bad;
  }

  const { supabase, rejection } = await signedIn(action);

  if (rejection) {
    return rejection;
  }

  const { error } = await spendInventoryItem(supabase, {
    characterId,
    slug: values.slug,
    quantity: count,
  });

  if (error) {
    return refused(action, error, copy);
  }

  revalidatePacks(campaignId, [characterId]);
  return { kind: "success", supabase, item: values, count };
}

/**
 * One pack to another, in one transaction. Which of them the caller may empty
 * is `transfer_inventory_item`'s to decide — it re-checks that both characters
 * are at the same table and that this one is the caller's to give from, so the
 * receiver's id arriving from a dropdown is not a permission.
 */
export async function handPackItem(
  campaignId,
  fromCharacterId,
  toCharacterId,
  item,
  quantity,
) {
  const { values, count, rejection: bad } = readMove(item, quantity);

  if (bad) {
    return bad;
  }

  if (!toCharacterId || toCharacterId === fromCharacterId) {
    return rejected("Choose who is being handed it.");
  }

  const { supabase, rejection } = await signedIn("handPackItem");

  if (rejection) {
    return rejection;
  }

  const { error } = await transferInventoryItem(supabase, {
    fromCharacterId,
    toCharacterId,
    item: values,
    quantity: count,
  });

  if (error) {
    return refused("handPackItem", error, "Could not hand that over.");
  }

  revalidatePacks(campaignId, [fromCharacterId, toCharacterId]);
  return { kind: "success" };
}
