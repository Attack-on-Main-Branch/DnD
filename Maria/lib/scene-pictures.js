import sharp from "sharp";
import { isOwnStorageImage, MAX_SCENE_BYTES } from "sina/rules/scene";

/**
 * The scene painter's pictures, on the server: what goes to Gemini and what
 * comes back. Never imported by a Client Component.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_FETCH_BYTES = 8 * 1024 * 1024;

const MAP_EDGE = 1536;
const REFERENCE_EDGE = 768;
const SCENE_EDGE = 2048;

/** Null for anything outside this project's buckets, or that will not load. */
export async function fetchStorageImage(url) {
  if (!isOwnStorageImage(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return null;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const declared = Number(response.headers.get("content-length"));

    if (declared > MAX_FETCH_BYTES) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());

    return bytes.length > MAX_FETCH_BYTES ? null : bytes;
  } catch {
    return null;
  }
}

function jpeg(buffer, edge) {
  return sharp(buffer)
    .rotate()
    .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#000000" })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
}

/** `natural` is the map's own size, the space token points are fractions of. */
export async function prepareMap(buffer) {
  const meta = await sharp(buffer).metadata();
  const { data, info } = await jpeg(buffer, MAP_EDGE);

  return {
    natural: { width: meta.width, height: meta.height },
    bytes: data,
    width: info.width,
    height: info.height,
  };
}

const BOARD_MARGIN = 96;
const BOARD_FRAME = 6;
const BOARD_PAPER = "#d8d4cc";
const BOARD_INK = "#1c1c1c";

/**
 * The marked-up plan, framed on a square board. Square on purpose: a plan sent
 * full-frame at the output's own 16:9 was taken as the canvas and edited,
 * top-down, instead of being re-imagined at eye level.
 */
export async function layoutSketch(map, svg) {
  const framed = await sharp(map.bytes)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .extend({
      top: BOARD_FRAME,
      bottom: BOARD_FRAME,
      left: BOARD_FRAME,
      right: BOARD_FRAME,
      background: BOARD_INK,
    })
    .png()
    .toBuffer();

  const width = map.width + 2 * BOARD_FRAME;
  const height = map.height + 2 * BOARD_FRAME;
  const side = Math.max(width, height) + 2 * BOARD_MARGIN;

  return sharp({
    create: { width: side, height: side, channels: 3, background: BOARD_PAPER },
  })
    .composite([
      {
        input: framed,
        left: Math.round((side - width) / 2),
        top: Math.round((side - height) / 2),
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function prepareReference(buffer) {
  try {
    const { data } = await jpeg(buffer, REFERENCE_EDGE);

    return data;
  } catch {
    return null;
  }
}

/** Under MAX_SCENE_BYTES, or null if it cannot be got there. */
export async function toSceneWebp(buffer) {
  for (const quality of [82, 68, 55]) {
    const bytes = await sharp(buffer)
      .resize(SCENE_EDGE, SCENE_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();

    if (bytes.length <= MAX_SCENE_BYTES) {
      return bytes;
    }
  }

  return null;
}
