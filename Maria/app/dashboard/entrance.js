import { MAX_CAMPAIGNS } from "sina/rules/campaign";
import { MAX_CHARACTERS } from "sina/rules/character";

/**
 * The dashboard's arrival, shared by the two inventories so the roster and the
 * campaigns below it read as one sequence rather than two that merely look
 * alike. Plain module, no `"use client"`: both inventories are Server
 * Components and this is only class names and numbers.
 */

/** Matches the `0.82s` below, which Tailwind can only generate as a literal. */
const TILE_MS = 820;
const TILE_LEAD_MS = 120;
const TILE_STEP_MS = 90;

/**
 * Both rows start together. `at` is the knob for offsetting one behind the
 * other and it is deliberately zero on both — the two arrive as one movement,
 * from opposite sides. Not an oversight; leave it alone.
 */
export const ROSTER = { at: 0, from: "left", slots: MAX_CHARACTERS };
export const CAMPAIGNS = { at: 0, from: "right", slots: MAX_CAMPAIGNS };

const TILE_CLASSES = {
  left: "motion-safe:animate-[glide-in-left_0.82s_var(--ease-glide)_backwards]",
  right:
    "motion-safe:animate-[glide-in-right_0.82s_var(--ease-glide)_backwards]",
};

/**
 * `backwards` rather than `both`: a forwards-filled animation goes on writing
 * `translate` after it ends, outranking anything the tile sets for itself.
 *
 * The stagger is dealt from the end furthest from where the row comes in. A
 * tile trailing another that entered from the same side is closing the gap to
 * it, so dealing a left-entering row left to right lands it in a heap; dealt
 * from its far end the same row fans out.
 *
 * Leaving is that order reversed — the tile nearest the side it goes out by
 * leaves first, which fans the row out on the way out for the same reason.
 * panel-fold.js reads the side and the place off the element rather than
 * importing them: this module reaches into Sina's rules, and the closing runs
 * on every page.
 */
export function tileEntrance(section, index) {
  const place = section.from === "left" ? section.slots - 1 - index : index;

  return {
    className: TILE_CLASSES[section.from],
    "data-slide": section.from,
    "data-slide-delay": (section.slots - 1 - place) * TILE_STEP_MS,
    style: {
      animationDelay: `${section.at + TILE_LEAD_MS + place * TILE_STEP_MS}ms`,
    },
  };
}

export const HEADING_CLASSES =
  "motion-safe:animate-[float-up_var(--ease-tray)_backwards]";

/** The heading drifts for as long as its row flies, settling on the same beat. */
export function headingStyle(section) {
  const lastTile = TILE_LEAD_MS + (section.slots - 1) * TILE_STEP_MS + TILE_MS;

  return {
    animationDelay: `${section.at}ms`,
    animationDuration: `${lastTile}ms`,
  };
}
