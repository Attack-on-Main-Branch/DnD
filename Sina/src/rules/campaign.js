/**
 * What a campaign is, and what makes one valid. The counterpart to
 * character.js: imported by both the form and the Server Action, so the two
 * cannot disagree. Nothing here touches storage.
 */

import {
  formatBytes,
  imageExtension,
  IMAGE_ACCEPT_ATTRIBUTE,
  isAcceptedImage,
  isUploadedFile,
  pathFromPublicUrl,
} from "./images.js";
import { countCharacters, readProse } from "./text.js";

/** A picture is a picture, wherever it is going — see images.js. */
export { formatBytes };

/**
 * Mirrored by the trigger in 20260817160000_campaign_limit.sql, which is what
 * actually holds — an API sits in front of the Server Actions, so a check up
 * here could never be the only one.
 */
export const MAX_CAMPAIGNS = 3;

const MIN_TITLE_LENGTH = 2;
export const MAX_TITLE_LENGTH = 80;
export const MAX_LORE_LENGTH = 2000;

/**
 * Must stay under `serverActions.bodySizeLimit` in next.config.mjs: a body over
 * that limit is refused by the framework before this code runs, and the user
 * gets a stack trace instead of a sentence.
 */
export const MAX_MAP_BYTES = 4 * 1024 * 1024;

/** For the file picker's `accept`, which takes a comma-separated list. */
export const MAP_ACCEPT_ATTRIBUTE = IMAGE_ACCEPT_ATTRIBUTE;

export function readCampaignValues(formData) {
  const map = formData.get("map");

  return {
    title: String(formData.get("title") ?? "").trim(),
    worldDescription: readProse(formData.get("worldDescription")),

    // An empty file input still submits a zero-byte File with no name.
    map: isUploadedFile(map) ? map : null,

    /* Only the edit sheet posts this, and only while a map is still on it:
       "leave the map alone" and "take it away" both arrive as no file, and
       this is the whole of what tells them apart. Creation never sends it. */
    keepMap: formData.get("keepMap") === "1",
  };
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
    if (!isAcceptedImage(map.type)) {
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

/** The bucket the maps live in, as 20260817120000_campaigns.sql names it. */
const MAP_BUCKET = "campaign-maps";

/**
 * `{uid}/{campaign id}.{ext}`. The first segment is the owner's uid and the
 * storage policy checks exactly that, so this shape is load-bearing — change it
 * and the RLS policy in 20260817120000_campaigns.sql changes with it.
 */
export function mapObjectPath({ userId, campaignId, type, revision = null }) {
  // A replacement gets its own name rather than overwriting. Either reason
  // alone would do it: `upsert: false` refuses a path already taken, and the
  // upload sets a year of `max-age`, so the old URL would keep serving.
  const name = revision ? `${campaignId}-${revision}` : campaignId;

  return `${userId}/${name}.${imageExtension(type)}`;
}

/**
 * The storage path back out of a public URL, or null if it is not one of ours.
 * Recovering it is what lets a deleted campaign take its map with it.
 */
export function mapPathFromUrl(url) {
  return pathFromPublicUrl(url, MAP_BUCKET);
}

/* ---------------------------------------------------------------------------
   THE SHELF
   --------------------------------------------------------------------------- */

/**
 * How many maps a campaign may keep BESIDES its world map. Mirrored by the
 * trigger in 20260920090000_a_shelf_of_maps.sql, which is what actually holds
 * — an API sits in front of the Server Actions, so a check up here could never
 * be the only one.
 */
export const MAX_EXTRA_MAPS = 10;

/** A label on a card. Mirrored by `campaign_maps_name_check`. */
export const MAX_MAP_NAME_LENGTH = 60;

/** What the column defaults to, and what an empty slot is called. */
export const DEFAULT_MAP_NAME = "Untitled Map";

/**
 * `{uid}/{campaign id}-{map id}.{ext}`. The first segment is the owner's uid
 * and the storage policy compares exactly that, so the shape is load-bearing —
 * it is the same bucket the world map lives in, admitted by the same four
 * policies from 20260817120000.
 *
 * NOT `campaigns/{id}/maps/{id}`, however well that reads: the campaign does
 * not exist yet while its creation sheet is being submitted, and the policy has
 * no uid to compare in that shape either. The uid is known before both.
 */
export function campaignMapObjectPath({ userId, campaignId, mapId, type }) {
  return `${userId}/${campaignId}-${mapId}.${imageExtension(type)}`;
}

/** A name as typed, or the column's own default for one left empty. */
function parseMapName(value) {
  const name = String(value ?? "").trim();

  return name || DEFAULT_MAP_NAME;
}

/**
 * The shelf as the sheet submits it: the rows to keep — renamed or not — and
 * the files to add. Both arrive as parallel lists, which `getAll` keeps in the
 * order the form appended them.
 *
 * A row the sheet does not mention is one the Dungeon Master removed. Saying it
 * that way rather than sending a list of deletions is what makes a save
 * idempotent: the sheet describes the shelf it wants, not the difference.
 *
 * WHICH IS WHY A SHEET HAS TO SAY IT IS TALKING ABOUT THE SHELF AT ALL. `null`
 * for one that did not — no `mapShelf` marker — and the caller leaves the shelf
 * alone. Without that, a form rendered without the zone, or a request built by
 * hand, describes an EMPTY shelf, and "describes the shelf it wants" turns into
 * "delete every map" for a sheet that never mentioned maps.
 */
export function readCampaignMaps(formData) {
  if (formData.get("mapShelf") !== "1") {
    return null;
  }

  const keptIds = formData.getAll("mapKept").map((value) => String(value));
  const keptNames = formData.getAll("mapKeptName");
  const files = formData.getAll("mapFile");
  const names = formData.getAll("mapFileName");

  return {
    kept: keptIds.map((id, at) => ({ id, name: parseMapName(keptNames[at]) })),
    added: files
      .map((file, at) => ({ file, name: parseMapName(names[at]) }))
      // An empty file input still submits a zero-byte File with no name.
      .filter((slot) => isUploadedFile(slot.file)),
  };
}

/**
 * `null` when the shelf is well-formed. Counts what will BE there rather than
 * what is being added: a save that keeps eight and adds three is over, and the
 * trigger would refuse the eleventh halfway through the upload.
 */
export function validateCampaignMaps(shelf) {
  // A sheet that did not describe the shelf has nothing to be wrong about.
  if (shelf === null) {
    return null;
  }

  const { kept = [], added = [] } = shelf ?? {};

  if (kept.length + added.length > MAX_EXTRA_MAPS) {
    return {
      field: "maps",
      message: `A campaign can keep ${MAX_EXTRA_MAPS} maps besides its world map.`,
    };
  }

  for (const slot of [...kept, ...added]) {
    // Code points, not UTF-16 units — the count the CHECK constraint uses.
    if (countCharacters(slot.name) > MAX_MAP_NAME_LENGTH) {
      return {
        field: "maps",
        message: `A map name must be at most ${MAX_MAP_NAME_LENGTH} characters.`,
      };
    }
  }

  for (const slot of added) {
    if (!isAcceptedImage(slot.file.type)) {
      return {
        field: "maps",
        message: "A map must be a WebP, PNG, JPEG or GIF image.",
      };
    }

    if (slot.file.size > MAX_MAP_BYTES) {
      return {
        field: "maps",
        message: `Each map must be under ${formatBytes(MAX_MAP_BYTES)} once compressed.`,
      };
    }
  }

  return null;
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
/**
 * What makes one mark one mark: a seat, and the map it is standing on. The
 * unique index in 20260921090000 says exactly this, and the browser holds its
 * tokens in a Map keyed the same way — so a character with a token on the
 * tavern floor and another on the world map is two tokens, not one that keeps
 * moving.
 *
 * A null character is the Dungeon Master's chair and a null map is a row from
 * before the shelf existed. Both are written as NOTHING rather than as a
 * stand-in word: every real half is a uuid, so an empty one cannot be mistaken
 * for a map called "-" or a character called "dm", and a uuid contains no colon
 * for the halves to run together across.
 */
export function markKey(mapId, characterId) {
  return `${mapId ?? ""}:${characterId ?? ""}`;
}

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
