/**
 * Experience: what a level costs to leave, and where a gain lands.
 *
 * XP HERE IS PROGRESS INSIDE THE CURRENT LEVEL, not a running total — a gain
 * that crosses the threshold spends it and carries the remainder up, which is
 * what lets the bar read `150 / 200` at every rung.
 *
 * Mirrors `xp_threshold` and `xp_after` in the migrations.
 */

import { MAX_LEVEL, MIN_LEVEL } from "./level.js";

/**
 * What each level costs to leave, 1st through 19th. There is no 20th entry
 * because there is nothing above it to reach — `xpThreshold` answers null there
 * rather than a number nobody can spend.
 */
export const XP_THRESHOLDS = [
  200, 400, 500, 1100, 1400, 1700, 2100, 2400, 2800, 3600, 4500, 5100, 5700,
  6400, 7200, 8800, 9500, 10900, 12700,
];

/* Fails the build rather than a level-up: a table one rung short would leave the
   top of the ladder unreachable with no error anywhere. */
if (XP_THRESHOLDS.length !== MAX_LEVEL - MIN_LEVEL) {
  throw new Error(
    `rules/xp: ${XP_THRESHOLDS.length} thresholds for ${MAX_LEVEL - MIN_LEVEL} rungs.`,
  );
}

/** The column's ceiling. Slack: progress never reaches the largest threshold. */
export const MAX_XP = 100000;

/** As much as one press may be worth, in either direction. */
export const MAX_XP_AWARD = 100000;

/** NOT `parseLevel`, which clamps: an unreadable rung has no threshold. */
function rungOf(level) {
  const rung = Number(level);

  return Number.isInteger(rung) && rung >= MIN_LEVEL && rung <= MAX_LEVEL
    ? rung
    : null;
}

/** What this level costs to leave, or null at the top of the ladder. */
export function xpThreshold(level) {
  const rung = rungOf(level);

  return rung === null || rung >= MAX_LEVEL ? null : XP_THRESHOLDS[rung - 1];
}

/**
 * A stored figure, clamped between its ends — but an EMPTY field is not a zero
 * here: "award nothing" is a press that should not happen.
 */
export function parseXp(value) {
  const typed = String(value ?? "").trim();
  const number = typed === "" ? Number.NaN : Number(typed);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(MAX_XP, Math.max(0, Math.round(number)));
}

/** What was typed into the stepper, refused rather than clamped at zero. */
export function parseXpDelta(value) {
  const typed = String(value ?? "").trim();
  const number = typed === "" ? Number.NaN : Number(typed);

  return Number.isInteger(number) && number > 0 && number <= MAX_XP_AWARD
    ? number
    : null;
}

/** How full the bar stands. A character at the top of the ladder is full. */
export function xpFraction(xp, level) {
  const target = xpThreshold(level);
  const held = parseXp(xp);

  if (target === null) {
    return 1;
  }

  return held === null ? 0 : Math.min(1, Math.max(0, held / target));
}

/**
 * Where a change leaves a character: the rung, the progress kept, and how many
 * levels that moved them — SIGNED, because the ladder is climbed and fallen down
 * by the same arithmetic. Taking back exactly what was given returns them
 * exactly where they were; 1st with nothing is the floor.
 */
export function steppedXp(level, xp, by) {
  const from = rungOf(level);
  const held = parseXp(xp);
  const delta = Number(by);

  if (from === null || held === null || !Number.isInteger(delta)) {
    return null;
  }

  let rung = from;
  let total = held + delta;

  if (delta < 0) {
    while (total < 0 && rung > MIN_LEVEL) {
      rung -= 1;
      total += xpThreshold(rung);
    }
  } else {
    for (let cost = xpThreshold(rung); cost !== null && total >= cost;) {
      total -= cost;
      rung += 1;
      cost = xpThreshold(rung);
    }
  }

  return {
    level: rung,
    // Nothing to progress towards at the top, so nothing is banked there.
    xp: rung >= MAX_LEVEL ? 0 : Math.min(MAX_XP, Math.max(0, total)),
    levelsGained: rung - from,
  };
}
