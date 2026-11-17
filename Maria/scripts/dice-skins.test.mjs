import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { DICE_TYPES } from "../lib/dice-themes.mjs";
import { DICE_SKIN_RECIPES } from "./dice-recipes.mjs";
import { paintSkins } from "./dice-skins.mjs";
import { drawThumbnails } from "./dice-thumbnails.mjs";
import { decodePng } from "./png.mjs";

async function stockDice() {
  const stock = new URL(
    "../vendor/dice-box/dist/assets/themes/default/",
    import.meta.url,
  );
  const [mesh, numerals] = await Promise.all([
    readFile(new URL("default.json", stock), "utf8"),
    readFile(new URL("diffuse-light.png", stock)),
  ]);

  return { meshes: JSON.parse(mesh), numerals };
}

test("Iron Bloom tints petals on every die and keeps the stems and iron fixed", async () => {
  const stock = await stockDice();
  const name = "iron-bloom";
  const recipe = DICE_SKIN_RECIPES[name];
  const maps = paintSkins({ [name]: recipe }, stock)[name];
  const colour = decodePng(maps.colour);
  const surface = decodePng(maps.surface);
  let iron = 0;
  let stems = 0;
  let petals = 0;

  for (let pixel = 0; pixel < colour.width * colour.height; pixel++) {
    const at = pixel * 4;
    const [r, g, b, alpha] = colour.samples.subarray(at, at + 4);
    const metalness = surface.samples[pixel * 3 + 2];

    if (metalness === Math.round(recipe.metalness * 255)) {
      iron++;
      assert.equal(alpha, 255, "iron cannot inherit the player's colour");
    }

    if (alpha === 255 && g > Math.max(r, b) + 35) {
      stems++;
    }

    if (alpha < 25) {
      petals++;
      assert.ok(metalness < 25, "petals sit in the engraved metal");
    }
  }

  assert.ok(iron > stems + petals);
  assert.ok(stems > 0, "green inlay is fully opaque");
  assert.ok(petals > 0, "petals take the player's colour");

  const { set } = drawThumbnails(stock.meshes, maps.colour, maps.surface);
  const { width, channels, samples } = decodePng(set.picture);
  const cell = width / DICE_TYPES.length;
  const openings = new Array(DICE_TYPES.length).fill(0);
  const tint = decodePng(set.tint).samples;

  for (let at = channels - 1; at < samples.length; at += channels) {
    if (samples[at] < 80 && tint[at] > 100) {
      openings[Math.floor((Math.floor(at / channels) % width) / cell)]++;
    }
  }

  for (const [index, die] of DICE_TYPES.entries()) {
    assert.ok(openings[index] > 0, `${die} preview shows tintable petals`);
  }
});

test("Stained Glass uses polished dielectric panes, rough leading and unchanged meshes", async () => {
  const { meshes, numerals } = await stockDice();
  const before = structuredClone(meshes);
  const recipe = DICE_SKIN_RECIPES["stained-glass"];
  const recipes = { "stained-glass": recipe };
  const maps = paintSkins(recipes, { meshes, numerals })["stained-glass"];

  assert.deepEqual(meshes, before);
  assert.deepEqual(
    paintSkins(recipes, { meshes, numerals })["stained-glass"],
    maps,
  );
  assert.equal(maps.meshes, undefined);
  const colour = decodePng(maps.colour);
  const surface = decodePng(maps.surface);
  const normal = decodePng(maps.normal);
  const coat = decodePng(maps.coat);
  const emissive = decodePng(maps.emissive);
  assert.equal(coat.channels, 3);
  assert.equal(emissive.channels, 3);
  assert.ok(recipe.coat.roughness < recipe.finish.glass);
  assert.ok(recipe.glow.intensity > 0);
  assert.deepEqual(
    [colour.width, colour.height, colour.channels],
    [1024, 1024, 4],
  );
  assert.deepEqual(
    [surface.width, surface.height, surface.channels],
    [1024, 1024, 3],
  );
  assert.deepEqual(
    [normal.width, normal.height, normal.channels],
    [1024, 1024, 3],
  );
  let glass = 0;
  let leading = 0;
  const hues = new Set();

  for (let pixel = 0; pixel < colour.width * colour.height; pixel++) {
    const rgb = Array.from(colour.samples.subarray(pixel * 4, pixel * 4 + 3));
    const roughness = surface.samples[pixel * 3 + 1];
    const metalness = surface.samples[pixel * 3 + 2];
    assert.equal(colour.samples[pixel * 4 + 3], 255);
    assert.ok(normal.samples[pixel * 3 + 2] > 127);

    if (
      roughness === Math.round(recipe.finish.glass * 255) &&
      metalness === 0 &&
      Math.max(...rgb) - Math.min(...rgb) > 35
    ) {
      glass++;
      assert.ok(
        coat.samples[pixel * 3] >= 250,
        "polished glass receives the gloss coat",
      );
      assert.ok(
        Math.max(...emissive.samples.subarray(pixel * 3, pixel * 3 + 3)) > 50,
        "coloured panes are self-lit",
      );
      hues.add(rgb.indexOf(Math.max(...rgb)));
    }

    if (
      roughness === Math.round(recipe.finish.lead * 255) &&
      Math.max(...rgb) < 40
    ) {
      leading++;
      assert.ok(coat.samples[pixel * 3] <= 2, "leading stays uncoated");
      assert.ok(
        Math.max(...emissive.samples.subarray(pixel * 3, pixel * 3 + 3)) <= 2,
        "leading does not glow",
      );
    }
  }

  assert.ok(
    glass > 20_000,
    "coloured panes are smooth glass, not tinted metal",
  );
  assert.ok(leading > 5_000, "dark leading has a separate, rougher finish");
  assert.equal(hues.size, 3, "the window includes warm, green and blue glass");
  const basePicture = drawThumbnails(meshes, maps.colour, maps.surface).tile
    .picture;
  const glassPicture = drawThumbnails(
    meshes,
    maps.colour,
    maps.surface,
    undefined,
    undefined,
    {
      coat: maps.coat,
      clearCoat: recipe.coat,
      emissive: maps.emissive,
      emissiveIntensity: recipe.glow.intensity,
      environmentIntensity: recipe.environment,
    },
  ).tile.picture;
  const brightness = (png) =>
    decodePng(png).samples.reduce(
      (sum, value, i) => sum + (i % 4 === 3 ? 0 : value),
      0,
    );
  assert.ok(
    brightness(glassPicture) > brightness(basePicture) * 1.05,
    "the skin picker shows the brighter, glowing panes",
  );
});

test("Prismatic paints opaque, deterministic PBR relief without changing the dice", async () => {
  const { meshes, numerals } = await stockDice();
  const before = structuredClone(meshes);
  const recipes = { prismatic: DICE_SKIN_RECIPES.prismatic };
  const maps = paintSkins(recipes, { meshes, numerals }).prismatic;

  assert.deepEqual(meshes, before);
  assert.deepEqual(paintSkins(recipes, { meshes, numerals }).prismatic, maps);

  for (const [name, channels] of [
    ["colour", 4],
    ["surface", 3],
    ["normal", 4],
  ]) {
    const image = decodePng(maps[name]);

    assert.equal(image.width, 1024);
    assert.equal(image.height, 1024);
    assert.equal(image.channels, channels);

    if (name === "colour") {
      for (let at = 3; at < image.samples.length; at += channels) {
        assert.equal(image.samples[at], 255);
      }
    }

    if (name === "normal") {
      const heights = new Set();

      for (let at = 0; at < image.samples.length; at += channels) {
        assert.ok(image.samples[at + 2] > 127, "normal points out of the face");
        heights.add(image.samples[at + 3]);
      }

      assert.ok(heights.size > 100, "relief retains a smooth range of depths");
    }

    if (name === "surface") {
      const metals = new Set();

      for (let at = 2; at < image.samples.length; at += channels) {
        metals.add(image.samples[at]);
      }

      assert.ok(metals.has(Math.round(0.3 * 255)), "enamel has its own finish");
      assert.ok(
        metals.has(Math.round(0.85 * 255)),
        "metal keeps its reflective finish",
      );
    }
  }
});
