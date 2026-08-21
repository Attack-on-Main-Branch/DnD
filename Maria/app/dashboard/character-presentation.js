import {
  AVATAR_COLOR_VALUES,
  DEFAULT_AVATAR_COLOR,
} from "sina/rules/character";

import dragonbornArt from "./race-art/dragonborn.webp";
import dwarfArt from "./race-art/dwarf.webp";
import elfArt from "./race-art/elf.webp";
import halfElfArt from "./race-art/half-elf.webp";
import humanArt from "./race-art/human.webp";
import tieflingArt from "./race-art/tiefling.webp";

/**
 * How a character looks — the frontend half of what Sina defines. Sina decides
 * which colour slugs exist, this decides what they look like, and the check
 * below fails loudly at module load rather than rendering a silent default.
 *
 * The class strings must stay literal for Tailwind's scanner to find them.
 */
const CLASS_BY_VALUE = {
  rose: "bg-rose-600",
  orange: "bg-orange-600",
  amber: "bg-amber-600",
  lime: "bg-lime-600",
  emerald: "bg-emerald-600",
  teal: "bg-teal-600",
  cyan: "bg-cyan-600",
  sky: "bg-sky-600",
  blue: "bg-blue-600",
  violet: "bg-violet-600",
  fuchsia: "bg-fuchsia-600",
  pink: "bg-pink-600",
};

const UNSTYLED_COLORS = AVATAR_COLOR_VALUES.filter(
  (value) => !CLASS_BY_VALUE[value],
);

if (UNSTYLED_COLORS.length > 0) {
  throw new Error(
    `character-presentation: no class for avatar colour ` +
      `${UNSTYLED_COLORS.join(", ")}. Sina lists it in rules/character.js — ` +
      `add it to CLASS_BY_VALUE here, or the picker offers a swatch that ` +
      `renders as something else.`,
  );
}

/** No fallback: the check above has already proved every slug has a class. */
export const AVATAR_COLORS = AVATAR_COLOR_VALUES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
  className: CLASS_BY_VALUE[value],
}));

/**
 * The `??` belongs here and nowhere else: this reads a database row, which can
 * hold a slug written by an older deploy.
 */
export function avatarColorClass(value) {
  return CLASS_BY_VALUE[value] ?? CLASS_BY_VALUE[DEFAULT_AVATAR_COLOR];
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
 * Artwork behind a character card, keyed by race. Not every race has one, and
 * the card works without it — drop a file in ./race-art, add an import and an
 * entry, and it appears.
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
  "Half-Elf": halfElfArt,
  Tiefling: tieflingArt,
};

export function raceImage(race) {
  return IMAGE_BY_RACE[race] ?? null;
}

/**
 * "Darth Vader" → "DV". First and last word, so a middle name does not push the
 * surname out. Iterated as code points, so an emoji is not cut in half.
 */
export function characterInitials(name) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  }

  const first = Array.from(words[0])[0];
  const last = Array.from(words[words.length - 1])[0];

  return `${first}${last}`.toUpperCase();
}

/** A stable starting colour, so a new character is not always the same violet. */
export function suggestedAvatarColor(name) {
  let hash = 0;

  for (const character of String(name ?? "")) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }

  return AVATAR_COLOR_VALUES[hash % AVATAR_COLOR_VALUES.length];
}
