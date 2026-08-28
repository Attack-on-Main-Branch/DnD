/**
 * The darkness over a map: whether it is up, how big the brush is, and where the
 * mask that records the light lives. Bounds and shapes only — every one of them
 * mirrored by 20260927090000_a_fog_over_the_board.sql.
 */

import {
  formatBytes,
  imageExtension,
  isAcceptedImage,
  isUploadedFile,
} from "./images.js";

export { formatBytes };

/** A percentage of the map's own width, never pixels: the board zooms, and every
    chair draws it at a different size. */
export const MIN_FOG_BRUSH = 1;
export const MAX_FOG_BRUSH = 15;
export const DEFAULT_FOG_BRUSH = 6;

/** How wide the mask is drawn and stored. Not the map's own size — it is a
    soft-edged silhouette, so this costs kilobytes and stretches back over the
    picture unnoticed. The height comes from the map's ratio. */
export const FOG_MASK_WIDTH = 1024;

export const MAX_FOG_MASK_BYTES = 512 * 1024;

/**
 * `campaigns/{campaign id}/maps/{map id}/fog-mask.{ext}`.
 *
 * The SECOND segment is the campaign, and the storage policy compares exactly
 * that through `owns_campaign` — change this shape and change 20260927090000.
 *
 * One path per map forever: a mask is rewritten on every stroke, so a fresh name
 * each time would leave a bucket of abandoned ones. It is upserted in place and
 * the URL is stamped instead.
 */
export function fogMaskObjectPath({ campaignId, mapId, type }) {
  return `campaigns/${campaignId}/maps/${mapId}/fog-mask.${imageExtension(type)}`;
}

/** The object's URL, stamped. The object is upserted in place, so without this
    a browser would go on drawing the mask its cache already has. */
export function fogMaskUrl(publicUrl, revision) {
  return publicUrl ? `${publicUrl}?v=${revision}` : null;
}

/**
 * What is wrong with a mask on its way to the bucket, or null. A reason code,
 * never a sentence — fog-actions.js writes the English.
 *
 * A canvas makes these, so none should fire; a Server Action's form body is a
 * public surface whatever is supposed to be posting to it.
 */
export function fogMaskFault(file) {
  if (!isUploadedFile(file)) {
    return "missing";
  }

  if (!isAcceptedImage(file.type)) {
    return "unsupported";
  }

  return file.size > MAX_FOG_MASK_BYTES ? "too_large" : null;
}

/** A map row's fog. An absent `fog_enabled` reads as ON, which is the column's
    own default: a map that has forgotten whether it is dark is dark. */
export function readFogSettings(map) {
  return {
    enabled: Boolean(map?.fog_enabled ?? map?.fogEnabled ?? true),
    maskUrl: text(map?.fog_mask_url ?? map?.maskUrl),
  };
}

function text(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
