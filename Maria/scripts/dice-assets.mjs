/**
 * The dice-box assets, put where the browser can fetch them and tinted on the
 * way past. Run by `predev` and `prebuild`, so a fresh clone needs no extra
 * step — the package's own `postinstall` asks an interactive question and is
 * skipped by any install that blocks lifecycle scripts.
 *
 * The output is derived and git-ignored. Everything here is idempotent, and
 * a theme already built from the same inputs is left as it is — see
 * `fingerprint`.
 *
 * Two themes come out of the one the package ships: the meshes and the bump
 * are the same dice either way, and only the pigment on the numerals differs.
 * Their numerals are the stock glyphs as every skin wears them — with a 6 and
 * a 9 underlined — in that pigment, transparent everywhere else.
 *
 * The SKINS are painted from the same numerals — see dice-skins.mjs. Same
 * meshes, so a skin never changes how a die tumbles.
 *
 * Every theme is drawn by the vendored dice-box's physically based material
 * (`shading: "pbr"`, see Maria/vendor/dice-box), and so carries a surface map
 * — occlusion, roughness, metalness — where the stock theme has a specular one.
 *
 * A theme a character can choose also carries pictures of its dice for the
 * style picker — see dice-thumbnails.mjs.
 *
 * A skin in two colours carries a fourth map, `accent.png`, saying where the
 * second goes, and the numbers the vendored dice-box works that colour out
 * from — lib/dice-accent.mjs — in its config.
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DICE_ACCENT, DICE_ACCENT_SKINS } from "../lib/dice-accent.mjs";
import {
  DARK_NUMERAL_LEVEL,
  DICE_SKIN_THEMES,
  DICE_THEMES,
  DICE_TYPES,
  rgbOf,
} from "../lib/dice-themes.mjs";
import { DICE_SKIN_RECIPES, HOUSE_FINISH } from "./dice-recipes.mjs";
import {
  numeralInk,
  paintHouseColour,
  paintHouseSurface,
  paintSkins,
} from "./dice-skins.mjs";
import { drawThumbnails } from "./dice-thumbnails.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "public", "assets", "dice-box");

const require = createRequire(import.meta.url);
const SOURCE = path.join(
  path.dirname(require.resolve("@3d-dice/dice-box")),
  "assets",
);
const STOCK = path.join(SOURCE, "themes", "default");

/** What every theme needs and none of them changes. */
const SHARED = ["default.json", "normal.png"];

/** The themes a character can pick, which the style picker shows. */
const CHOOSABLE = new Set(Object.values(DICE_SKIN_THEMES));

/** Written last into each theme folder: what that theme was built from. */
const STAMP = ".fingerprint";

/**
 * A digest of everything that goes into a theme. A folder whose stamp matches
 * already is that theme and is left alone — painting the skins is nearly all
 * this script costs. The stamp is written after every other file, so a run cut
 * short leaves a folder that the next one rebuilds.
 */
function fingerprint(...parts) {
  const hash = createHash("sha256");

  for (const part of parts) {
    hash.update(
      Buffer.isBuffer(part) || typeof part === "string"
        ? part
        : JSON.stringify(part),
    );
    hash.update("\0");
  }

  return hash.digest("hex");
}

async function isBuilt(systemName, print) {
  try {
    const stamp = path.join(OUT, "themes", systemName, STAMP);

    return (await readFile(stamp, "utf8")) === print;
  } catch {
    return false;
  }
}

/**
 * A choosable theme's pictures, beside its maps — see-through if it is, and
 * with the tint of its second colour if it has one.
 */
async function writeThumbnails(
  folder,
  systemName,
  colour,
  surface,
  opacity,
  accent,
) {
  if (!CHOOSABLE.has(systemName)) {
    return;
  }

  const { tile, set } = drawThumbnails(scene, colour, surface, opacity, accent);

  await Promise.all([
    writeFile(path.join(folder, "tile.png"), tile.picture),
    writeFile(path.join(folder, "tile-tint.png"), tile.tint),
    writeFile(path.join(folder, "set.png"), set.picture),
    writeFile(path.join(folder, "set-tint.png"), set.tint),
    ...(accent
      ? [
          writeFile(path.join(folder, "tile-accent.png"), tile.accent),
          writeFile(path.join(folder, "set-accent.png"), set.accent),
        ]
      : []),
  ]);
}

/** A theme's folder, emptied of whatever an older build left in it. */
async function emptyFolder(systemName) {
  const folder = path.join(OUT, "themes", systemName);

  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });

  return folder;
}

function themeConfig(systemName, { name }, material = {}) {
  return {
    name,
    systemName,
    version: 1,
    meshFile: "default.json",
    material: {
      type: "color",
      shading: "pbr",
      diffuseTexture: {
        light: "numerals-light.png",
        dark: "numerals-dark.png",
      },
      diffuseLevel: 1,
      bumpTexture: "normal.png",
      bumpLevel: 0.5,
      metallicTexture: "surface.png",
      ...material,
    },
    diceAvailable: DICE_TYPES,
  };
}

async function writeTheme(systemName, theme, ink, print) {
  const folder = await emptyFolder(systemName);

  await Promise.all(
    SHARED.map((file) =>
      copyFile(path.join(STOCK, file), path.join(folder, file)),
    ),
  );

  const surface = paintHouseSurface(ink, HOUSE_FINISH);
  const light = paintHouseColour(ink, rgbOf(theme.numerals));

  // Both variants exist because dice-box builds a material for each and picks
  // between them by the luminance of the body colour it is given.
  await Promise.all([
    writeFile(path.join(folder, "numerals-light.png"), light),
    writeFile(
      path.join(folder, "numerals-dark.png"),
      paintHouseColour(ink, rgbOf(theme.numerals, DARK_NUMERAL_LEVEL)),
    ),
    writeFile(path.join(folder, "surface.png"), surface),
    writeThumbnails(folder, systemName, light, surface),
    writeFile(
      path.join(folder, "theme.config.json"),
      `${JSON.stringify(themeConfig(systemName, theme), null, 2)}\n`,
    ),
  ]);
  await writeFile(path.join(folder, STAMP), print);
}

/**
 * The painted skins asked for, from one read of the stock atlas. The mesh is
 * copied so each folder stands alone, though dice-box registers meshes by file
 * name and reuses the one already loaded.
 */
async function writeSkins(recipes, { meshes, numerals }, prints) {
  if (Object.keys(recipes).length === 0) {
    return;
  }

  const painted = paintSkins(recipes, { meshes: JSON.parse(meshes), numerals });

  await Promise.all(
    Object.entries(painted).map(([systemName, maps]) =>
      writeSkin(
        systemName,
        recipes[systemName],
        maps,
        meshes,
        prints[systemName],
      ),
    ),
  );
}

async function writeSkin(systemName, recipe, maps, meshes, print) {
  const folder = await emptyFolder(systemName);

  const material = {
    /* One file for both: dice-box picks the dark variant for a pale body, and
       the metal reads on either. Babylon loads a repeated URL once. */
    diffuseTexture: { light: "skin.png", dark: "skin.png" },
    // Authored at full strength. Babylon's PBR material multiplies a normal's
    // slope by the level, so a skin asking for more relief sets `bump`.
    bumpLevel: recipe.bump ?? 1,
    // A glossy layer over the lot, for a skin that has one — resin over foil.
    ...(recipe.coat && { clearCoat: recipe.coat }),
    // And how strongly it reflects the room — polished stone more than most.
    ...(recipe.environment && { environmentIntensity: recipe.environment }),
    // See-through, for glass: read by the vendored dice-box (its README).
    ...(recipe.opacity !== undefined && { opacity: recipe.opacity }),
    // Depth, from a height map in the normal map's alpha: the same.
    ...(recipe.parallax && { parallax: recipe.parallax }),
    // A second colour, worked out from the first: the same, its README.
    ...(recipe.accent && { accentTexture: "accent.png", accent: DICE_ACCENT }),
  };

  await Promise.all([
    writeFile(path.join(folder, "default.json"), meshes),
    writeFile(path.join(folder, "skin.png"), maps.colour),
    writeFile(path.join(folder, "normal.png"), maps.normal),
    writeFile(path.join(folder, "surface.png"), maps.surface),
    ...(maps.accent
      ? [writeFile(path.join(folder, "accent.png"), maps.accent)]
      : []),
    writeThumbnails(
      folder,
      systemName,
      maps.colour,
      maps.surface,
      recipe.opacity,
      maps.accent,
    ),
    writeFile(
      path.join(folder, "theme.config.json"),
      `${JSON.stringify(themeConfig(systemName, recipe, material), null, 2)}\n`,
    ),
  ]);
  await writeFile(path.join(folder, STAMP), print);
}

// The app asks for an accent's pictures by this list, so it must be the
// recipes' own.
for (const [systemName, recipe] of Object.entries(DICE_SKIN_RECIPES)) {
  if (Boolean(recipe.accent) !== DICE_ACCENT_SKINS.includes(systemName)) {
    throw new Error(
      `Dice skin "${systemName}" and DICE_ACCENT_SKINS disagree on its accent.`,
    );
  }
}

// A skin the app can throw must be a theme this script writes.
for (const [skin, theme] of Object.entries(DICE_SKIN_THEMES)) {
  if (!DICE_THEMES[theme] && !DICE_SKIN_RECIPES[theme]) {
    throw new Error(
      `Dice skin "${skin}" has no recipe in dice-recipes.mjs for "${theme}".`,
    );
  }
}

const [meshes, numerals, normal, painter, pictures, codec, script] =
  await Promise.all([
    readFile(path.join(STOCK, "default.json"), "utf8"),
    readFile(path.join(STOCK, "diffuse-light.png")),
    readFile(path.join(STOCK, "normal.png")),
    readFile(path.join(HERE, "dice-skins.mjs")),
    readFile(path.join(HERE, "dice-thumbnails.mjs")),
    readFile(path.join(HERE, "png.mjs")),
    readFile(fileURLToPath(import.meta.url)),
  ]);
const scene = JSON.parse(meshes);

// What every theme is built from beside its own entry: the stock dice, and the
// code that turns them into a theme. Recipes are data in a module of their
// own, so changing one repaints that skin alone; changing the painter, all.
const common = fingerprint(
  meshes,
  numerals,
  normal,
  painter,
  pictures,
  codec,
  script,
  DICE_TYPES,
);
const prints = Object.fromEntries([
  ...Object.entries(DICE_THEMES).map(([systemName, theme]) => [
    systemName,
    fingerprint(
      common,
      theme,
      HOUSE_FINISH,
      DARK_NUMERAL_LEVEL,
      rgbOf.toString(),
    ),
  ]),
  ...Object.entries(DICE_SKIN_RECIPES).map(([systemName, recipe]) => [
    systemName,
    fingerprint(common, recipe, recipe.accent ? DICE_ACCENT : null),
  ]),
]);

// Anything this run would not write goes: a theme dropped from the lists
// should stop being served.
await mkdir(path.join(OUT, "ammo"), { recursive: true });
await mkdir(path.join(OUT, "themes"), { recursive: true });

for (const entry of await readdir(OUT)) {
  if (entry !== "ammo" && entry !== "themes") {
    await rm(path.join(OUT, entry), { recursive: true, force: true });
  }
}

for (const entry of await readdir(path.join(OUT, "themes"))) {
  if (!(entry in prints)) {
    await rm(path.join(OUT, "themes", entry), { recursive: true, force: true });
  }
}

await copyFile(
  path.join(SOURCE, "ammo", "ammo.wasm.wasm"),
  path.join(OUT, "ammo", "ammo.wasm.wasm"),
);

const stale = new Set();

for (const [systemName, print] of Object.entries(prints)) {
  if (!(await isBuilt(systemName, print))) {
    stale.add(systemName);
  }
}

// The house dice's numerals, read off the atlas once, and only if needed.
const houseInk = Object.keys(DICE_THEMES).some((name) => stale.has(name))
  ? numeralInk({ meshes: scene, numerals })
  : null;

await Promise.all([
  ...Object.entries(DICE_THEMES)
    .filter(([systemName]) => stale.has(systemName))
    .map(([systemName, theme]) =>
      writeTheme(systemName, theme, houseInk, prints[systemName]),
    ),
  writeSkins(
    Object.fromEntries(
      Object.entries(DICE_SKIN_RECIPES).filter(([systemName]) =>
        stale.has(systemName),
      ),
    ),
    { meshes, numerals },
    prints,
  ),
]);

const where = path.relative(process.cwd(), OUT);

console.log(
  stale.size === 0
    ? `Dice assets: all ${Object.keys(prints).length} themes up to date → ${where}`
    : `Dice assets: built ${[...stale].join(", ")} → ${where}`,
);
