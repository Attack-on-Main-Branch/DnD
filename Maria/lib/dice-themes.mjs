/**
 * The two faces a die wears, and the one place their colours are decided.
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

  /* The Dungeon Master's, kept back: deep amethyst under violet-300, which is
     the same step off the violet ramp `text-violet-400` sits on. */
  amethyst: {
    name: "Arcane Amethyst",
    body: "#2a1240",
    numerals: "#d8b4fe",
  },
};

/** Where the generated dice live under `public/`, as the browser asks for them. */
export const DICE_ASSET_PATH = "/assets/dice-box/";
