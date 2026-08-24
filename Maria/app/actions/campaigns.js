"use server";

import { revalidatePath } from "next/cache";
import {
  removeCampaignMap,
  updateCampaign as writeCampaign,
  uploadCampaignMap,
} from "sina/data/campaigns";
import {
  mapObjectPath,
  mapPathFromUrl,
  readCampaignValues,
  validateCampaign,
} from "sina/rules/campaign";

import { logFailure, logUncovered } from "@/lib/errors";
import { campaignSheetPath, campaignTablePath } from "@/lib/routes";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

const EDIT_COPY = {
  not_found: { message: "That campaign is no longer yours.", field: null },
  bad_id: { message: "That campaign could not be found.", field: null },
  invalid_value: {
    message:
      "The database refused one of those values. Try shortening the title or the description.",
    field: null,
  },
  missing_function: {
    message:
      "The campaign editor is missing. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
  missing_table: {
    message:
      "The campaigns table does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
  missing_column: {
    message:
      "The campaigns table is missing a column this needs. Run the migrations in Sina/supabase/migrations.",
    field: null,
  },
  missing_bucket: {
    message:
      "The campaign-maps storage bucket does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: "map",
  },
  map_denied: {
    message: "The map could not be uploaded: storage refused the request.",
    field: "map",
  },
  map_too_large: {
    message: "Storage refused the map for being too large.",
    field: "map",
  },
  map_exists: {
    message: "A map is already stored under that name. Try again.",
    field: "map",
  },
  map_failed: {
    message: "The map could not be uploaded. Try again in a moment.",
    field: "map",
  },
};

/**
 * The campaign as its Dungeon Master rewrote it.
 *
 * The map is the awkward half: "leave it alone" and "take it away" both arrive
 * as no file, and `keepMap` is what tells them apart.
 *
 * The order is `createCampaign`'s, for the same reason — upload, write the row,
 * and undo the upload if the row is refused. A map no row points at is litter;
 * a row pointing at a map never uploaded is a broken page.
 */
export async function updateCampaign(campaignId, formData) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  const values = readCampaignValues(formData);

  const malformed = validateCampaign(values);

  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("updateCampaign", authError);
  }

  // A new file replaces, no file and no `keepMap` removes, and anything else
  // leaves the column where it is.
  const changeMap = Boolean(values.map) || !values.keepMap;

  let mapUrl = null;
  let mapPath = null;

  if (values.map) {
    mapPath = mapObjectPath({
      userId: user.id,
      campaignId,
      type: values.map.type,
      // Its own name rather than the old one — see `mapObjectPath`.
      revision: crypto.randomUUID(),
    });

    const upload = await uploadCampaignMap(supabase, {
      path: mapPath,
      file: values.map,
    });

    if (upload.error) {
      const copy = EDIT_COPY[upload.error.reason];
      logUncovered("updateCampaign/map", upload.error, copy);

      return rejected(
        copy?.message ?? "The map could not be uploaded. Try again.",
        copy?.field ?? "map",
      );
    }

    mapUrl = upload.data.url;
  }

  const { data, error } = await writeCampaign(supabase, {
    id: campaignId,
    values,
    mapUrl,
    changeMap,
  });

  if (error) {
    // The row is what makes the object findable; without it, it is litter.
    if (mapPath) {
      const cleanup = await removeCampaignMap(supabase, mapPath);

      if (cleanup.error) {
        logFailure("updateCampaign/rollback", cleanup.error);
      }
    }

    const copy = EDIT_COPY[error.reason];
    logUncovered("updateCampaign", error, copy);

    // `not_found` means the card on screen is stale either way.
    if (error.reason === "not_found") {
      revalidatePath("/dashboard");
    }

    return rejected(
      copy?.message ?? "Could not save the changes. Please try again.",
      copy?.field ?? null,
    );
  }

  const stale = changeMap ? mapPathFromUrl(data.previousMapUrl) : null;

  if (stale && stale !== mapPath) {
    // Logged, not reported: the campaign is saved either way, and an orphaned
    // object is an operator's problem rather than the user's.
    const cleanup = await removeCampaignMap(supabase, stale);

    if (cleanup.error) {
      logFailure("updateCampaign/stale", cleanup.error);
    }
  }

  // The sheet, the table it opens onto, and the tile on the dashboard.
  revalidatePath(campaignSheetPath(campaignId));
  revalidatePath(campaignTablePath(campaignId));
  revalidatePath("/dashboard");

  return { kind: "success" };
}
