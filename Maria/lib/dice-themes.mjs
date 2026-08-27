/**
 * The two faces the HOUSE's dice wear, and the one place their colours are
 * decided. A player's own dice are the first of these two, repainted — see
 * `DICE_BODY_THEME` below.
 *
 * `.mjs` because both ends have to read it: the app imports it for the body
 * colour it hands the roller, and `scripts/dice-assets.mjs` imports it under
 * plain Node to bake `numerals` into the textures it generates. Maria's
 * package.json declares no `"type"`, so a `.js` file here would be CommonJS to
 * that script and unimportable.
 *
 * `numerals` is the pigment on the glyphs and `body` the die itself.
 * dice-box's colour material paints the body from `themeColor` at runtime and
 * takes the glyphs from a texture, so only the second needs generating — see
 * the script for the fifteen bytes that carry it.
 */
export const DICE_THEMES = {
  /* The public roll: obsidian, a shade warmer than `--color-surface` so it
     still reads as an object against the arena behind it, lettered in
     `--color-gold`. */
  obsidian: {
    name: "Obsidian & Gold",
    body: "#14100a",
    numerals: "#ffdf9c",
  },

  /* The Dungeon Master's, kept back. THE SAME OBSIDIAN as the roll above it —
     the house's dice are one set of dice, and a die that changes material when
     it is hidden says the wrong thing about what the veil does. Only the
     lettering changes: violet-400, which is the ramp `--color-arcane` and
     `text-violet-400` are both taken off, so the numerals on the board and the
     rail that threw them are lit from one colour. */
  amethyst: {
    name: "Arcane Amethyst",
    body: "#14100a",
    numerals: "#c084fc",
  },
};

/**
 * The twelve a PLAYER can be, as body colours.
 *
 * Not a theme each, and deliberately: dice-box paints the body from
 * `themeColor` at runtime and takes the glyphs from a texture, so twelve
 * colours are twelve arguments to one theme rather than twelve theme folders
 * to download. The library picks the light or the dark lettering off the
 * luminance of whatever body it is handed, which is why a lime die letters
 * dark and a blue one letters gold with nothing here to say so.
 *
 * The hexes themselves are Maria's, beside the classes the same slugs wear on
 * screen — see app/dashboard/character-presentation.js. This file is imported
 * by `scripts/dice-assets.mjs` under plain Node, and that script bakes nothing
 * from them.
 */
export const DICE_BODY_THEME = "obsidian";

/**
 * How a die is LIT, which is the other half of what makes two rollers show the
 * same object.
 *
 * There are two of them. The table's arena is a battle map; the creation
 * sheet's preview is a box the size of a stamp — so the world, the throw and
 * the scale are each roller's own. The LIGHT is not: a die lit differently is a
 * different die, and the whole point of the preview is that it is the one you
 * will actually throw.
 */
export const DICE_LIGHTING = {
  enableShadows: true,
  shadowTransparency: 0.9,
  lightIntensity: 1.15,
};

/** How far the dark variant of a numeral is taken down when it is generated. */
export const DARK_NUMERAL_LEVEL = 0.35;

/** `#e11d48` → `[225, 29, 72]`, optionally dimmed. */
export function rgbOf(hex, level = 1) {
  const value = parseInt(hex.replace("#", ""), 16);

  return [
    Math.round(((value >> 16) & 255) * level),
    Math.round(((value >> 8) & 255) * level),
    Math.round((value & 255) * level),
  ];
}

/** Where the generated dice live under `public/`, as the browser asks for them. */
export const DICE_ASSET_PATH = "/assets/dice-box/";
