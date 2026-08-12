import { AVATAR_COLOR_VALUES, DEFAULT_AVATAR_COLOR } from "sina/rules/character";

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
 * add a file to Maria/public/races and an entry here, and it appears.
 *
 * The sources are 2744×1568 PNGs of roughly 4.5 MB each; these are 1280px
 * WebP re-encodes at about 45 KB, which is still far more detail than a card
 * a few hundred pixels wide can show. Next then resizes again per request, so
 * a card downloads around 6 KB.
 *
 * The originals sit in assets/races, which is git-ignored — 22 MB of binaries
 * would be in the history permanently, and nothing needs them at runtime.
 */
const IMAGE_BY_RACE = {
  Human: "/races/human.webp",
  Dragonborn: "/races/dragonborn.webp",
  Dwarf: "/races/dwarf.webp",
  Elf: "/races/elf.webp",
  "Half-Elf": "/races/half-elf.webp",
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
