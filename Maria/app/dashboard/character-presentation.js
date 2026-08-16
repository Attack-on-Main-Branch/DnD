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
 * How a character looks — the frontend half of what Sina defines.
 *
 * Sina decides which colour slugs exist and the database enforces them; this
 * decides what each one looks like. Adding a colour is a change in both, and
 * the check below fails loudly at module load rather than silently rendering
 * the default.
 *
 * This comment used to promise that while a `??` fallback did the opposite: a
 * colour added to Sina but not here appeared in the picker, rendered as violet
 * and saved as itself, with nothing logged and nothing thrown.
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
 * The `??` stays here, and only here. This takes a value off a database row,
 * which can hold a slug written by an older deploy — a different question from
 * the two lists agreeing, which is what the check above settles.
 */
export function avatarColorClass(value) {
  return CLASS_BY_VALUE[value] ?? CLASS_BY_VALUE[DEFAULT_AVATAR_COLOR];
}

/**
 * The emblem for each archetype: one colour and one shape.
 *
 * The same split as the avatar palette above — Sina says which archetypes
 * exist, this says that a Warrior is a red lozenge and a Mage a blue disc.
 *
 * Hexes rather than palette slugs because these are not part of the app's
 * theme: they tint one 28px glyph and the faint wash behind a selected card,
 * and nothing else. Everything structural about selection — the rim, the glow,
 * the type — stays gold, so the accent reads as identity rather than as a
 * second, competing accent colour.
 *
 * Shapes are clip paths rather than SVG so the glyph is a single element that
 * can take the accent and its drop-shadow directly.
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
 * Artwork behind a character card, keyed by race.
 *
 * Not every race has one yet, and the card is designed to work without it —
 * drop a file in ./race-art, add an import and an entry here, and it appears.
 *
 * Imported as modules rather than referenced by a path under public/, and that
 * is load-bearing. A string like "/races/elf.webp" produces the same optimiser
 * URL forever, so replacing the file behind it leaves every browser that has
 * already fetched it showing the old picture until its cache expires — which
 * is exactly what happened the first time these were swapped. A static import
 * gives Next the file's contents, so the emitted URL carries a hash of them
 * and changing the art changes the URL. It also means the file is emitted once
 * rather than living in public/ and being copied again as a build asset.
 *
 * These are 1280px masters at WebP q85, 42-63 KB each. 1280 covers the widest
 * bucket any realistic device asks for: the card is 277px at desktop, and the
 * largest request in practice is a 430pt phone at 3x, around 1200px.
 *
 * Quality 85 rather than something smaller because this file is never served —
 * `next/image` re-encodes every bucket from it at q75, so a lossy master just
 * lowers the ceiling for a saving nobody downloads. What actually ships is
 * about 11 KB on a retina desktop and 25 KB on the largest phone.
 *
 * The full-resolution sources sit in assets/races, which is git-ignored.
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
 * "Darth Vader" → "DV". First and last word, so a middle name does not push
 * the surname out. A single word falls back to its first two letters.
 *
 * Iterated as code points rather than UTF-16 units, so an emoji or an accented
 * letter does not come back as half a character.
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
