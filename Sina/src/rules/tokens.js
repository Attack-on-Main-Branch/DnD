/**
 * The pieces a campaign invents, and the places they stand.
 *
 * A TEMPLATE is a picture and a name — five to a campaign, made on the campaign
 * sheet. A PLACED TOKEN is one of those pieces, or a character's face, or the
 * party's own marker, standing on one map at one point.
 *
 * Bounds and shapes only. Where a piece may be put down is the migration's,
 * because that is a question about a MAP and a SEAT and neither is knowable
 * here; what a piece may LOOK like is the frontend's, because Tailwind never
 * scans this package. See 20260922090000_a_hand_of_pieces.sql and Maria's
 * token-presentation.js.
 *
 * Its own module rather than a corner of campaign.js, for the reason
 * conditions.js is one: the palette renders in the browser on every chair, and
 * campaign.js would bring the whole creation sheet's validation with it.
 */

import { parseInitiative } from "./combat.js";
import { readConditions } from "./conditions.js";
import {
  formatBytes,
  imageExtension,
  IMAGE_ACCEPT_ATTRIBUTE,
  isAcceptedImage,
  isUploadedFile,
  pathFromPublicUrl,
} from "./images.js";
import { countCharacters } from "./text.js";

export { formatBytes };

/**
 * How many pieces a campaign may invent. Mirrored by the trigger in
 * 20260922090000, which is what actually holds — PostgREST sits in front of the
 * Server Actions, so a check up here could never be the only one.
 */
export const MAX_CAMPAIGN_TOKENS = 5;

/** A label under a face on the palette. Mirrored by the CHECK constraint. */
export const MAX_TOKEN_NAME_LENGTH = 40;

/** For the file picker's `accept`, which takes a comma-separated list. */
export const TOKEN_ACCEPT_ATTRIBUTE = IMAGE_ACCEPT_ATTRIBUTE;

/**
 * A token picture is drawn at the size of one hex and never larger, so it is
 * held to the same ceiling a portrait is — see MAX_AVATAR_BYTES.
 */
export const MAX_TOKEN_IMAGE_BYTES = 512 * 1024;

/**
 * THE RIM ROUND A PIECE, and the whole of how three goblins are told apart.
 *
 * High-contrast and in this order on purpose: consecutive entries are far apart
 * in hue, so the second piece dealt never reads as a shade of the first. Eight
 * of them, because a ninth would have to sit between two that are already
 * adjacent.
 *
 * Hex strings rather than class names — these travel into `ring_color`, are
 * checked by a CHECK constraint against exactly this shape, and are applied as
 * an inline colour. A Tailwind class built from a value is one the scanner
 * never sees.
 */
export const TOKEN_RING_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

/** What the column defaults to, and what an unrecognised colour becomes. */
export const DEFAULT_RING_COLOR = TOKEN_RING_COLORS[0];

export function isRingColor(value) {
  return TOKEN_RING_COLORS.includes(value);
}

/** The palette read round, so a ninth copy is the first colour again. */
export function ringColorAt(index) {
  const step = Number(index);

  if (!Number.isFinite(step) || step < 0) {
    return DEFAULT_RING_COLOR;
  }

  return TOKEN_RING_COLORS[Math.floor(step) % TOKEN_RING_COLORS.length];
}

/**
 * The colour the NEXT copy of a piece wears, given the ones already on the
 * board.
 *
 * The first unused colour rather than "however many are down": three goblins
 * placed and the middle one killed leaves red and green, and dealing the fourth
 * in amber would leave blue unused while the table has to tell amber from red.
 * Once every colour is spoken for it goes round, which is the only honest
 * answer at nine copies of one piece.
 */
export function nextRingColor(taken) {
  const held = new Set(Array.isArray(taken) ? taken : []);
  const free = TOKEN_RING_COLORS.find((color) => !held.has(color));

  return free ?? ringColorAt(held.size);
}

/* ---------------------------------------------------------------------------
   THE PICTURE
   --------------------------------------------------------------------------- */

/**
 * `{uid}/{campaign id}-token-{template id}.{ext}`, in the bucket the maps live
 * in. The first segment is the owner's uid and the storage policy from
 * 20260817120000 compares exactly that, so the shape is load-bearing.
 *
 * `token` in the middle rather than a bucket of its own: the policies are
 * already right, and a second public bucket is a second thing to create by hand
 * on every deployment.
 */
const TOKEN_BUCKET = "campaign-maps";

export function tokenImageObjectPath({ userId, campaignId, templateId, type }) {
  return `${userId}/${campaignId}-token-${templateId}.${imageExtension(type)}`;
}

/** The storage path back out of a public URL, so a struck piece takes its
    picture with it. Null for anything that is not one of ours. */
export function tokenImagePathFromUrl(url) {
  return pathFromPublicUrl(url, TOKEN_BUCKET);
}

/* ---------------------------------------------------------------------------
   MAKING ONE
   --------------------------------------------------------------------------- */

/**
 * A piece as the form submits it. The picture is REQUIRED — a token with no
 * face is a coloured disc, and the board already has one of those for the
 * party.
 *
 * `{ values, errors }`, the shape every validator in this layer answers with.
 */
export function validateTokenTemplate({ name, image }) {
  const errors = {};
  const trimmed = String(name ?? "").trim();

  if (trimmed.length === 0) {
    errors.name = "Give the piece a name.";
  } else if (countCharacters(trimmed) > MAX_TOKEN_NAME_LENGTH) {
    errors.name = `A name is at most ${MAX_TOKEN_NAME_LENGTH} characters.`;
  }

  if (!isUploadedFile(image)) {
    errors.image = "Choose a picture for the piece.";
  } else if (!isAcceptedImage(image.type)) {
    errors.image = "That file is not a picture we can use.";
  } else if (image.size > MAX_TOKEN_IMAGE_BYTES) {
    errors.image = `The picture must be under ${formatBytes(
      MAX_TOKEN_IMAGE_BYTES,
    )} once compressed.`;
  }

  return Object.keys(errors).length > 0
    ? { values: null, errors }
    : { values: { name: trimmed }, errors: null };
}

/* ---------------------------------------------------------------------------
   WHAT IS ON THE BOARD
   --------------------------------------------------------------------------- */

/**
 * One row as the browser holds it. The `??` and the clamps belong here: this is
 * the seam a row crosses on its way out of the database, and the same one a
 * message off the table's channel is put through before it is believed.
 *
 * Null for anything that does not hold together — an unknown shape is not a
 * piece with sensible defaults, it is a piece that must not be drawn.
 */
export function readPlacedToken(row) {
  const id = text(row?.id ?? row?.tokenId);
  const mapId = text(row?.map_id ?? row?.mapId);

  if (!id || !mapId) {
    return null;
  }

  const characterId = text(row?.character_id ?? row?.characterId);
  const templateId = text(row?.template_id ?? row?.templateId);
  const isPartyMarker = Boolean(row?.is_party_marker ?? row?.isPartyMarker);

  // The CHECK constraint's rule, asked again on the way in: exactly one face.
  const faces =
    Number(Boolean(characterId)) +
    Number(Boolean(templateId)) +
    Number(isPartyMarker);

  if (faces !== 1) {
    return null;
  }

  const x = fraction(row?.world_x ?? row?.x);
  const y = fraction(row?.world_y ?? row?.y);

  if (x === null || y === null) {
    return null;
  }

  const ring = row?.ring_color ?? row?.ringColor;

  return {
    id,
    mapId,
    characterId,
    templateId,
    isPartyMarker,
    x,
    y,
    q: cell(row?.hex_q ?? row?.q),
    r: cell(row?.hex_r ?? row?.r),
    ringColor: isRingColor(ring) ? ring : DEFAULT_RING_COLOR,
    // What it rolled, and the tie-break under it. See rules/combat.js.
    initiative: parseInitiative(row?.initiative),
    placedAt: text(row?.placed_at ?? row?.placedAt),
    isHidden: Boolean(row?.is_hidden ?? row?.isHidden),
    isDead: Boolean(row?.is_dead ?? row?.isDead),
    // Through the catalogue, which drops what it does not know and puts the
    // rest in the rulebook's own order rather than the array's.
    conditions: readConditions(row?.conditions),
  };
}

/** A whole list, with anything malformed left out. */
export function readPlacedTokens(rows) {
  const drawn = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const token = readPlacedToken(row);

    if (token) {
      drawn.push(token);
    }
  }

  return drawn;
}

/**
 * `Number` alone reads null, undefined and "" as 0, which would plant a piece
 * in the picture's top-left corner every time a coordinate went missing. The
 * same trap `fraction` in campaign.js is written around.
 */
function fraction(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : null;
}

/** A cell index, or null for a board with no grid to have one on. */
function cell(value) {
  return Number.isInteger(value) ? value : null;
}

function text(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
