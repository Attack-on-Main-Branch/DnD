"use server";

import { revalidatePath } from "next/cache";
import {
  insertCampaignItem,
  readCampaignItem,
  removeCampaignItem,
  rewriteCampaignItemCopies,
  updateCampaignItem,
} from "sina/data/inventory";
import {
  MAX_CAMPAIGN_ITEMS,
  readItemFacts,
  validateItem,
} from "sina/rules/inventory";

import { catalogueFacts } from "@/app/dashboard/inventory-presentation";
import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignSheetPath, campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The campaign's item catalogue, written and struck out from the Items tab.
 *
 * Separate from play/pack-actions.js: those move things between packs, these
 * decide what exists. Nothing here touches what anybody is carrying.
 */

/**
 * `already_carried` is the data layer's name for a unique violation, which on
 * this table means the name is taken — the same code, worded for where it
 * surfaced.
 */
const ITEM_COPY = {
  already_carried: "Something by that name is already written down.",
  limit_reached: `A campaign holds ${MAX_CAMPAIGN_ITEMS} items. Strike one out first.`,
  invalid_value: "That is outside what an item can hold.",
  not_found: "That campaign is no longer yours.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That campaign is no longer there.",
};

/** An edit that found no row: struck out meanwhile, or never this account's. */
const GONE = "That is no longer written down. It may have been struck out.";

/** The sheet shows the catalogue and the table searches it. */
function revalidateBoth(campaignId) {
  revalidatePath(campaignSheetPath(campaignId));
  revalidatePath(campaignTablePath(campaignId));
}

function refused(action, error, fallback) {
  const copy = ITEM_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/**
 * `validateItem` wants a quantity because the table's grants do; a catalogue
 * entry is a description rather than an amount, so one is supplied and dropped.
 * The slug it derives is the key a stack is kept under.
 */
export async function writeCampaignItem(campaignId, values) {
  const { values: item, errors } = validateItem({ ...values, quantity: 1 });

  if (errors) {
    return rejected(errors.name ?? errors.description ?? errors.quantity);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeCampaignItem", authError);
  }

  // "DMs write their own catalogue" answers for the owner and returns no row
  // to anybody else, which reads here as a miss.
  const { error } = await insertCampaignItem(supabase, { campaignId, item });

  if (error) {
    return refused("writeCampaignItem", error, "Could not write that down.");
  }

  revalidateBoth(campaignId);
  return { kind: "success", name: item.name };
}

/**
 * One rewritten in place, and the party's copies with it — every pack and
 * container at this table holding it changes to match, renamed stacks folding
 * into any already under the new name. The copies are written exactly as a
 * grant from the table's search writes them: see `campaignItems` in
 * api/items/search.
 */
export async function editCampaignItem(campaignId, id, values) {
  const { values: item, errors } = validateItem({ ...values, quantity: 1 });

  if (errors) {
    return rejected(errors.name ?? errors.description ?? errors.quantity);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("editCampaignItem", authError);
  }

  const { data: before, error: readError } = await readCampaignItem(supabase, {
    campaignId,
    id,
  });

  if (readError) {
    return readError.reason === "not_found"
      ? rejected(GONE)
      : refused("editCampaignItem/read", readError, "Could not save that.");
  }

  const { data: row, error } = await updateCampaignItem(supabase, {
    campaignId,
    id,
    item,
  });

  if (error) {
    return error.reason === "not_found"
      ? rejected(GONE)
      : refused("editCampaignItem", error, "Could not save that.");
  }

  const copies = await rewriteCampaignItemCopies(supabase, {
    campaignId,
    oldSlug: before.item_slug,
    item: {
      slug: row.item_slug,
      name: row.name,
      category: row.category,
      description: String(row.description ?? "").trim(),
    },
    facts: readItemFacts(catalogueFacts(row)),
  });

  revalidateBoth(campaignId);

  if (copies.error) {
    logFailure("editCampaignItem/copies", copies.error);

    return rejected(
      `${item.name} is saved, but the copies the party holds could not be changed.`,
    );
  }

  return { kind: "success", name: item.name };
}

/** One struck out. What the party is already carrying is untouched. */
export async function strikeCampaignItem(campaignId, id) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("strikeCampaignItem", authError);
  }

  const { error } = await removeCampaignItem(supabase, { campaignId, id });

  if (error) {
    return refused("strikeCampaignItem", error, "Could not strike that out.");
  }

  revalidateBoth(campaignId);
  return { kind: "success" };
}
