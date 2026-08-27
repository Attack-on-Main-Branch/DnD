"use server";

import {
  removeCampaignMap,
  replaceCampaignMap,
  setActiveCampaignMap,
  uploadCampaignMap,
} from "sina/data/campaigns";
import {
  campaignMapObjectPath,
  DEFAULT_MAP_NAME,
  mapPathFromUrl,
  validateCampaignMaps,
} from "sina/rules/campaign";

import { MAP_SHELF_COPY } from "@/app/actions/map-shelf";
import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The two things a Dungeon Master does to a map on the shelf: put a different
 * picture on a card, and put a card on the table.
 *
 * NEITHER REVALIDATES A PATH. The table is a live board — what travels is a
 * message, and what answers it is the board. See table-maps.jsx.
 */

/**
 * A new picture on one card. It goes up before the row points at it and the
 * old one comes down after, so a refused write leaves no card naming nothing.
 */
export async function changeCampaignMap(campaignId, mapId, formData) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  if (typeof mapId !== "string" || mapId.length === 0) {
    return rejected("Missing map id.");
  }

  const file = formData.get("map");

  // The same bounds the sheet's own zone is held to, on the one slot this is.
  const malformed = validateCampaignMaps({
    added: [{ file, name: DEFAULT_MAP_NAME }],
  });

  if (malformed) {
    return rejected(malformed.message, malformed.field);
  }

  if (!file) {
    return rejected("No map was chosen.", "maps");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("changeCampaignMap", authError);
  }

  const path = campaignMapObjectPath({
    userId: user.id,
    campaignId,
    // A fresh name: the upload asks for a year of `max-age`.
    mapId: `${mapId}-${crypto.randomUUID()}`,
    type: file.type,
  });

  const upload = await uploadCampaignMap(supabase, { path, file });

  if (upload.error) {
    const copy = MAP_SHELF_COPY[upload.error.reason];
    logUncovered("changeCampaignMap/upload", upload.error, copy);

    return rejected(
      copy?.message ?? "The map could not be uploaded. Try again.",
      copy?.field ?? "maps",
    );
  }

  const { data, error } = await replaceCampaignMap(supabase, {
    id: mapId,
    url: upload.data.url,
  });

  if (error) {
    // The row is what makes the object findable; without it, it is litter.
    await sweep(supabase, upload.data.url, "changeCampaignMap/rollback");

    const copy = MAP_SHELF_COPY[error.reason];
    logUncovered("changeCampaignMap", error, copy);

    return rejected(
      copy?.message ?? "That map could not be changed.",
      copy?.field ?? null,
    );
  }

  await sweep(supabase, data.previousUrl, "changeCampaignMap/stale");

  return { kind: "success", url: upload.data.url };
}

/**
 * One map onto the table, for everybody; `mapId` null puts the world map back.
 * The browser has already painted it — this is what makes it true.
 */
export async function activateCampaignMap(campaignId, mapId) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError || !user) {
    return sessionRejection("activateCampaignMap", authError);
  }

  const { error } = await setActiveCampaignMap(supabase, {
    campaignId,
    mapId: mapId ?? null,
  });

  if (error) {
    const copy = MAP_SHELF_COPY[error.reason];
    logUncovered("activateCampaignMap", error, copy);

    return rejected(
      copy?.message ?? "That map could not be put on the table.",
      copy?.field ?? null,
    );
  }

  return { kind: "success" };
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
