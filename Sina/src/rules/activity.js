/**
 * What the table's log can say happened, and the shape of each thing it says.
 *
 * No copy here, the way notifications.js has none: this layer knows that a
 * `d20` came up 18 and that the entry belongs to a player, and nothing at all
 * about how to put that into a sentence. Maria's activity-presentation.jsx is
 * where the English lives.
 *
 * Its own module rather than a corner of `rules/campaign.js`, for the reason
 * `health.js` and `dice.js` are: the panel renders in the browser, and that
 * neighbour would bring the campaign catalogues along with it.
 *
 * Every bound here is mirrored by a CHECK constraint or a literal in
 * 20260823090000_campaign_activity_log.sql. Changing one means changing both.
 */

import { dieSides, isDie } from "./dice.js";
import { MAX_LEVEL, MIN_LEVEL } from "./level.js";

/** Mirrors the `action_type` CHECK. In the order the migration lists them. */
export const ACTION_TYPES = [
  "dice_roll",
  "secret_dice_roll",
  "hp_change",
  "level_change",
  "item_used",
  "item_dropped",
  "item_transferred",
  "item_granted",
  "item_revoked",
];

/** Mirrors the `actor_type` CHECK. */
export const ACTOR_TYPES = ["dm", "player"];

/**
 * How many entries a campaign keeps. A ceiling on the table rather than on the
 * read: `purge_campaign_activity` deletes past it on every insert, so this is
 * what actually exists rather than what is fetched.
 */
export const MAX_ACTIVITY_ENTRIES = 10;

/** Mirrors `campaign_activity_logs_actor_check`. */
export const MAX_ACTOR_NAME_LENGTH = 80;

/** Everything the log counts as a stack moving. */
const ITEM_ACTIONS = new Set([
  "item_used",
  "item_dropped",
  "item_transferred",
  "item_granted",
  "item_revoked",
]);

/** The ones with somebody at the other end, who must be named. */
const ADDRESSED = new Set(["item_transferred", "item_granted", "item_revoked"]);

function text(value) {
  const trimmed = String(value ?? "").trim();

  return trimmed ? trimmed.slice(0, MAX_ACTOR_NAME_LENGTH) : null;
}

function whole(value) {
  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

/**
 * One row, reduced to what the panel draws — or null for anything that does not
 * hold together.
 *
 * A payload is jsonb and this is the only thing that reads it, so the checks
 * are here rather than repeated at each call site. They should never fail:
 * `record_campaign_activity` builds every payload itself and nothing else may
 * write to the table. They stand for the case the database is a migration
 * behind the app, where a row of the old shape would otherwise render as
 * "undefined × undefined".
 */
export function readActivity(row) {
  const action = row?.action_type;
  const actor = text(row?.actor_name);
  const payload = row?.payload;

  if (
    !ACTION_TYPES.includes(action) ||
    !ACTOR_TYPES.includes(row?.actor_type) ||
    !actor ||
    !payload ||
    typeof payload !== "object"
  ) {
    return null;
  }

  const entry = { id: row.id, action, actor };

  if (action === "dice_roll" || action === "secret_dice_roll") {
    if (!isDie(payload.dieType)) {
      return null;
    }

    const secret = action === "secret_dice_roll";
    const value = secret ? null : whole(payload.value);

    // A face this die does not have is a row that cannot be believed. A kept
    // roll carries no number at all, and one that arrived carrying one would
    // be a database that had stopped keeping the secret.
    if (
      !secret &&
      (value === null || value < 1 || value > dieSides(payload.dieType))
    ) {
      return null;
    }

    return { ...entry, die: payload.dieType, secret, value };
  }

  /**
   * Where the ring landed and which way it went; the sentence needs both. The
   * target is always named, because a level is only ever changed from the head
   * of the table and so the character is never the actor.
   */
  if (action === "level_change") {
    const level = whole(payload.level);
    const delta = whole(payload.delta);
    const target = text(payload.targetName);

    return level === null ||
      level < MIN_LEVEL ||
      level > MAX_LEVEL ||
      delta === null ||
      delta === 0 ||
      !target
      ? null
      : { ...entry, level, delta, target };
  }

  if (action === "hp_change") {
    const delta = whole(payload.delta);

    // No target is somebody moving their own bar. The database omits the key
    // in that case rather than repeating the actor, and the two sentences
    // Maria writes for it are different sentences.
    return delta === null || delta === 0
      ? null
      : { ...entry, delta, target: text(payload.targetName) };
  }

  if (!ITEM_ACTIONS.has(action)) {
    return null;
  }

  const item = text(payload.itemName);
  const quantity = whole(payload.quantity);

  if (!item || quantity === null || quantity < 1) {
    return null;
  }

  const target = ADDRESSED.has(action) ? text(payload.targetName) : null;

  return ADDRESSED.has(action) && !target
    ? null
    : { ...entry, item, quantity, target };
}

/** The whole log, newest first, with anything unreadable left out. */
export function readActivityLog(rows) {
  return (rows ?? []).map(readActivity).filter(Boolean);
}
