import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  SPIDER_LILY_FRAME,
  SPIDER_LILY_FLOWERS,
} from "../lib/spider-lily-art.mjs";

const OUTPUT = new URL(
  "../app/dashboard/banner-art/spider-lilies/",
  import.meta.url,
);
const SOURCE = new URL("./banner-art/spider-lilies.png", import.meta.url);
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const { width, height } = SPIDER_LILY_FRAME;
const theme = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const night = theme.match(/--color-lily-night:\s*(#[\da-f]+);/i)?.[1];
if (!night) throw new Error("banner-assets: missing lily background token");

const source = await readFile(SOURCE);
const fingerprint = createHash("sha256")
  .update(await readFile(fileURLToPath(import.meta.url)))
  .update(source)
  .update(
    JSON.stringify({
      night,
      SPIDER_LILY_FRAME,
      SPIDER_LILY_FLOWERS,
      versions: sharp.versions,
    }),
  )
  .digest("hex");
const names = [
  "background",
  "meadow",
  ...SPIDER_LILY_FLOWERS.map(({ name }) => name),
];
const stamp = new URL(".fingerprint", OUTPUT);
const built = await readFile(stamp, "utf8").catch(() => null);
const present = await Promise.all(
  [...names.map((name) => `${name}.webp`), "still.webp", "layout.json"].map(
    (name) =>
      access(new URL(name, OUTPUT)).then(
        () => true,
        () => false,
      ),
  ),
);

if (built === fingerprint && present.every(Boolean)) {
  process.stdout.write("Banner artwork is up to date.\n");
} else {
  const metadata = await sharp(source).metadata();
  const sprites = await Promise.all(
    Array.from({ length: 6 }, async (_, index) => {
      const left = Math.round(((index % 3) * metadata.width) / 3);
      const top = Math.round((Math.floor(index / 3) * metadata.height) / 2);
      const spriteWidth =
        Math.round((((index % 3) + 1) * metadata.width) / 3) - left;
      const spriteHeight =
        Math.round(((Math.floor(index / 3) + 1) * metadata.height) / 2) - top;
      const feather = Buffer.from(
        `<svg width="${spriteWidth}" height="${spriteHeight}"><defs><linearGradient id="edge"><stop stop-opacity="0"/><stop offset=".025" stop-opacity="1"/><stop offset=".975" stop-opacity="1"/><stop offset="1" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#edge)"/></svg>`,
      );
      return sharp(source)
        .extract({ left, top, width: spriteWidth, height: spriteHeight })
        .composite([{ input: feather, blend: "dest-in" }])
        .png()
        .toBuffer();
    }),
  );

  async function plant({
    x,
    y,
    size,
    sprite = 0,
    angle = 0,
    brightness = 1,
    mirror = false,
  }) {
    const { data, info } = await sharp(sprites[sprite % sprites.length])
      .resize({ width: size })
      .flop(mirror)
      .rotate(angle, { background: TRANSPARENT })
      .modulate({ brightness })
      .png()
      .toBuffer({ resolveWithObject: true });
    return {
      input: data,
      left: Math.round(x - info.width / 2),
      top: Math.round(y),
      width: info.width,
      height: info.height,
    };
  }

  async function clip(plant, bounds) {
    const left = Math.max(plant.left, bounds.left);
    const top = Math.max(plant.top, bounds.top);
    const cropWidth =
      Math.min(plant.left + plant.width, bounds.left + bounds.width) - left;
    const cropHeight =
      Math.min(plant.top + plant.height, bounds.top + bounds.height) - top;
    if (cropWidth <= 0 || cropHeight <= 0) return null;
    const input = await sharp(plant.input)
      .extract({
        left: left - plant.left,
        top: top - plant.top,
        width: cropWidth,
        height: cropHeight,
      })
      .png()
      .toBuffer();
    return { input, left: left - bounds.left, top: top - bounds.top };
  }

  const distant = Array.from({ length: 25 }, (_, index) => ({
    x: -30 + index * 53 + Math.sin(index * 2.4) * 18,
    y: 190 + Math.sin(index * 1.7) * 47,
    size: Math.round(145 + Math.sin(index * 2.8) * 30),
    sprite: index,
    angle: Math.sin(index) * 5,
    brightness: 0.38 + (index % 3) * 0.08,
    mirror: index % 2 === 0,
  }));
  const middle = Array.from({ length: 11 }, (_, index) => ({
    x: -35 + index * 126 + Math.sin(index * 1.9) * 24,
    y: 195 + Math.sin(index * 2.1) * 54,
    size: Math.round(238 + Math.sin(index * 2.7) * 36),
    sprite: index + 2,
    angle: Math.cos(index * 1.5) * 4,
    brightness: 0.76,
    mirror: index % 3 === 0,
  }));
  const layers = [
    distant,
    middle,
    ...SPIDER_LILY_FLOWERS.map((flower) => [flower]),
  ];
  await mkdir(OUTPUT, { recursive: true });
  const frames = [];
  const layout = {};
  const viewport = { left: 0, top: 0, width, height };
  await Promise.all(
    names.map(async (name, index) => {
      const plants = await Promise.all(layers[index].map(plant));
      const clipped = await Promise.all(
        plants.map((plant) => clip(plant, viewport)),
      );
      const frame = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: index === 0 ? night : TRANSPARENT,
        },
      })
        .composite(clipped.filter(Boolean))
        .png()
        .toBuffer();
      frames[index] = frame;
      // Moving layers keep their full silhouettes beyond the viewport.
      const left =
        index === 0 ? 0 : Math.min(...plants.map((plant) => plant.left)) - 2;
      const top =
        index === 0 ? 0 : Math.min(...plants.map((plant) => plant.top)) - 2;
      const layerWidth =
        index === 0
          ? width
          : Math.max(...plants.map((plant) => plant.left + plant.width)) -
            left +
            2;
      const layerHeight =
        index === 0
          ? height
          : Math.max(...plants.map((plant) => plant.top + plant.height)) -
            top +
            2;
      const complete =
        index === 0
          ? sharp(frame)
          : sharp({
              create: {
                width: layerWidth,
                height: layerHeight,
                channels: 4,
                background: TRANSPARENT,
              },
            }).composite(
              plants.map((plant) => ({
                input: plant.input,
                left: plant.left - left,
                top: plant.top - top,
              })),
            );
      const { data, info } = await (
        index === 0
          ? complete
          : sharp(await complete.png().toBuffer()).trim({
              background: TRANSPARENT,
              threshold: 0,
              margin: 2,
            })
      )
        .png()
        .toBuffer({ resolveWithObject: true });
      layout[name] = {
        left: left - (info.trimOffsetLeft ?? 0),
        top: top - (info.trimOffsetTop ?? 0),
        width: info.width,
        height: info.height,
      };
      await sharp(data)
        .webp({ quality: 94, alphaQuality: 100, effort: 5 })
        .toFile(fileURLToPath(new URL(`${name}.webp`, OUTPUT)));
    }),
  );
  await sharp(frames[0])
    .composite(frames.slice(1).map((input) => ({ input })))
    .webp({ quality: 90, effort: 6 })
    .toFile(fileURLToPath(new URL("still.webp", OUTPUT)));
  await writeFile(
    new URL("layout.json", OUTPUT),
    `${JSON.stringify(Object.fromEntries(names.map((name) => [name, layout[name]])), null, 2)}\n`,
  );
  await writeFile(stamp, fingerprint);
  process.stdout.write(`Painted ${names.length} Spider Lilies layers.\n`);
}
