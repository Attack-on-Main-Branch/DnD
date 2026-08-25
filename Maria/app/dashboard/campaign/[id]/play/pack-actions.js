"use server";

import {
  listCampaignActivity,
  recordCampaignActivity,
} from "sina/data/activity";
import {
  grantInventoryItem,
  moveInventoryItem,
  spendInventoryItem,
  transferInventoryItem,
} from "sina/data/inventory";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
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
 * Everything the pack writes. Its own file rather than more of actions.js next
 * door: that one is the board's — health, notes and marks.
 *
 * The validation here is the run that counts. The drawers run the same
 * `sina/rules/inventory` functions in the browser for speed, and nothing that
 * arrives at these functions is believed.
 *
 * ONE ROUND TRIP EACH: the trigger in 20260830090000 writes the entry inside the
 * same transaction as the row it describes, and the fresh log comes back in the
 * same response. The `campaignId` and the seat travel down to the RPC because
 * they are the two things that trigger cannot read off the row.
 *
 * THE SEAT IS NOT A PERMISSION — `arm_table_log` puts it back through
 * `my_seat_at_table`, and who may empty which pack is the RPC's own guards and
 * the table's policies to decide.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const PACK_COPY = {
  not_found: "That is no longer yours to carry.",
  already_carried: "That is already in the pack. Try again.",
  invalid_value: "That is outside what a pack can hold.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
};

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
 * The log after the write that has just landed. Absent rather than failed when
 * it cannot be read: a line describes something that already happened.
 */
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
 *
 * ONE PACK AND THE WHOLE PARTY ARE LOGGED DIFFERENTLY, and have to be. One pack
 * is one row change, so the trigger writes it. Six packs are six transactions
 * and one sentence, which no trigger can add up — so they arm nothing and the
 * entry is written here, with a null recipient that `record_campaign_activity`
 * turns into "the party". The name is never one this file chose.
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

  const alone = targets.length === 1;

  // Together rather than one after another: six round trips in sequence is a
  // visible pause on a control that has already told the user it worked.
  const results = await Promise.all(
    targets.map((characterId) =>
      grantInventoryItem(supabase, {
        characterId,
        item: values,
        quantity: count,
        campaignId,
        // Only the head of the table hands things out, so the chair is theirs.
        seatCharacterId: null,
        deed: alone ? "item_granted" : null,
      }),
    ),
  );

  const failed = results.find((result) => result.error);

  if (failed) {
    return refused("grantPackItems", failed.error, "Could not hand that over.");
  }

  if (!alone) {
    const { error } = await recordCampaignActivity(supabase, {
      campaignId,
      actorCharacterId: null,
      action: "item_granted",
      targetCharacterId: null,
      itemName: values.name,
      quantity: count,
    });

    if (error) {
      logFailure("grantPackItems/record", error);
    }
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/**
 * The Dungeon Master's stepper. A CHANGE and not a total, for the reason the
 * health band's reducer takes one: a total is computed against a row that may
 * have moved since the page was drawn, so two quick presses would both aim at
 * the same number.
 *
 * `containerId` is which of their bags, null being the pack — the whole of
 * what tells rope in the Bag of Holding from rope in the pack.
 */
export async function adjustPackItem(
  campaignId,
  characterId,
  item,
  delta,
  containerId = null,
) {
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
          campaignId,
          seatCharacterId: null,
          deed: "item_granted",
          containerId,
        })
      : await spendInventoryItem(supabase, {
          characterId,
          slug: values.slug,
          quantity: count,
          campaignId,
          seatCharacterId: null,
          // Taking something back out of a pack is the head of the table's
          // alone, and `record_campaign_activity` says the same of the entry.
          deed: "item_revoked",
          containerId,
        });

  if (error) {
    return refused("adjustPackItem", error, "Could not change that.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/**
 * Something used up. No note: the notebook is written in by hand, and a line
 * nobody chose to write is noise in the one place a player keeps their own
 * account of the session.
 */
export async function consumePackItem(
  campaignId,
  characterId,
  item,
  quantity,
  containerId = null,
) {
  return spendPack(
    "consumePackItem",
    "item_used",
    campaignId,
    characterId,
    item,
    quantity,
    "Could not use that.",
    containerId,
  );
}

/** Something thrown away. */
export async function dropPackItem(
  campaignId,
  characterId,
  item,
  quantity,
  containerId = null,
) {
  return spendPack(
    "dropPackItem",
    "item_dropped",
    campaignId,
    characterId,
    item,
    quantity,
    "Could not drop that.",
    containerId,
  );
}

/**
 * What Use and Drop have in common, which is everything but the word the log
 * uses: both are a quantity going down, so the deed has to be named for the
 * trigger. The seat is the pack's own character — only a player uses or drops,
 * and a Dungeon Master emptying somebody's pack comes through `adjustPackItem`.
 */
async function spendPack(
  action,
  deed,
  campaignId,
  characterId,
  item,
  quantity,
  copy,
  containerId,
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
    campaignId,
    seatCharacterId: characterId,
    deed,
    containerId,
  });

  if (error) {
    return refused(action, error, copy);
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}

/**
 * A stack from one pocket of a coat to another; null is the pack at either end.
 *
 * NO CAMPAIGN, unlike every other action here, and that absence is the point:
 * nothing is written down. Moving rope into a bag is not something that
 * happened at the table.
 *
 * Which bags are theirs is `move_inventory_item`'s to decide.
 */
export async function stowPackItem(
  characterId,
  item,
  quantity,
  fromContainerId,
  toContainerId,
) {
  const { values, count, rejection: bad } = readMove(item, quantity);

  if (bad) {
    return bad;
  }

  const { supabase, rejection } = await signedIn("stowPackItem");

  if (rejection) {
    return rejection;
  }

  const { error } = await moveInventoryItem(supabase, {
    characterId,
    slug: values.slug,
    quantity: count,
    fromContainerId: fromContainerId ?? null,
    toContainerId: toContainerId ?? null,
  });

  if (error) {
    return refused("stowPackItem", error, "Could not move that.");
  }

  return { kind: "success" };
}

/**
 * One pack to another, in one transaction. Which of them the caller may empty
 * is `transfer_inventory_item`'s to decide — it re-checks that both characters
 * are at the same table and that this one is the caller's to give from, so the
 * receiver's id arriving from a dropdown is not a permission.
 *
 * Two rows move and the sentence is one, which the trigger settles by filing the
 * giver's change and staying quiet for the receiver's.
 *
 * `containerId` is the GIVER'S bag: what is handed across a table arrives in
 * the hand, and stowing it is the receiver's own decision.
 */
export async function handPackItem(
  campaignId,
  fromCharacterId,
  toCharacterId,
  item,
  quantity,
  containerId = null,
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
    campaignId,
    seatCharacterId: fromCharacterId,
    containerId,
  });

  if (error) {
    return refused("handPackItem", error, "Could not hand that over.");
  }

  return { kind: "success", activity: await freshLog(supabase, campaignId) };
}
