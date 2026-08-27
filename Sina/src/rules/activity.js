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

import { isCoin, MAX_COINS } from "./currency.js";
import { isCondition } from "./conditions.js";
import { deathSaveOutcome } from "./death.js";
import { isDie, parseDiceCount, readDiceResult } from "./dice.js";
import { MAX_HP, MIN_MAX_HP } from "./hp.js";
import { MAX_LEVEL, MIN_LEVEL } from "./level.js";
import { isRestType } from "./rest.js";
import { isSpellLevel } from "./spells.js";
import { MAX_XP_AWARD } from "./xp.js";

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
  "coin_spent",
  "coin_transferred",
  "coin_granted",
  "coin_revoked",
  "spell_cast",
  "chest_revealed",
  "chest_looted",
  "bag_transferred",
  "xp_change",
  "rest_taken",
  "max_hp_change",
  "instant_death",
  "death_save",
  "character_died",
  "character_revived",
  "condition_applied",
  "condition_removed",
];

/** What one face of the death save die was worth. Mirrors `deathSaveOutcome`. */
export const DEATH_SAVE_OUTCOMES = [
  "revived",
  "success",
  "failure",
  "critical_failure",
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

/** And everything it counts as a purse moving. */
const COIN_ACTIONS = new Set([
  "coin_spent",
  "coin_transferred",
  "coin_granted",
  "coin_revoked",
]);

/** The ones with somebody at the other end, who must be named. */
const ADDRESSED = new Set([
  "item_transferred",
  "item_granted",
  "item_revoked",
  "coin_transferred",
  "coin_granted",
  "coin_revoked",
]);

/** Mirrors MAX_CONTAINER_NAME_LENGTH in ./containers.js. */
const MAX_CONTAINER_NAME = 60;

function text(value) {
  const trimmed = String(value ?? "").trim();

  return trimmed ? trimmed.slice(0, MAX_ACTOR_NAME_LENGTH) : null;
}

/** A container's name, which is bounded shorter than an actor's. */
function name(value) {
  const trimmed = String(value ?? "").trim();

  return trimmed ? trimmed.slice(0, MAX_CONTAINER_NAME) : null;
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

  /*
   * The seat as well as the name it was read off: two characters at one table
   * may answer to the same one, so a face cannot be found by the word. Null for
   * the head of the table — and for every row written before 20260919090000
   * added a column to hold it.
   *
   * Which is why `head` travels too. Without it those older rows are
   * indistinguishable from the Dungeon Master's, and the panel would hang the
   * gold token beside a line a player wrote.
   */
  const entry = {
    id: row.id,
    action,
    actor,
    seat: row.actor_character ?? null,
    head: row.actor_type === "dm",
  };

  if (action === "dice_roll" || action === "secret_dice_roll") {
    // A row written before the rail could throw a handful carries no count,
    // and one die is what it meant.
    const count = parseDiceCount(payload.count ?? 1);

    if (!isDie(payload.dieType) || count === null) {
      return null;
    }

    const secret = action === "secret_dice_roll";
    const value = secret
      ? null
      : readDiceResult(payload.dieType, count, payload.value);

    // A total these dice could not have come to is a row that cannot be
    // believed. A kept roll carries no number at all, and one that arrived
    // carrying one would be a database that had stopped keeping the secret.
    if (!secret && value === null) {
      return null;
    }

    return { ...entry, die: payload.dieType, count, secret, value };
  }

  /**
   * Where the ring landed and which way it went; the sentence needs both.
   *
   * The target used to be required, a level having only ever been AWARDED —
   * from the head of the table, so the character was never the actor. Since
   * 20260903090000 a rung can also be climbed by the character themselves, on
   * their own experience, and the database omits the key for that exactly as it
   * does for somebody moving their own hit points. Two sentences, one entry.
   */
  if (action === "level_change") {
    const level = whole(payload.level);
    const delta = whole(payload.delta);

    return level === null ||
      level < MIN_LEVEL ||
      level > MAX_LEVEL ||
      delta === null ||
      delta === 0
      ? null
      : { ...entry, level, delta, target: text(payload.targetName) };
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

  /**
   * A frame that moved: where the maximum landed and the rung it landed on.
   * Written by a trigger and never by a browser, so both numbers came off the
   * row — and both are bounded here anyway, for a row a migration behind.
   */
  if (action === "max_hp_change") {
    const maxHp = whole(payload.maxHp);
    const level = whole(payload.level);

    return maxHp === null ||
      maxHp < MIN_MAX_HP ||
      maxHp > MAX_HP ||
      level === null ||
      level < MIN_LEVEL ||
      level > MAX_LEVEL
      ? null
      : { ...entry, maxHp, level, target: text(payload.targetName) };
  }

  /**
   * The blow that skipped the three saves. How much it was for, which is the
   * whole of what makes it worth its own line rather than an `hp_change`.
   */
  if (action === "instant_death") {
    const damage = whole(payload.damage);

    return damage === null || damage < 1 || damage > MAX_HP
      ? null
      : { ...entry, damage, target: text(payload.targetName) };
  }

  /**
   * One face of the die, and what it came to. The outcome is stored rather than
   * re-derived so a row written under an older set of rules still reads as what
   * the table was told at the time — but it has to AGREE with the face, or the
   * row is one nothing in this schema could have written.
   */
  if (action === "death_save") {
    const roll = whole(payload.roll);
    const outcome = payload.outcome;

    return roll === null ||
      roll < 1 ||
      roll > 20 ||
      !DEATH_SAVE_OUTCOMES.includes(outcome) ||
      outcome !== deathSaveOutcome(roll)
      ? null
      : { ...entry, roll, outcome, target: text(payload.targetName) };
  }

  /* The third failure, and the head of the table undoing it. Neither carries a
     payload: who it happened to is the whole sentence. */
  if (action === "character_died") {
    return { ...entry, target: text(payload.targetName) };
  }

  if (action === "character_revived") {
    const target = text(payload.targetName);

    return target ? { ...entry, target } : null;
  }

  /**
   * One of the fifteen, on or off. The key rather than the name: Maria's
   * activity-presentation.jsx dresses it, and a row carrying English would be a
   * row that could not be recoloured.
   *
   * `targetName` is always there — `write_table_log` fills it for a character
   * and `log_condition` writes "the party" for the other branch — because the
   * sentence is about whoever it happened to.
   */
  if (action === "condition_applied" || action === "condition_removed") {
    const condition = payload.condition;
    const target = text(payload.targetName);

    return isCondition(condition) && target
      ? { ...entry, condition, target }
      : null;
  }

  /**
   * A denomination and an amount. `coin_spent` names nobody, for the reason a
   * hit point somebody took off their own bar names nobody: "Frieren spent 12
   * GP" is one event, and the database writes no `targetName` key at all in
   * that branch.
   */
  if (COIN_ACTIONS.has(action)) {
    const coin = payload.coin;
    const amount = whole(payload.amount);
    const target = ADDRESSED.has(action) ? text(payload.targetName) : null;

    if (
      !isCoin(coin) ||
      amount === null ||
      amount < 1 ||
      amount > MAX_COINS ||
      (ADDRESSED.has(action) && !target)
    ) {
      return null;
    }

    return { ...entry, coin, amount, target };
  }

  /**
   * A name and the slot it was CAST FROM, which for an upcast is not the level
   * the spell is written at. The dice and the save ride along when the spell has
   * them, and no key at all when it does not.
   */
  if (action === "spell_cast") {
    const spell = text(payload.spellName);

    return spell && isSpellLevel(payload.spellLevel)
      ? {
          ...entry,
          spell,
          level: Number(payload.spellLevel),
          damage: text(payload.spellDamage),
          save: text(payload.spellSave),
        }
      : null;
  }

  /* The three a container can be the subject of. The name comes off the ROW,
     exactly as `targetName` does. */
  if (action === "chest_revealed") {
    const container = name(payload.containerName);
    const shown = whole(payload.shown);

    // `target` only when there is ONE name to say; two of five is a number.
    return container && shown !== null && shown >= 1
      ? { ...entry, container, shown, target: text(payload.targetName) }
      : null;
  }

  if (action === "chest_looted") {
    const container = name(payload.containerName);
    const item = text(payload.itemName);
    const quantity = whole(payload.quantity);

    // Nobody at the other end: it came from the world.
    return container && item && quantity !== null && quantity >= 1
      ? { ...entry, container, item, quantity }
      : null;
  }

  /**
   * Experience, as a CHANGE and never a total: the bar beside it already says
   * where that left them. The target is named only when it was granted from the
   * head of the table, exactly as a hit point's is.
   */
  if (action === "xp_change") {
    const delta = whole(payload.delta);

    return delta === null || delta === 0 || Math.abs(delta) > MAX_XP_AWARD
      ? null
      : { ...entry, delta, target: text(payload.targetName) };
  }

  /**
   * A rest. `target` is somebody else's, which for the party at once is the
   * fixed string the database writes rather than a name from a caller.
   */
  if (action === "rest_taken") {
    return isRestType(payload.restType)
      ? {
          ...entry,
          restType: payload.restType,
          target: text(payload.targetName),
        }
      : null;
  }

  if (action === "bag_transferred") {
    const container = name(payload.containerName);
    const target = text(payload.targetName);

    // A row without a second name is a row from an older shape.
    return container && target ? { ...entry, container, target } : null;
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
