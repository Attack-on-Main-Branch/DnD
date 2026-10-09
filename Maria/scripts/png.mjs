/**
 * Just enough PNG for the dice assets: read the stock textures, write the
 * generated ones. No dependency — the build has no image library and these are
 * the only images it makes.
 */

import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

export function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** What a row filter predicts a byte from: left, above, above-left. */
function predict(filter, a, b, c) {
  switch (filter) {
    case 1:
      return a;
    case 2:
      return b;
    case 3:
      return (a + b) >> 1;
    case 4:
      return paeth(a, b, c);
    default:
      return 0;
  }
}

/**
 * Non-interlaced only. Palette images come back as palette INDICES, one per
 * pixel, with the palette and transparency beside them; the rest as 8-bit
 * samples.
 */
export function decodePng(png) {
  let offset = SIGNATURE.length;
  const data = [];
  let header = null;
  let palette = null;
  let transparency = null;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === "PLTE") {
      palette = body;
    } else if (type === "tRNS") {
      transparency = body;
    } else if (type === "IDAT") {
      data.push(body);
    }

    offset += 12 + length;
  }

  const { width, height, depth, colorType, interlace } = header;

  if (interlace || (depth !== 8 && !(colorType === 3 && depth <= 8))) {
    throw new Error("Unsupported PNG layout.");
  }

  const channels = CHANNELS[colorType];
  const stride = Math.ceil((width * channels * depth) / 8);
  const step = Math.max(1, (channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(data));
  const rows = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = rows.subarray(y * stride, (y + 1) * stride);
    const above = y ? rows.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= step ? row[x - step] : 0;
      const b = above ? above[x] : 0;
      const c = above && x >= step ? above[x - step] : 0;

      row[x] = (line[x] + predict(filter, a, b, c)) & 255;
    }
  }

  const samples = new Uint8Array(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width * channels; x++) {
      const bit = x * depth;
      const byte = rows[y * stride + (bit >> 3)];
      const shift = 8 - depth - (bit & 7);

      samples[y * width * channels + x] =
        depth === 8 ? byte : (byte >> shift) & ((1 << depth) - 1);
    }
  }

  return { width, height, channels, samples, palette, transparency };
}

function chunk(type, body) {
  const out = Buffer.alloc(12 + body.length);

  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, "ascii");
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);

  return out;
}

/**
 * 8-bit grey, RGB or RGBA. Each row takes whichever filter leaves it smallest,
 * by the usual sum-of-magnitudes guess.
 */
export function encodePng(width, height, channels, samples) {
  const colorType = { 1: 0, 3: 2, 4: 6 }[channels];
  const stride = width * channels;
  const out = Buffer.alloc((stride + 1) * height);
  const candidate = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const row = samples.subarray(y * stride, (y + 1) * stride);
    const above = y ? samples.subarray((y - 1) * stride, y * stride) : null;
    let bestScore = Infinity;

    for (let filter = 0; filter < 5; filter++) {
      let score = 0;

      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? row[x - channels] : 0;
        const b = above ? above[x] : 0;
        const c = above && x >= channels ? above[x - channels] : 0;
        const value = (row[x] - predict(filter, a, b, c)) & 255;

        candidate[x] = value;
        score += value < 128 ? value : 256 - value;
      }

      if (score < bestScore) {
        bestScore = score;
        out[y * (stride + 1)] = filter;
        candidate.copy(out, y * (stride + 1) + 1);
      }
    }
  }

  const header = Buffer.alloc(13);

  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;

  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(out, { level: 6, memLevel: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
