/**
 * How a purse looks and how it is spoken about, in one place, so both pack
 * drawers and the table's log cannot drift.
 *
 * Sina knows that `gp` is a denomination and that it cannot go below zero. That
 * it is called Gold, drawn in a gold capsule, and read aloud as "Gold" is
 * decided here — the same seam `inventory-presentation.js` and
 * `activity-presentation.jsx` are written along.
 *
 * FULL NAMES, not the two-letter codes. "CP" is read out by a screen reader as
 * "see pea", which is not a coin, and at a table nobody says "see pea" either.
 * The codes are gone rather than hidden behind an `sr-only` twin.
 *
 * The class strings are LITERAL and must stay so: Tailwind's scanner reads the
 * source rather than the running app, and a class built from a template is one
 * it never sees. That is why the tints below are written out five times instead
 * of composed from the coin's name.
 */

const COIN_NAMES = {
  cp: "Copper",
  sp: "Silver",
  ep: "Electrum",
  gp: "Gold",
  pp: "Platinum",
};

export function coinName(coin) {
  return COIN_NAMES[coin] ?? String(coin ?? "").toUpperCase();
}

/**
 * The capsule, one per denomination and one metal each. The colour is the whole
 * point: five of them stand in a row, and the eye finds the gold before it
 * reads any of the words.
 *
 * No `backdrop-filter` — the panel these sit in is already a backdrop root, so
 * a nested filter samples its flat fill and returns it unchanged while still
 * costing a compositor readback. See surface.js.
 *
 * The tokens are in globals.css. Silver and platinum are told apart by
 * temperature rather than lightness; at this size a lightness difference alone
 * read as one colour twice.
 */
/*
 * `px-2.5` and `gap-1`, which are tighter than the rest of this app's pills and
 * measured rather than chosen: five capsules and their four gaps have to fit
 * the 728px the drawer leaves them, and at `px-3 gap-1.5` the row came to 737 —
 * so Platinum, the longest word, spent its life alone on a second line. The
 * colon carries the separation the gap gives up.
 */
const CAPSULE_BASE =
  "inline-flex items-baseline gap-1 rounded-full border px-2.5 py-1.5 " +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] " +
  "transition-colors duration-300";

const CAPSULE_TINTS = {
  cp: "border-copper/40 bg-copper/12 text-copper",
  sp: "border-silver/40 bg-silver/12 text-silver",
  ep: "border-electrum/40 bg-electrum/12 text-electrum",
  gp: "border-gold/40 bg-gold/12 text-gold",
  pp: "border-platinum/40 bg-platinum/12 text-platinum",
};

/** The one a player has opened. Same metal, turned up. */
const CAPSULE_OPEN_TINTS = {
  cp: "border-copper/75 bg-copper/25 text-copper",
  sp: "border-silver/75 bg-silver/25 text-silver",
  ep: "border-electrum/75 bg-electrum/25 text-electrum",
  gp: "border-gold/75 bg-gold/25 text-gold",
  pp: "border-platinum/75 bg-platinum/25 text-platinum",
};

/** What the pointer promises, for the capsules that are buttons. */
const CAPSULE_HOVER_TINTS = {
  cp: "cursor-pointer hover:border-copper/65 hover:bg-copper/20",
  sp: "cursor-pointer hover:border-silver/65 hover:bg-silver/20",
  ep: "cursor-pointer hover:border-electrum/65 hover:bg-electrum/20",
  gp: "cursor-pointer hover:border-gold/65 hover:bg-gold/20",
  pp: "cursor-pointer hover:border-platinum/65 hover:bg-platinum/20",
};

export function capsuleClasses(coin, { open = false, pressable = false } = {}) {
  return [
    CAPSULE_BASE,
    open ? CAPSULE_OPEN_TINTS[coin] : CAPSULE_TINTS[coin],
    pressable && !open ? CAPSULE_HOVER_TINTS[coin] : "",
    pressable && open ? "cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** The metal's own name inside the capsule. */
export const COIN_NAME_CLASSES =
  "font-display text-xs font-semibold tracking-wide";

/** And the number after it. `tabular-nums` so a row of them does not jitter. */
export const COIN_AMOUNT_CLASSES =
  "font-mono text-sm font-semibold tabular-nums";

/**
 * The row the capsules stand in, in both drawers. `flex-wrap` and not a grid:
 * five capsules of different word-lengths should sit shoulder to shoulder and
 * fall to a second line together, which a grid's equal columns would not do.
 */
export const COIN_ROW_CLASSES = "flex flex-wrap items-center gap-1.5";

/**
 * The box the row and its controls stand in, so the capsules and the buttons
 * that act on them read as one thing. The `plain` surface's own classes,
 * written out rather than imported, because this one sets its own padding.
 */
export const COIN_PANEL_CLASSES =
  "rounded-xl border border-gold/20 bg-surface/70 px-3.5 py-3 " +
  "shadow-[inset_0_1px_0_rgba(255,223,156,0.08)]";

/**
 * The party's purses split back up by whose they are — the mirror of
 * `packsByCharacter`.
 *
 * A member with no row is a member whose purse this viewer may not read, which
 * is one player looking at another. `undefined` rather than an empty purse, so
 * a caller can tell "nothing in it" from "not mine to see".
 */
export function pursesByCharacter(rows) {
  return new Map((rows ?? []).map((row) => [row.character_id, row]));
}
