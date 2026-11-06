"use server";

import { revalidatePath } from "next/cache";
import {
  cleanupItemDocuments,
  prepareItemDocumentUpload,
  readItemDocumentUpload,
  removeItemDocumentUpload,
} from "sina/data/item-documents";
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
import {
  itemDocumentFileError,
  isItemDocumentPath,
  validateItemDocument,
} from "sina/rules/item-document";

import { ITEM_DOCUMENT_COPY } from "@/app/dashboard/item-document-copy";
import { catalogueFacts } from "@/app/dashboard/inventory-presentation";
import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignSheetPath, campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The campaign's item catalogue, written and struck out from the Items tab.
 *
 * Separate from play/pack-actions.js: those move things between packs, these
 * decide what exists and propagate catalogue changes to distributed copies.
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

async function cleanDocuments(supabase, campaignId) {
  const { error } = await cleanupItemDocuments(supabase, campaignId);
  if (error) logFailure("cleanupItemDocuments", error);
  return Boolean(error);
}

export async function retryItemDocumentCleanup(campaignId) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);
  if (!user) return sessionRejection("retryItemDocumentCleanup", authError);
  const cleanupPending = await cleanDocuments(supabase, campaignId);
  revalidateBoth(campaignId);
  return cleanupPending
    ? rejected("The files could not be deleted. Try again in a moment.")
    : { kind: "success", cleanupPending: false };
}

async function readDocument(supabase, campaignId, document) {
  if (document == null) {
    return { values: null, error: null };
  }

  if (!isItemDocumentPath(document.path, campaignId)) {
    return { values: null, error: "invalid_document" };
  }

  const { data: file, error: uploadError } = await readItemDocumentUpload(
    supabase,
    document.path,
  );

  if (uploadError) {
    logFailure("readItemDocumentUpload", uploadError);
    return { values: null, error: uploadError.reason };
  }

  const error = itemDocumentFileError({ name: document.name, size: file.size });

  if (error) {
    return { values: null, error };
  }

  const checked = validateItemDocument({
    name: document.name,
    html: await file.text(),
  });
  return checked.error
    ? checked
    : { values: { name: document.name, path: document.path }, error: null };
}

export async function beginItemDocumentUpload(campaignId, file) {
  const error = itemDocumentFileError(file);
  if (error) return rejected(ITEM_DOCUMENT_COPY[error]);

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);
  if (!user) return sessionRejection("beginItemDocumentUpload", authError);

  const result = await prepareItemDocumentUpload(supabase, campaignId);
  if (result.error) {
    logFailure("beginItemDocumentUpload", result.error);
    return rejected(ITEM_DOCUMENT_COPY.document_upload_failed);
  }
  return { kind: "success", ...result.data };
}

export async function discardItemDocumentUpload(campaignId, path) {
  if (!isItemDocumentPath(path, campaignId)) return;
  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);
  if (!user) return;
  const { error } = await removeItemDocumentUpload(supabase, path);
  if (error) logFailure("discardItemDocumentUpload", error);
}

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
export async function writeCampaignItem(
  campaignId,
  values,
  uploadedDocument = null,
) {
  const { values: item, errors } = validateItem({ ...values, quantity: 1 });

  if (errors) {
    return rejected(errors.name ?? errors.description ?? errors.quantity);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeCampaignItem", authError);
  }

  const document = await readDocument(supabase, campaignId, uploadedDocument);

  if (document.error) {
    return rejected(ITEM_DOCUMENT_COPY[document.error]);
  }

  // "DMs write their own catalogue" answers for the owner and returns no row
  // to anybody else, which reads here as a miss.
  const { error } = await insertCampaignItem(supabase, {
    campaignId,
    item,
    document: document.values,
  });

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
export async function editCampaignItem(
  campaignId,
  id,
  values,
  uploadedDocument = null,
) {
  const { values: item, errors } = validateItem({ ...values, quantity: 1 });

  if (errors) {
    return rejected(errors.name ?? errors.description ?? errors.quantity);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("editCampaignItem", authError);
  }

  const document = await readDocument(supabase, campaignId, uploadedDocument);

  if (document.error) {
    return rejected(ITEM_DOCUMENT_COPY[document.error]);
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
    document: document.values,
    removeDocument: values.removeDocument === true,
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

  if (copies.error) {
    revalidateBoth(campaignId);
    logFailure("editCampaignItem/copies", copies.error);

    return rejected(
      `${item.name} is saved, but the copies the party holds could not be changed.`,
    );
  }

  const cleanupPending = await cleanDocuments(supabase, campaignId);
  revalidateBoth(campaignId);
  return { kind: "success", name: item.name, cleanupPending };
}

/** The catalogue row and its distributed copies go in one transaction. */
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

  const cleanupPending = await cleanDocuments(supabase, campaignId);
  revalidateBoth(campaignId);
  return { kind: "success", cleanupPending };
}
