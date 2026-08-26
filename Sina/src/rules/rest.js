/**
 * What a rest gives back, against the sheet this app actually holds.
 *
 * A LONG rest is hit points to the maximum and every slot unspent. A SHORT one
 * reaches Pact Magic and nothing else — see `shortRestSlotLevels`.
 *
 * Mirrors `trigger_rest`, which is the run that counts.
 */

import { availableSlotLevels, casterKind } from "./spellcasting.js";

export const REST_TYPES = ["short", "long"];

export function isRestType(value) {
  return REST_TYPES.includes(value);
}

/**
 * Pact Magic alone: a Warlock's slots are the one resource in this schema that
 * returns on the hour. Action Surge, Second Wind, Channel Divinity, Ki and Hit
 * Dice have no column on `characters` — when one arrives, it joins here.
 */
export function shortRestSlotLevels(classId, level) {
  return casterKind(classId) === "pact"
    ? availableSlotLevels(classId, level)
    : [];
}

/** And a LONG one: everything the class and the level grant. */
export function longRestSlotLevels(classId, level) {
  return availableSlotLevels(classId, level);
}
