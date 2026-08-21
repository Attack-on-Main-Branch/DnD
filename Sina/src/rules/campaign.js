/**
 * What a campaign is, and what makes one valid. The counterpart to
 * character.js: imported by both the form and the Server Action, so the two
 * cannot disagree. Nothing here touches storage.
 */

import { countCharacters, readProse } from "./text.js";

/**
 * Mirrored by the trigger in 20260817160000_campaign_limit.sql, which is what
 * actually holds — an API sits in front of the Server Actions, so a check up
 * here could never be the only one.
 */
export const MAX_CAMPAIGNS = 3;

export const MIN_TITLE_LENGTH = 2;
export const MAX_TITLE_LENGTH = 80;
export const MAX_LORE_LENGTH = 2000;

/**
 * The browser sends WebP, but this also runs against requests not built with
 * our form, so the other three stay accepted.
 */
export const ACCEPTED_MAP_TYPES = [
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/gif",
];

/**
 * Must stay under `serverActions.bodySizeLimit` in next.config.mjs: a body over
 * that limit is refused by the framework before this code runs, and the user
 * gets a stack trace instead of a sentence.
 */
export const MAX_MAP_BYTES = 4 * 1024 * 1024;

/** For the file picker's `accept`, which takes a comma-separated list. */
export const MAP_ACCEPT_ATTRIBUTE = ACCEPTED_MAP_TYPES.join(",");

export function readCampaignValues(formData) {
  const map = formData.get("map");

  return {
    title: String(formData.get("title") ?? "").trim(),
    worldDescription: readProse(formData.get("worldDescription")),

    // An empty file input still submits a zero-byte File with no name.
    map: isUploadedFile(map) ? map : null,
  };
}

/**
 * Duck-typed rather than `instanceof File`: this runs against two different
 * `File` constructors, and a file that crossed a realm boundary — as a parsed
 * multipart body has — fails `instanceof` silently, looking like "no map
 * chosen".
 */
function isUploadedFile(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number" &&
    value.size > 0 &&
    typeof value.name === "string" &&
    value.name !== ""
  );
}

/** `null` when well-formed. Says nothing about whether the upload will succeed. */
export function validateCampaign({ title, worldDescription, map }) {
  const titleLength = countCharacters(title);

  if (titleLength < MIN_TITLE_LENGTH) {
    return {
      field: "title",
      message: `Give the campaign a title of at least ${MIN_TITLE_LENGTH} characters.`,
    };
  }

  if (titleLength > MAX_TITLE_LENGTH) {
    return {
      field: "title",
      message: `The title must be at most ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  // Code points, not UTF-16 units — the count the CHECK constraint uses.
  if (countCharacters(worldDescription) > MAX_LORE_LENGTH) {
    return {
      field: "worldDescription",
      message: `The world description must be at most ${MAX_LORE_LENGTH} characters.`,
    };
  }

  if (map) {
    if (!ACCEPTED_MAP_TYPES.includes(map.type)) {
      return {
        field: "map",
        message: "The map must be a WebP, PNG, JPEG or GIF image.",
      };
    }

    if (map.size > MAX_MAP_BYTES) {
      return {
        field: "map",
        message: `The map must be under ${formatBytes(MAX_MAP_BYTES)} once compressed.`,
      };
    }
  }

  return null;
}

/** `4 MB`, `820 KB`. */
export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  return kb < 1024 ? `${Math.round(kb)} KB` : `${round(kb / 1024, 1)} MB`;
}

function round(value, places) {
  const factor = 10 ** places;

  return Math.round(value * factor) / factor;
}

/**
 * `{uid}/{campaign id}.{ext}`. The first segment is the owner's uid and the
 * storage policy checks exactly that, so this shape is load-bearing — change it
 * and the RLS policy in 20260817120000_campaigns.sql changes with it.
 */
export function mapObjectPath({ userId, campaignId, type }) {
  return `${userId}/${campaignId}.${extensionFor(type)}`;
}

/**
 * The storage path back out of a public URL, or null if it is not one of ours.
 * Recovering it is what lets a deleted campaign take its map with it.
 */
export function mapPathFromUrl(url) {
  if (typeof url !== "string") {
    return null;
  }

  const marker = "/campaign-maps/";
  const at = url.indexOf(marker);

  if (at === -1) {
    return null;
  }

  const path = url.slice(at + marker.length);

  // Nothing that could climb out of the bucket: this is about to name an object
  // for deletion, which is not a place to take a string on trust.
  return path && !path.includes("..") ? decodeURIComponent(path) : null;
}

function extensionFor(type) {
  switch (type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    default:
      return "webp";
  }
}

/**
 * Characters per party. Mirrored by the trigger in
 * 20260818090000_campaign_party.sql, which is what actually holds.
 */
export const MAX_PARTY = 6;

/** The shortest name fragment worth searching on. */
export const MIN_SEARCH_LENGTH = 2;

/** `Name#1234`, with either half allowed to be a fragment. */
const SPLIT_PATTERN = /^(.*?)\s*#\s*([0-9]*)\s*$/;

/**
 * Turns what somebody typed into the pair the search takes, or null.
 *
 * Three shapes, because those are the three ways a person has the information
 * to hand:
 *
 *   `fri`             the beginning of a name
 *   `1000` or `#1000` the tag alone
 *   `fri#10`          both, either of them partial
 *
 * A bare run of digits is read as a tag. Null below MIN_SEARCH_LENGTH: the
 * search runs against every character in the database, and a single letter
 * would hand back an arbitrary ten of them.
 */
export function parseCharacterQuery(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const split = SPLIT_PATTERN.exec(text);

  if (split) {
    const name = split[1].trim();
    const discriminator = split[2];

    // A `#` with nothing on either side is somebody mid-type, not a query.
    if (!name && !discriminator) {
      return null;
    }

    if (name && countCharacters(name) < MIN_SEARCH_LENGTH) {
      return null;
    }

    return {
      namePrefix: name || null,
      discriminatorPrefix: discriminator || null,
    };
  }

  if (/^[0-9]+$/.test(text)) {
    return { namePrefix: null, discriminatorPrefix: text };
  }

  if (countCharacters(text) < MIN_SEARCH_LENGTH) {
    return null;
  }

  return { namePrefix: text, discriminatorPrefix: null };
}

/**
 * A point on the campaign's map, as fractions of the picture, or null. `x` runs
 * left to right and `y` top to bottom, both 0 to 1 — never pixels, since the
 * board zooms and is drawn at whatever height the page has left over.
 *
 * Clamped at the edges rather than refused, the browser deriving these from the
 * picture's own box so 1.0000001 is a rounding artefact; anything that is not a
 * finite number is null. Mirrors the CHECK and the clamp in
 * 20260821260000_campaign_marks.sql, which are the ones that count.
 */
export function parseMarkPoint(x, y) {
  const across = fraction(x);
  const down = fraction(y);

  return across === null || down === null ? null : { x: across, y: down };
}

/**
 * `Number` alone is not enough: it reads null, undefined and the empty string
 * as 0, planting a mark in the map's top-left corner every time a coordinate
 * went missing. An absent point is no point.
 */
function fraction(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : null;
}
