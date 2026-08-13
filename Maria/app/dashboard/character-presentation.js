import { AVATAR_COLOR_VALUES, DEFAULT_AVATAR_COLOR } from "sina/rules/character";

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
 * the lookup below fails loudly rather than silently rendering nothing.
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

export const AVATAR_COLORS = AVATAR_COLOR_VALUES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
  className: CLASS_BY_VALUE[value] ?? CLASS_BY_VALUE[DEFAULT_AVATAR_COLOR],
}));

export function avatarColorClass(value) {
  return CLASS_BY_VALUE[value] ?? CLASS_BY_VALUE[DEFAULT_AVATAR_COLOR];
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
