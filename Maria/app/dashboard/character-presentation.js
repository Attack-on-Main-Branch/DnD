import {
  DEFAULT_DICE_COLOR,
  DEFAULT_DICE_SKIN,
  DICE_SKIN_RARITIES,
  DICE_SKIN_VALUES,
  diceSkinRarity,
  isDiceColor,
} from "sina/rules/character";

import { DICE_ACCENT_SKINS } from "@/lib/dice-accent";
import { DICE_ASSET_PATH, DICE_SKIN_THEMES } from "@/lib/dice-themes";

import changelingArt from "./race-art/changeling.webp";
import dragonbornArt from "./race-art/dragonborn.webp";
import dwarfArt from "./race-art/dwarf.webp";
import elfArt from "./race-art/elf.webp";
import erinaArt from "./race-art/erina.webp";
import gnomeArt from "./race-art/gnome.webp";
import halfElfArt from "./race-art/half-elf.webp";
import halfOrcArt from "./race-art/half-orc.webp";
import halflingArt from "./race-art/halfling.webp";
import humanArt from "./race-art/human.webp";
import kipirArt from "./race-art/kipir.webp";
import tieflingArt from "./race-art/tiefling.webp";

/**
 * How a character looks — the frontend half of what Sina defines.
 *
 * A character's colour is any hex, worn as an inline style wherever it paints
 * something: a Tailwind class cannot be built from a value.
 */

/** Quick picks beside the colour picker: the twelve the sheet used to offer. */
export const DICE_COLOR_PRESETS = [
  { label: "Rose", hex: "#e11d48" },
  { label: "Orange", hex: "#ea580c" },
  { label: "Amber", hex: "#d97706" },
  { label: "Lime", hex: "#65a30d" },
  { label: "Emerald", hex: "#059669" },
  { label: "Teal", hex: "#0d9488" },
  { label: "Cyan", hex: "#0891b2" },
  { label: "Sky", hex: "#0284c7" },
  { label: "Blue", hex: "#2563eb" },
  { label: "Violet", hex: "#7c3aed" },
  { label: "Fuchsia", hex: "#c026d3" },
  { label: "Pink", hex: "#db2777" },
];

/** The fallback belongs here: a row can predate the migration to hex. */
export function diceColorHex(value) {
  return isDiceColor(value) ? value : DEFAULT_DICE_COLOR;
}

/** What each dice style is called on the sheet. */
const SKIN_COPY = {
  classic: { label: "Classic", description: "Your colour, gold numbers" },
  "metal-rimmed": {
    label: "Metal-rimmed",
    description: "Glittering enamel in a pewter frame",
  },
  "gold-rimmed": {
    label: "Gold-rimmed",
    description: "Glittering enamel in a gold frame",
  },
  "brass-rimmed": {
    label: "Brass-rimmed",
    description: "Glittering enamel in a brass frame",
  },
  epoxy: {
    label: "Epoxy",
    description: "Crumpled foil and glitter in clear resin",
  },
  paper: {
    label: "Paper",
    description: "Folded from a sheet, drawn in your colour",
  },
  cracked: {
    label: "Cracked",
    description: "Black, split by glittering cracks in your colour",
  },
  "metal-inlaid": {
    label: "Metal-inlaid",
    description: "Glitter inlaid round worn pewter plates",
  },
  "gold-inlaid": {
    label: "Gold-inlaid",
    description: "Glitter inlaid round worn gold plates",
  },
  "brass-inlaid": {
    label: "Brass-inlaid",
    description: "Glitter inlaid round worn brass plates",
  },
  "metal-cornered": {
    label: "Metal-cornered",
    description: "Swirled enamel in your colour, rimmed and cornered in pewter",
  },
  "brass-cornered": {
    label: "Brass-cornered",
    description: "Swirled enamel in your colour, rimmed and cornered in brass",
  },
  "gold-cornered": {
    label: "Gold-cornered",
    description: "Swirled enamel in your colour, rimmed and cornered in gold",
  },
  asiimov: {
    label: "Asiimov",
    description: "White and black panels, cornered in your colour",
  },
  wood: {
    label: "Wood",
    description: "Striped hardwood, burnt numbers — keeps its own colour",
  },
  companion: {
    label: "Companion",
    description: "White corners on slate, lit through in your colour",
  },
  crystal: {
    label: "Crystal",
    description: "Polished crystal in your colour, chipped all over",
  },
  glass: {
    label: "Glass",
    description: "Misted see-through glass in your colour",
  },
  galaxy: {
    label: "Galaxy",
    description: "A spiral galaxy in your colour, copper numbers",
  },
  pearl: {
    label: "Marble",
    description:
      "Flowing silk-like pearl in deep coloured resin, white numbers",
  },
  fade: {
    label: "Fade",
    description: "Your colour fading unevenly darker, with glitter",
  },
  ornate: {
    label: "Ornate",
    description: "Black, with raised scrollwork in your colour",
  },
  "case-hardened": {
    label: "Case Hardened",
    description: "Heat-tinted steel, mostly blue — keeps its own colour",
  },
  bloodied: {
    label: "Bloodied",
    description: "Battered silver, spattered with blood in your colour",
  },
  dragonscale: {
    label: "Dragonscale",
    description: "Scales in your colour, patched in a colour to match it",
  },
  labradorite: {
    label: "Labradorite",
    description:
      "Grey stone glowing blue, teal and gold — keeps its own colour",
  },
};

/**
 * A rarity's frame round its picture: the border, and the glow fading inward
 * from it, both stronger the rarer the style — and its colour wherever else it
 * is shown: a log line's stripe, the bar under a card on the pouch's reel.
 * Literal class strings, for Tailwind's scanner.
 */
const RARITY_LOOK = {
  common: {
    label: "Common",
    text: "text-rarity-common",
    stripe: "border-l-rarity-common",
    bar: "bg-rarity-common",
    wash: "from-rarity-common/25",
    edge: "border-rarity-common/40",
    edgeHover: "hover:border-rarity-common/65",
    edgeSelected:
      "border-rarity-common/80 shadow-[0_18px_44px_-30px_var(--color-rarity-common)]",
    glow: "shadow-[inset_0_0_18px_-4px_var(--color-rarity-common)] opacity-45",
    glowSelected:
      "shadow-[inset_0_0_18px_-4px_var(--color-rarity-common)] opacity-80",
  },
  uncommon: {
    label: "Uncommon",
    text: "text-rarity-uncommon",
    stripe: "border-l-rarity-uncommon",
    bar: "bg-rarity-uncommon",
    wash: "from-rarity-uncommon/25",
    edge: "border-rarity-uncommon/40",
    edgeHover: "hover:border-rarity-uncommon/65",
    edgeSelected:
      "border-rarity-uncommon/80 shadow-[0_18px_44px_-29px_var(--color-rarity-uncommon)]",
    glow: "shadow-[inset_0_0_21px_-4px_var(--color-rarity-uncommon)] opacity-45",
    glowSelected:
      "shadow-[inset_0_0_21px_-4px_var(--color-rarity-uncommon)] opacity-80",
  },
  rare: {
    label: "Rare",
    text: "text-rarity-rare",
    stripe: "border-l-rarity-rare",
    bar: "bg-rarity-rare",
    wash: "from-rarity-rare/25",
    edge: "border-rarity-rare/40",
    edgeHover: "hover:border-rarity-rare/65",
    edgeSelected:
      "border-rarity-rare/80 shadow-[0_18px_44px_-28px_var(--color-rarity-rare)]",
    glow: "shadow-[inset_0_0_24px_-4px_var(--color-rarity-rare)] opacity-50",
    glowSelected:
      "shadow-[inset_0_0_24px_-4px_var(--color-rarity-rare)] opacity-85",
  },
  epic: {
    label: "Epic",
    text: "text-rarity-epic",
    stripe: "border-l-rarity-epic",
    bar: "bg-rarity-epic",
    wash: "from-rarity-epic/25",
    edge: "border-rarity-epic/45",
    edgeHover: "hover:border-rarity-epic/70",
    edgeSelected:
      "border-rarity-epic/90 shadow-[0_18px_44px_-26px_var(--color-rarity-epic)]",
    glow: "shadow-[inset_0_0_32px_-3px_var(--color-rarity-epic)] opacity-60",
    glowSelected:
      "shadow-[inset_0_0_32px_-3px_var(--color-rarity-epic)] opacity-100",
  },
  legendary: {
    label: "Legendary",
    text: "text-rarity-legendary",
    stripe: "border-l-rarity-legendary",
    bar: "bg-rarity-legendary",
    wash: "from-rarity-legendary/25",
    edge: "border-rarity-legendary/50",
    edgeHover: "hover:border-rarity-legendary/80",
    edgeSelected:
      "border-rarity-legendary shadow-[0_18px_44px_-24px_var(--color-rarity-legendary)]",
    glow: "shadow-[inset_0_0_42px_-2px_var(--color-rarity-legendary)] opacity-70",
    glowSelected:
      "shadow-[inset_0_0_42px_-2px_var(--color-rarity-legendary)] opacity-100",
  },
  iconic: {
    label: "Iconic",
    text: "text-rarity-iconic",
    stripe: "border-l-rarity-iconic",
    bar: "bg-rarity-iconic",
    wash: "from-rarity-iconic/25",
    edge: "border-rarity-iconic/60",
    edgeHover: "hover:border-rarity-iconic/90",
    edgeSelected:
      "border-rarity-iconic shadow-[0_18px_44px_-20px_var(--color-rarity-iconic)]",
    glow: "shadow-[inset_0_0_52px_-1px_var(--color-rarity-iconic)] opacity-80",
    glowSelected:
      "shadow-[inset_0_0_52px_-1px_var(--color-rarity-iconic)] opacity-100",
  },
};

const UNDRESSED_SKINS = DICE_SKIN_VALUES.filter(
  (value) => !SKIN_COPY[value] || !RARITY_LOOK[diceSkinRarity(value)],
);

if (UNDRESSED_SKINS.length > 0) {
  throw new Error(
    `character-presentation: dice style ${UNDRESSED_SKINS.join(", ")} has no ` +
      `copy or rarity look here.`,
  );
}

/** Commonest first, as Sina lists them. */
export const DICE_SKINS = DICE_SKIN_VALUES.map((value) => ({
  value,
  ...SKIN_COPY[value],
  rarity: RARITY_LOOK[diceSkinRarity(value)],
}));

export const DICE_SKIN_GROUPS = DICE_SKIN_RARITIES.map((value) => ({
  value,
  rarity: RARITY_LOOK[value],
  skins: DICE_SKINS.filter((option) => diceSkinRarity(option.value) === value),
}));

/** One style's entry above. A row may predate the style. */
export function diceSkinDetails(value) {
  return DICE_SKINS.find((option) => option.value === value) ?? DICE_SKINS[0];
}

export function diceRarityLook(rarity) {
  return RARITY_LOOK[rarity] ?? RARITY_LOOK.common;
}

/** The dice-box theme a style is thrown as. A row may predate the style. */
export function diceSkinTheme(value) {
  return DICE_SKIN_THEMES[value] ?? DICE_SKIN_THEMES[DEFAULT_DICE_SKIN];
}

/**
 * Where a style's pictures are, each a picture and its tint — drawn at build
 * time by scripts/dice-thumbnails.mjs into the theme's own folder. `tile` is
 * one d20; `set` is every die in DICE_TYPES side by side.
 */
export function diceSkinPictures(value) {
  const theme = diceSkinTheme(value);
  const folder = `${DICE_ASSET_PATH}themes/${theme}/`;
  const accented = DICE_ACCENT_SKINS.includes(theme);
  const picture = (name) => ({
    src: `${folder}${name}.png`,
    tint: `${folder}${name}-tint.png`,
    ...(accented && { accent: `${folder}${name}-accent.png` }),
  });

  return { tile: picture("tile"), set: picture("set") };
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
 * Artwork behind a character card, keyed by race. All twelve of Sina's races have
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
  Changeling: changelingArt,
  Erina: erinaArt,
  Kipir: kipirArt,
};

export function raceImage(race) {
  return IMAGE_BY_RACE[race] ?? null;
}
