"use server";

import { removeFogMask, updateMapFogState, uploadFogMask } from "sina/data/fog";
import {
  fogMaskFault,
  fogMaskObjectPath,
  fogMaskUrl,
  formatBytes,
  MAX_FOG_MASK_BYTES,
} from "sina/rules/fog";

import { logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The fog's own writes: the switch, and the mask the brush paints.
 *
 * WHOSE MAP IT IS, IS ASKED TWICE AND NEITHER TIME HERE — the storage policy
 * compares the campaign in the object's path, and `update_map_fog_state` asks
 * the same of the MAP. This file carries the copy and the ordering.
 *
 * OBJECT THEN ROW, and the cleanup is what makes it safe: a mask uploaded for a
 * map the caller does not own is an object with no row pointing at it, so a
 * refused write takes it straight back off.
 */

const FOG_COPY = {
  not_found: "That map is not yours to darken.",
  invalid_value: "That is not a mask this board can use.",
  missing_bucket: "Fog storage is not set up on this project yet.",
  fog_denied: "That map is not yours to darken.",
  fog_too_large: "That mask is too large to store.",
  fog_failed: "Could not store the mask. Try again.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  missing_column: "That part of the app is not ready yet.",
  bad_id: "That map is no longer there.",
};

function refusedFog(action, error, fallback) {
  const copy = FOG_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/** Says nothing about the mask: switching the darkness off does not throw away
    what has been revealed. */
export async function switchMapFog(mapId, enabled) {
  if (typeof mapId !== "string" || mapId.length === 0) {
    return rejected("Missing map id.");
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("switchMapFog", authError);
  }

  const { error } = await updateMapFogState(supabase, {
    mapId,
    enabled: Boolean(enabled),
  });

  if (error) {
    return refusedFog("switchMapFog", error, "Could not change the fog.");
  }

  return { kind: "success" };
}

/**
 * A mask painted and let go of. The blob comes out of a canvas but is checked
 * like any upload — a form body is a public surface whatever produced it.
 *
 * The stamped URL comes back because the browser tells the other chairs and
 * cannot compose the stamp itself.
 */
export async function paintMapFog(campaignId, mapId, formData) {
  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return rejected("Missing campaign id.");
  }

  if (typeof mapId !== "string" || mapId.length === 0) {
    return rejected("Missing map id.");
  }

  const mask = formData?.get("mask");
  const fault = fogMaskFault(mask);

  if (fault) {
    return rejected(
      fault === "too_large"
        ? `The mask must be under ${formatBytes(MAX_FOG_MASK_BYTES)}.`
        : "That is not a mask this board can use.",
    );
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("paintMapFog", authError);
  }

  const path = fogMaskObjectPath({ campaignId, mapId, type: mask.type });

  const { data: stored, error: storeError } = await uploadFogMask(supabase, {
    path,
    file: mask,
  });

  if (storeError) {
    return refusedFog("paintMapFog", storeError, "Could not store the mask.");
  }

  /* What makes an object that never changes address a different thing to fetch.
     On the server, so two chairs cannot disagree about which paint is later. */
  const url = fogMaskUrl(stored.url, Date.now());

  const { error } = await updateMapFogState(supabase, {
    mapId,
    maskUrl: url,
    touchMask: true,
  });

  if (error) {
    // An object with no row pointing at it. See the note at the head.
    await removeFogMask(supabase, path);

    return refusedFog("paintMapFog", error, "Could not store the mask.");
  }

  return { kind: "success", maskUrl: url };
}
