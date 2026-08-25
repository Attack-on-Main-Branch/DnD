"use server";

import { revalidatePath } from "next/cache";
import {
  insertContainer,
  removeContainer,
  stockContainerItem,
} from "sina/data/containers";
import {
  MAX_CAMPAIGN_CONTAINERS,
  validateContainer,
} from "sina/rules/containers";
import {
  MAX_ITEM_QUANTITY,
  parseQuantity,
  readCatalogueItem,
  validateItem,
} from "sina/rules/inventory";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignSheetPath, campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Where a bag or a chest is made, and struck out again. Separate from
 * play/chest-actions.js: this decides what EXISTS, those move what is inside.
 *
 * The validation here is the run that counts.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const CONTAINER_COPY = {
  limit_reached: `A campaign holds ${MAX_CAMPAIGN_CONTAINERS} containers. Strike one out first.`,
  invalid_value: "That is outside what a container can hold.",
  not_found: "That campaign is no longer yours.",
  already_carried: "That is already in the container. Try again.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That campaign is no longer there.",
};

/** The sheet lists the containers and the table opens them. */
function revalidateBoth(campaignId) {
  revalidatePath(campaignSheetPath(campaignId));
  revalidatePath(campaignTablePath(campaignId));
}

function refused(action, error, fallback) {
  const copy = CONTAINER_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/**
 * The initial contents, put back through the rules. The slug is re-derived
 * rather than trusted: it is the stacking key.
 *
 * A bad line is dropped rather than refused — a container is worth making even
 * if one of its contents arrived malformed.
 */
function readContents(items) {
  const kept = [];

  for (const entry of Array.isArray(items) ? items : []) {
    const values = entry?.isCustom
      ? validateItem({ ...entry, quantity: 1 }).values
      : readCatalogueItem(entry ?? {});

    const count = parseQuantity(entry?.quantity);

    if (!values || count === null || count < 1 || count > MAX_ITEM_QUANTITY) {
      continue;
    }

    if (!kept.some((held) => held.item.slug === values.slug)) {
      kept.push({ item: values, quantity: count });
    }
  }

  return kept;
}

/**
 * The container first, its contents second: the row has to exist before
 * anything can go in it, and a half-filled chest is one the Dungeon Master can
 * finish from the drawer at the table.
 *
 * Everything made here is ownerless and hidden, so the contents always land in
 * `container_items`. `transfer_container` drains them into a pack the day
 * somebody picks the bag up.
 */
export async function writeCampaignContainer(campaignId, values) {
  const { values: container, errors } = validateContainer(values ?? {});

  if (errors) {
    return rejected(errors.name ?? errors.type);
  }

  const contents = readContents(values?.items);

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeCampaignContainer", authError);
  }

  // "DMs make containers for their own table" answers for the owner and
  // returns no row to anybody else, which reads here as a miss.
  const { data: made, error } = await insertContainer(supabase, {
    campaignId,
    container,
  });

  if (error) {
    return refused("writeCampaignContainer", error, "Could not make that.");
  }

  // Together rather than one after another: a dozen round trips in sequence is
  // a visible pause on a form that has already been submitted.
  const stocked = await Promise.all(
    contents.map(({ item, quantity }) =>
      stockContainerItem(supabase, {
        containerId: made.id,
        item,
        delta: quantity,
      }),
    ),
  );

  const failed = stocked.find((result) => result.error);

  revalidateBoth(campaignId);

  if (failed) {
    logFailure("writeCampaignContainer/contents", failed.error);

    return rejected(
      `${container.name} is on the table, but not everything went into it.`,
    );
  }

  return { kind: "success", name: container.name };
}

/**
 * One struck out, and everything inside it with it — both tables cascade on
 * `container_id`. What the party has already TAKEN out is untouched.
 */
export async function strikeCampaignContainer(campaignId, id) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("strikeCampaignContainer", authError);
  }

  const { error } = await removeContainer(supabase, { campaignId, id });

  if (error) {
    return refused("strikeCampaignContainer", error, "Could not remove that.");
  }

  revalidateBoth(campaignId);
  return { kind: "success" };
}
