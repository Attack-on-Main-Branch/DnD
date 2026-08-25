/**
 * The table's arrival, in beats: the name converges out of wide kerning, the
 * map grows into the middle, its frame blooms around it, and the party falls in
 * down the right rail. Plain module, no `"use client"` — class names and
 * numbers, for Server Components.
 *
 * A duration inside a class string has to be a literal, since a class built
 * from a template is one Tailwind's scanner never sees, so each `*_MS` below
 * repeats the number written into its class. Only the offsets can be computed,
 * and they travel as a custom property rather than an inline `animationDelay`
 * so the reduced-motion fade beside them can keep its own timing.
 */

/** The map starts before the title's kerning has finished closing. */
const MAP_AT = 400;
/** The `0.4s` in MAP_CLASSES. */
const MAP_MS = 400;

const FRAME_AT = MAP_AT + MAP_MS;
/** The `0.22s` in FRAME_CLASSES. */
const FRAME_MS = 220;

const CARDS_AT = FRAME_AT + FRAME_MS;

/** One card behind the last, all the way down the column. */
const CARD_STEP_MS = 100;

/** The scroll of marks rises a beat after the party has finished arriving. */
const NOTES_AT = CARDS_AT + 160;

/** Asked for reduced motion, every beat becomes the app's plain opacity ramp. */
const STILL = "motion-reduce:animate-[view-fade_200ms_ease-out]";

/** The two halves, converging. No delay: the beat the rest are measured from. */
export const TITLE_CLASSES = {
  left: `motion-safe:animate-[kern-in-left_1.1s_var(--ease-tray)_backwards] ${STILL}`,
  right: `motion-safe:animate-[kern-in-right_1.1s_var(--ease-tray)_backwards] ${STILL}`,
};

export const MAP_CLASSES = `motion-safe:animate-[map-rise_0.4s_var(--ease-tray)_var(--enter-delay)_backwards] ${STILL}`;

export const FRAME_CLASSES = `motion-safe:animate-[frame-bloom_0.22s_var(--ease-tray)_var(--enter-delay)_backwards] ${STILL}`;

/**
 * `glide-in-right` is the dashboard's own arrival and already exactly this:
 * 100vw of pure translation, no fade — a surface below full opacity stops being
 * the surface it is meant to be.
 */
export const CARD_CLASSES = `motion-safe:animate-[glide-in-right_0.7s_var(--ease-glide)_var(--enter-delay)_backwards] ${STILL}`;

/**
 * The dice rail beside the board, sliding out from behind the map's own edge.
 * The marks above the board arrive on this beat and over this distance in time,
 * and the two are the same furniture — the only difference is which way each
 * comes from, since there is nothing above the marks to come out of.
 *
 * The map is a positioned box and the rail is not, so the picture and its mat
 * paint over the rail for the whole of the journey and it genuinely emerges
 * from under them.
 */
export const RAIL_CLASSES = `motion-safe:animate-[rail-out_0.5s_var(--ease-tray)_var(--enter-delay)_backwards] ${STILL}`;

/** The containers' rail: the dice rail's beat, mirrored. */
export const RAIL_MIRRORED_CLASSES = `motion-safe:animate-[rail-out-mirrored_0.5s_var(--ease-tray)_var(--enter-delay)_backwards] ${STILL}`;

export const MAP_DELAY = { "--enter-delay": `${MAP_AT}ms` };
export const FRAME_DELAY = { "--enter-delay": `${FRAME_AT}ms` };

/**
 * A card's place in the cascade, and how it leaves. The exit is the entrance
 * unwound — the card that arrived last is the first to go — which panel-fold.js
 * reads straight off these attributes.
 */
export function cardEntrance(index, count) {
  return {
    "data-slide": "right",
    "data-slide-delay": (count - 1 - index) * CARD_STEP_MS,
    style: { "--enter-delay": `${CARDS_AT + index * CARD_STEP_MS}ms` },
  };
}

/** `float-up` is the dashboard's heading entrance: 50px of travel and a fade. */
const UNDER_MAP = `motion-safe:animate-[float-up_0.5s_var(--ease-tray)_var(--enter-delay)_backwards] ${STILL}`;

export const NOTES_CLASSES = UNDER_MAP;

/** It leaves the way it came — `data-tuck="down"` at the call site. */
export function notesEntrance() {
  return { "--enter-delay": `${NOTES_AT}ms` };
}

export function railEntrance() {
  return { "--enter-delay": `${NOTES_AT}ms` };
}

/**
 * The activity log, opposite the party rail and arriving on the rail's beat —
 * the two straddle the board and should not land one after the other.
 *
 * `.log-in` in globals.css rather than a `motion-safe:animate-[…]` like the
 * rest of this file: it is two animations whose delays are the same offset
 * `calc()`ed apart, and an arbitrary utility carrying a `calc()` is a class
 * Tailwind's scanner cannot read. Reduced motion is answered where `.panel-in`
 * answers it, in the same block of globals.css.
 */
export const LOG_CLASSES = "log-in";

export function logEntrance() {
  return { "--enter-delay": `${NOTES_AT}ms` };
}
