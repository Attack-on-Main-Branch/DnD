"use server";

import { revalidatePath } from "next/cache";
import {
  insertContainer,
  listCampaignContainers,
  listContainerItems,
  removeContainer,
  stockContainerItem,
  updateContainer,
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

/** An edit that found no row: struck out meanwhile, or never this account's. */
const GONE = "That container is no longer on the table.";

/**
 * The name, the kind, and — for one nobody is carrying — what is inside it.
 *
 * The kind only changes while nothing at the table depends on it: a carried
 * bag or a chest already shown to somebody is refused here in words, before
 * `containers_bounds_check` would refuse it without any.
 *
 * The contents are written as the difference from what is there now, through
 * the same stepper the drawer at the table uses. A carried bag's contents are
 * its carrier's pack rows and are changed at the table, so `items` is ignored.
 */
export async function editCampaignContainer(campaignId, id, values) {
  const { values: container, errors } = validateContainer(values ?? {});

  if (errors) {
    return rejected(errors.name ?? errors.type);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("editCampaignContainer", authError);
  }

  const { data: shelf, error: readError } = await listCampaignContainers(
    supabase,
    campaignId,
  );

  if (readError) {
    return refused(
      "editCampaignContainer/read",
      readError,
      "Could not save that.",
    );
  }

  const standing = shelf.find((one) => one.id === id);

  if (!standing) {
    return rejected(GONE);
  }

  const carried = Boolean(standing.owner_character_id);
  const shown =
    standing.is_revealed ||
    (standing.visible_to_character_ids ?? []).length > 0;

  if (container.type !== standing.type) {
    if (carried) {
      return rejected(
        "A bag somebody is carrying cannot become a chest. Take it back at the table first.",
      );
    }

    if (shown) {
      return rejected(
        "A chest the party has been shown cannot become a bag. Hide it at the table first.",
      );
    }
  }

  const { error } = await updateContainer(supabase, {
    campaignId,
    id,
    container,
  });

  if (error) {
    return error.reason === "not_found"
      ? rejected(GONE)
      : refused("editCampaignContainer", error, "Could not save that.");
  }

  if (carried) {
    revalidateBoth(campaignId);
    return { kind: "success", name: container.name };
  }

  const { data: inside, error: insideError } = await listContainerItems(
    supabase,
    [id],
  );

  if (insideError) {
    logFailure("editCampaignContainer/contents", insideError);
    revalidateBoth(campaignId);

    return rejected(
      `${container.name} is saved, but what is inside it could not be changed.`,
    );
  }

  const wanted = readContents(values?.items);
  const moves = [];

  for (const { item, quantity } of wanted) {
    const held = inside.find((row) => row.item_slug === item.slug);
    const delta = quantity - (held?.quantity ?? 0);

    if (delta !== 0) {
      moves.push({ item, delta });
    }
  }

  for (const row of inside) {
    if (!wanted.some(({ item }) => item.slug === row.item_slug)) {
      moves.push({
        item: {
          slug: row.item_slug,
          name: row.name,
          category: row.category,
          description: row.description,
          facts: row.facts,
          isCustom: row.is_custom,
        },
        delta: -row.quantity,
      });
    }
  }

  const stocked = await Promise.all(
    moves.map(({ item, delta }) =>
      stockContainerItem(supabase, { containerId: id, item, delta }),
    ),
  );

  const failed = stocked.find((result) => result.error);

  revalidateBoth(campaignId);

  if (failed) {
    logFailure("editCampaignContainer/stock", failed.error);

    return rejected(
      `${container.name} is saved, but not everything inside it changed.`,
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
