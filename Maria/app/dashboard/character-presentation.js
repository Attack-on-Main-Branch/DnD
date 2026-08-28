import { DEFAULT_DICE_COLOR, DICE_COLOR_VALUES } from "sina/rules/character";

import dragonbornArt from "./race-art/dragonborn.webp";
import dwarfArt from "./race-art/dwarf.webp";
import elfArt from "./race-art/elf.webp";
import gnomeArt from "./race-art/gnome.webp";
import halfElfArt from "./race-art/half-elf.webp";
import halfOrcArt from "./race-art/half-orc.webp";
import halflingArt from "./race-art/halfling.webp";
import humanArt from "./race-art/human.webp";
import tieflingArt from "./race-art/tiefling.webp";

/**
 * How a character looks — the frontend half of what Sina defines. Sina decides
 * which colour slugs exist, this decides what they look like, and the check
 * below fails loudly at module load rather than rendering a silent default.
 *
 * TWO FORMS OF THE SAME COLOUR, because it is worn in two places that cannot
 * read each other's: a Tailwind class for the swatch, the disc behind a
 * silhouette and anything else painted in CSS, and a hex for the 3D roller,
 * which takes `themeColor` as a string and has never heard of a stylesheet.
 * They are the -600 step of Tailwind's own ramp either way, and the pair lives
 * on one line so neither can be changed alone.
 *
 * The class strings must stay literal for Tailwind's scanner to find them.
 */
const DRESS_BY_VALUE = {
  rose: { className: "bg-rose-600", hex: "#e11d48" },
  orange: { className: "bg-orange-600", hex: "#ea580c" },
  amber: { className: "bg-amber-600", hex: "#d97706" },
  lime: { className: "bg-lime-600", hex: "#65a30d" },
  emerald: { className: "bg-emerald-600", hex: "#059669" },
  teal: { className: "bg-teal-600", hex: "#0d9488" },
  cyan: { className: "bg-cyan-600", hex: "#0891b2" },
  sky: { className: "bg-sky-600", hex: "#0284c7" },
  blue: { className: "bg-blue-600", hex: "#2563eb" },
  violet: { className: "bg-violet-600", hex: "#7c3aed" },
  fuchsia: { className: "bg-fuchsia-600", hex: "#c026d3" },
  pink: { className: "bg-pink-600", hex: "#db2777" },
};

const UNDRESSED_COLORS = DICE_COLOR_VALUES.filter(
  (value) => !DRESS_BY_VALUE[value],
);

if (UNDRESSED_COLORS.length > 0) {
  throw new Error(
    `character-presentation: no dress for dice colour ` +
      `${UNDRESSED_COLORS.join(", ")}. Sina lists it in rules/character.js — ` +
      `add it to DRESS_BY_VALUE here, or the picker offers a swatch that ` +
      `renders as something else and rolls a die of another colour again.`,
  );
}

/** No fallback: the check above has already proved every slug is dressed. */
export const DICE_COLORS = DICE_COLOR_VALUES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
  ...DRESS_BY_VALUE[value],
}));

/**
 * The `??` belongs here and nowhere else: these read a database row, which can
 * hold a slug written by an older deploy.
 */
export function diceColorClass(value) {
  return (DRESS_BY_VALUE[value] ?? DRESS_BY_VALUE[DEFAULT_DICE_COLOR])
    .className;
}

export function diceColorHex(value) {
  return (DRESS_BY_VALUE[value] ?? DRESS_BY_VALUE[DEFAULT_DICE_COLOR]).hex;
}

/**
 * One colour and one shape per archetype. Hexes rather than theme slugs because
 * these are not part of the theme — they tint one 28px glyph and the wash behind
 * a selected card, while everything structural about selection stays gold. Clip
 * paths rather than SVG, so the glyph is one element carrying its own shadow.
 */
const ARCHETYPE_EMBLEMS = {
  warrior: {
    accent: "#d8434f",
    clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  },
  mage: {
    accent: "#4a7fe0",
    clip: "circle(50% at 50% 50%)",
  },
  archer: {
    accent: "#5aa544",
    clip: "polygon(50% 0%, 100% 92%, 0% 92%)",
  },
  assassin: {
    accent: "#9b5cd6",
    clip: "polygon(50% 0%, 100% 100%, 50% 74%, 0% 100%)",
  },
  priest: {
    accent: "#e0b25a",
    clip: "polygon(38% 0%, 62% 0%, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0% 62%, 0% 38%, 38% 38%)",
  },
};

/** Gold and a plain disc, for an archetype added to Sina but not yet drawn. */
const FALLBACK_EMBLEM = { accent: "#ffdf9c", clip: "circle(50% at 50% 50%)" };

export function archetypeEmblem(id) {
  return ARCHETYPE_EMBLEMS[id] ?? FALLBACK_EMBLEM;
}

/**
 * One accent and one clip path per ability, deliberately not reusing the
 * archetype shapes — the two sit centimetres apart on the creation sheet.
 * A clip path is a single polygon, so anything with an interior hole (a
 * crescent, an outlined eye) comes out as a blob at 28px.
 */
const ABILITY_EMBLEMS = {
  str: {
    accent: "#e0573f",
    // A sword: point at the top, crossguard two thirds down.
    clip: "polygon(50% 0%, 58% 12%, 58% 50%, 80% 50%, 80% 62%, 58% 62%, 58% 100%, 42% 100%, 42% 62%, 20% 62%, 20% 50%, 42% 50%, 42% 12%)",
  },
  dex: {
    accent: "#3fbf8f",
    clip: "polygon(50% 0%, 100% 48%, 72% 48%, 72% 100%, 28% 100%, 28% 48%, 0% 48%)",
  },
  con: {
    accent: "#e08a3a",
    // A heart, in twelve vertices — enough not to read as faceted at 28px.
    clip: "polygon(50% 95%, 14% 61%, 3% 41%, 7% 22%, 23% 11%, 39% 16%, 50% 31%, 61% 16%, 77% 11%, 93% 22%, 97% 41%, 86% 61%)",
  },
  int: {
    accent: "#4f8fe8",
    clip: "polygon(2% 18%, 46% 8%, 54% 8%, 98% 18%, 98% 88%, 54% 78%, 46% 78%, 2% 88%)",
  },
  wis: {
    accent: "#8b6fe0",
    clip: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)",
  },
  cha: {
    accent: "#ecc25f",
    clip: "polygon(0% 100%, 0% 28%, 22% 54%, 50% 6%, 78% 54%, 100% 28%, 100% 100%)",
  },
};

export function abilityEmblem(id) {
  return ABILITY_EMBLEMS[id] ?? FALLBACK_EMBLEM;
}

/** `#d8434f` at 0.13 → `rgba(216,67,79,0.13)`, for the tints above. */
export function withAlpha(hex, alpha) {
  const digits = hex.replace("#", "");
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((character) => character + character)
          .join("")
      : digits;

  const value = Number.parseInt(full, 16);

  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Artwork behind a character card, keyed by race. All nine of Sina's races have
 * one now, and the card still works without: a race added to `RACES` before
 * anybody has drawn it falls back to no picture rather than to a broken one —
 * drop a file in ./race-art, add an import and an entry, and it appears.
 *
 * Imported as modules rather than referenced under public/, so the emitted URL
 * carries a content hash: a fixed path serves the old picture from every cache
 * that already fetched it, which is what happened the first time these were
 * swapped. 1280px WebP q85 masters, never served directly — `next/image`
 * re-encodes each bucket at q75, shipping ~11 KB on a retina desktop.
 * Full-resolution sources sit in assets/races, which is git-ignored.
 */
const IMAGE_BY_RACE = {
  Human: humanArt,
  Dragonborn: dragonbornArt,
  Dwarf: dwarfArt,
  Elf: elfArt,
  Gnome: gnomeArt,
  "Half-Elf": halfElfArt,
  "Half-Orc": halfOrcArt,
  Halfling: halflingArt,
  Tiefling: tieflingArt,
};

export function raceImage(race) {
  return IMAGE_BY_RACE[race] ?? null;
}
