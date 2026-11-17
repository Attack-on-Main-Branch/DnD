import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runInNewContext, Script } from "node:vm";
import { test } from "node:test";

const root = new URL("../vendor/dice-box/dist/", import.meta.url);
const onscreen = await readFile(new URL("world.onscreen.js", root), "utf8");
const outer = await readFile(new URL("world.offscreen.js", root), "utf8");
const encoded = outer.match(
  /\bconst\s+\w+\s*=\s*"([A-Za-z0-9+/=]{10000,})"/,
)[1];
const offscreen = Buffer.from(encoded, "base64").toString("utf8");

test("embedded render worker remains valid JavaScript", () => {
  assert.doesNotThrow(() => new Script(offscreen));
});

function runtime(source) {
  const start = source.indexOf("async loadPbrColorMaterial(");
  const end = source.indexOf("async loadColorMaterial(", start);
  const section = source.slice(start, end);
  const method = section.slice(0, section.lastIndexOf("}") + 1);
  const clone = method.match(/const\s+\w+\s*=\s*(\w+)\(\w+\)[,;]/)[1];
  const constructor = method.match(/new\s+(\w+)\(/)[1];
  const scene = { environmentTexture: {}, materials: [] };
  const textures = [];

  class Material {
    constructor(name, scene) {
      this.name = name;
      this.clearCoat = { texture: null };
      this.emissiveTexture = null;
      this.emissiveColour = [0, 0, 0];
      this.emissiveColor = {
        set: (...rgb) => {
          this.emissiveColour = rgb;
        },
      };
      scene.materials.push(this);
    }
  }

  for (const name of [
    "Vertex_Definitions",
    "Vertex_MainEnd",
    "Fragment_Definitions",
    "Fragment_Custom_Albedo",
    "Fragment_Custom_Alpha",
    "AddAttribute",
    "AddUniform",
  ]) {
    Material.prototype[name] = function () {
      return this;
    };
  }

  const load = runInNewContext(
    `(${method.replace("async loadPbrColorMaterial", "async function")})`,
    {
      [clone]: structuredClone,
      [constructor]: Material,
    },
  );
  const loader = {
    scene,
    getTexture: async (kind) => ({ kind }),
    importTextureAsync: async (url, theme) => {
      const texture = { url, theme, gammaSpace: true };
      textures.push(texture);
      return texture;
    },
  };

  return {
    scene,
    textures,
    load: (material) =>
      load.call(loader, {
        theme: "test",
        basePath: "/themes/test",
        material,
      }),
  };
}

for (const [name, source] of [
  ["onscreen", onscreen],
  ["offscreen", offscreen],
]) {
  test(`${name} materials share linear coat masks and coloured emission across variants`, async () => {
    const app = runtime(source);
    await app.load({
      diffuseTexture: { light: "skin.png", dark: "skin.png" },
      clearCoat: { intensity: 1, roughness: 0.008, texture: "coat.png" },
      emissiveTexture: "emissive.png",
      emissiveIntensity: 0.32,
      environmentIntensity: 3,
    });

    assert.equal(app.scene.materials.length, 2);
    assert.equal(app.textures.length, 2);
    const [coat, emissive] = app.textures;
    assert.equal(coat.url, "/themes/test/coat.png");
    assert.equal(coat.gammaSpace, false);
    assert.equal(emissive.url, "/themes/test/emissive.png");
    assert.equal(emissive.gammaSpace, true);

    for (const material of app.scene.materials) {
      assert.equal(material.clearCoat.texture, coat);
      assert.equal(material.clearCoat.isEnabled, true);
      assert.equal(material.clearCoat.roughness, 0.008);
      assert.equal(material.emissiveTexture, emissive);
      assert.deepEqual(material.emissiveColour, [1, 1, 1]);
      assert.equal(material.emissiveIntensity, 0.32);
      assert.equal(material.environmentIntensity, 3);
    }
  });

  test(`${name} legacy dice retain their existing coat, glass and parallax settings`, async () => {
    const app = runtime(source);
    await app.load({
      clearCoat: { intensity: 0.6, roughness: 0.04 },
      bumpTexture: "normal.png",
      parallax: 0.016,
      opacity: 0.6,
    });
    assert.equal(app.textures.length, 0);
    for (const material of app.scene.materials) {
      assert.equal(material.clearCoat.texture, null);
      assert.equal(material.clearCoat.intensity, 0.6);
      assert.equal(material.clearCoat.roughness, 0.04);
      assert.equal(material.emissiveTexture, null);
      assert.equal(material.alpha, 0.6);
      assert.equal(material.useParallaxOcclusion, true);
      assert.equal(material.environmentIntensity, 1);
    }
  });
}

test("material changes leave the seeded main-thread and physics bundle unchanged", async () => {
  const bytes = await readFile(new URL("dice-box.es.js", root));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "d1caccae54bd074c84eee2055dbb77073b6a95d294f973e610a71bad4bc59a89",
  );
});
