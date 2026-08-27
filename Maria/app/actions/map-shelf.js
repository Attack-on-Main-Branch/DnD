import {
  addCampaignMap,
  dropCampaignMap,
  removeCampaignMap,
  renameCampaignMap,
  uploadCampaignMap,
} from "sina/data/campaigns";
import {
  campaignMapObjectPath,
  mapPathFromUrl,
  MAX_EXTRA_MAPS,
} from "sina/rules/campaign";

import { logFailure } from "@/lib/errors";

/**
 * The shelf of maps, applied — shared by the creation sheet's action and the
 * edit sheet's. Its own module because a `"use server"` file may only export
 * async functions, so the copy map below has nowhere to live inside one.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
export const MAP_SHELF_COPY = {
  map_limit_reached: {
    message: `A campaign can keep ${MAX_EXTRA_MAPS} maps besides its world map.`,
    field: "maps",
  },
  missing_bucket: {
    message:
      "The campaign-maps storage bucket does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: "maps",
  },
  missing_table: {
    message:
      "The campaign_maps table does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: "maps",
  },
  missing_function: {
    message:
      "The map switcher is missing. Run the migrations in Sina/supabase/migrations.",
    field: "maps",
  },
  map_denied: {
    message: "A map could not be uploaded: storage refused the request.",
    field: "maps",
  },
  map_too_large: {
    message: "Storage refused a map for being too large.",
    field: "maps",
  },
  map_exists: {
    message: "A map is already stored under that name. Try again.",
    field: "maps",
  },
  map_failed: {
    message: "A map could not be uploaded. Try again in a moment.",
    field: "maps",
  },
  invalid_value: {
    message: "The database refused a map name. Try a shorter one.",
    field: "maps",
  },
  not_found: {
    message: "That campaign is no longer yours.",
    field: null,
  },
};

/**
 * The shelf the sheet asked for, made true.
 *
 * THE SHEET DESCRIBES THE SHELF, NOT THE DIFFERENCE — see `readCampaignMaps` —
 * so a row it did not mention is one that was removed.
 *
 * The order every upload here follows: a picture goes up before the row naming
 * it, and comes down only once nothing points at it. Cleanups are logged, not
 * reported. The world map is never touched: it is the field above this one.
 */
export async function applyMapShelf(
  supabase,
  { campaignId, userId, shelf, existing = [] },
) {
  const kept = new Map(shelf.kept.map((slot) => [slot.id, slot.name]));
  const shelved = existing.filter((map) => !map.is_world_map);

  for (const map of shelved) {
    if (kept.has(map.id)) {
      continue;
    }

    const { error } = await dropCampaignMap(supabase, { id: map.id });

    // A miss is not a failure: it is the answer the sheet wanted anyway.
    if (error && error.reason !== "not_found") {
      return { error };
    }

    await sweep(supabase, map.url, "mapShelf/drop");
  }

  for (const map of shelved) {
    const name = kept.get(map.id);

    if (name === undefined || name === map.name) {
      continue;
    }

    const { error } = await renameCampaignMap(supabase, { id: map.id, name });

    if (error && error.reason !== "not_found") {
      return { error };
    }
  }

  let sortOrder = shelved.length;

  for (const slot of shelf.added) {
    const id = crypto.randomUUID();
    const path = campaignMapObjectPath({
      userId,
      campaignId,
      mapId: id,
      type: slot.file.type,
    });

    const upload = await uploadCampaignMap(supabase, {
      path,
      file: slot.file,
    });

    if (upload.error) {
      return { error: upload.error };
    }

    const { error } = await addCampaignMap(supabase, {
      id,
      campaignId,
      name: slot.name,
      url: upload.data.url,
      sortOrder: sortOrder++,
    });

    if (error) {
      // The row is what makes the object findable; without it, it is litter.
      await sweep(supabase, upload.data.url, "mapShelf/rollback");

      return { error };
    }
  }

  return { error: null };
}

/** Best effort, and said out loud in the log if it did not work. */
async function sweep(supabase, url, where) {
  const path = mapPathFromUrl(url);

  if (!path) {
    return;
  }

  const cleanup = await removeCampaignMap(supabase, path);

  if (cleanup.error) {
    logFailure(where, cleanup.error);
  }
}
