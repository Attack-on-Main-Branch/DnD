/**
 * The dice-box assets, put where the browser can fetch them and tinted on the
 * way past. Run by `predev` and `prebuild`, so a fresh clone needs no extra
 * step — the package's own `postinstall` asks an interactive question and is
 * skipped by any install that blocks lifecycle scripts.
 *
 * The output is derived and git-ignored. Everything here is idempotent.
 *
 * Two themes come out of the one the package ships: the meshes, the bump and
 * the specular map are the same dice either way, and only the pigment on the
 * numerals differs. The glyph textures are 4-bit PALETTE PNGs whose whole
 * palette is a fifteen-byte PLTE chunk — entry 0 is the body and is fully
 * transparent, entries 1 to 4 are the glyph and its antialiasing ramp — so
 * recolouring is a rewrite of those bytes and a fresh CRC. No pixel is touched,
 * nothing is decoded, and the two files stay byte-for-byte as sharp as the
 * originals.
 */

import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DICE_THEMES } from "../lib/dice-themes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "public", "assets", "dice-box");

const require = createRequire(import.meta.url);
const SOURCE = path.join(
  path.dirname(require.resolve("@3d-dice/dice-box")),
  "assets",
);

/** What every theme needs and none of them changes. */
const SHARED = ["default.json", "normal.png", "specular.jpg"];

const DICE_AVAILABLE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

/** How far the dark variant of a numeral is taken down. */
const DARK_LEVEL = 0.35;

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function rgb(hex, level = 1) {
  const value = parseInt(hex.replace("#", ""), 16);

  return [
    Math.round(((value >> 16) & 255) * level),
    Math.round(((value >> 8) & 255) * level),
    Math.round((value & 255) * level),
  ];
}

/**
 * The same PNG with its palette repainted. Entry 0 is left alone: it is the
 * die's own surface, `tRNS` gives it an alpha of zero, and the shader fills it
 * with `themeColor` at runtime.
 */
function repaintPalette(png, colour) {
  const out = Buffer.from(png);
  let offset = 8;

  while (offset < out.length) {
    const length = out.readUInt32BE(offset);
    const type = out.toString("ascii", offset + 4, offset + 8);

    if (type === "PLTE") {
      const start = offset + 8;

      for (let entry = 1; entry * 3 < length; entry++) {
        out.set(colour, start + entry * 3);
      }

      out.writeUInt32BE(
        crc32(out.subarray(offset + 4, start + length)),
        start + length,
      );

      return out;
    }

    offset += 12 + length;
  }

  throw new Error("Expected a palette PNG: no PLTE chunk found.");
}

function themeConfig(systemName, { name }) {
  return {
    name,
    systemName,
    version: 1,
    meshFile: "default.json",
    material: {
      type: "color",
      diffuseTexture: {
        light: "numerals-light.png",
        dark: "numerals-dark.png",
      },
      diffuseLevel: 1,
      bumpTexture: "normal.png",
      bumpLevel: 0.5,
      specularTexture: "specular.jpg",
      specularPower: 1,
    },
    diceAvailable: DICE_AVAILABLE,
  };
}

async function writeTheme(systemName, theme) {
  const folder = path.join(OUT, "themes", systemName);
  const stock = path.join(SOURCE, "themes", "default");

  await mkdir(folder, { recursive: true });

  await Promise.all(
    SHARED.map((file) =>
      copyFile(path.join(stock, file), path.join(folder, file)),
    ),
  );

  // Both variants exist because dice-box builds a material for each and picks
  // between them by the luminance of the body colour it is given.
  const glyphs = await readFile(path.join(stock, "diffuse-light.png"));

  await Promise.all([
    writeFile(
      path.join(folder, "numerals-light.png"),
      repaintPalette(glyphs, rgb(theme.numerals)),
    ),
    writeFile(
      path.join(folder, "numerals-dark.png"),
      repaintPalette(glyphs, rgb(theme.numerals, DARK_LEVEL)),
    ),
    writeFile(
      path.join(folder, "theme.config.json"),
      `${JSON.stringify(themeConfig(systemName, theme), null, 2)}\n`,
    ),
  ]);
}

// Cleared rather than merged: a theme dropped from DICE_THEMES should stop
// being served, and a half-written run should not survive the next one.
await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, "ammo"), { recursive: true });

await copyFile(
  path.join(SOURCE, "ammo", "ammo.wasm.wasm"),
  path.join(OUT, "ammo", "ammo.wasm.wasm"),
);

await Promise.all(
  Object.entries(DICE_THEMES).map(([systemName, theme]) =>
    writeTheme(systemName, theme),
  ),
);

console.log(
  `Dice assets: ${Object.keys(DICE_THEMES).join(", ")} → ${path.relative(process.cwd(), OUT)}`,
);
