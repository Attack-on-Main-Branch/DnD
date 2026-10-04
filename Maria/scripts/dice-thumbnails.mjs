/**
 * Pictures of a theme's dice, drawn once at build time so the style picker can
 * show every skin without a WebGL context apiece — software rasterised from
 * the same meshes and maps the roller uses, lit by a key, a fill and a studio
 * for metal to reflect.
 *
 * The player's colour is only known in the browser, so each picture is TWO
 * images:
 *
 *   <name>.png       the die as lit, everything the skin paints, with the
 *                    body left out where the player's colour would show
 *   <name>-tint.png  white, its alpha how brightly that body is lit
 *
 * and the page lays the colour under the first, masked by the second:
 * `skin over (colour × tint)` is the die in any colour at all. A skin that
 * paints everything, like wood, has a tint of nothing.
 *
 *   tile  one d20, for the style picker
 *   set   every die in DICE_TYPES side by side, one cell each
 */

import { DICE_TYPES } from "../lib/dice-themes.mjs";
import { decodePng, encodePng } from "./png.mjs";

const TILE = 240;
const CELL = 160;
const SUPERSAMPLE = 2;

/**
 * Each die posed by hand, as turns about x, then y, then z, so a face sits
 * towards the viewer with its neighbours in view and its numeral upright.
 */
const POSES = {
  d4: [-0.3, 0.52, 2.09],
  d6: [0.7, 0.9, 4.71],
  d8: [0.45, 0, 3.14],
  d10: [0.45, 0, 3.14],
  d12: [0.45, 0.6, 1.57],
  d20: [0.45, 0, 4.71],
  d100: [0.45, 0, 3.14],
};
const TILE_POSE = POSES.d20;

const normalise = ([x, y, z]) => {
  const span = Math.hypot(x, y, z) || 1;

  return [x / span, y / span, z / span];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (value, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));

  return t * t * (3 - 2 * t);
}

const VIEW = [0, 0, 1];
const KEY = normalise([-0.45, 0.7, 0.55]);
const FILL = normalise([0.65, -0.15, 0.6]);
const HALF = normalise(KEY.map((value, k) => value + VIEW[k]));

/** A dark room with a softbox where the key hangs, for metal to reflect. */
function studio(reflected, roughness) {
  const spread = 0.12 + 0.5 * roughness;
  const key = smoothstep(
    1 - spread * 1.6,
    1 - spread * 0.4,
    dot(reflected, KEY),
  );
  const fill = smoothstep(
    1 - spread * 1.8,
    1 - spread * 0.5,
    dot(reflected, FILL),
  );
  const sky = 0.38 + 0.3 * clamp(reflected[1] * 0.5 + 0.5);

  return sky + 1.1 * key + 0.5 * fill;
}

function rotate([x, y, z], [ax, ay, az]) {
  let c = Math.cos(ax);
  let s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay);
  s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az);
  s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];

  return [x, y, z];
}

/** A map read between its texels, premultiplied so edges do not fringe. */
function reader({ width, samples }, channels) {
  return (u, v, out) => {
    const x = clamp(u * width - 0.5, 0, width - 1);
    const y = clamp((1 - v) * width - 0.5, 0, width - 1);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(width - 1, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;

    out.fill(0);

    // Unrolled: this runs for every pixel of every die drawn.
    tap(x0, y0, (1 - fx) * (1 - fy), out);
    tap(x1, y0, fx * (1 - fy), out);
    tap(x0, y1, (1 - fx) * fy, out);
    tap(x1, y1, fx * fy, out);

    return out;
  };

  function tap(px, py, weight, out) {
    const at = (py * width + px) * channels;
    const alpha = channels === 4 ? samples[at + 3] / 255 : 1;

    for (let k = 0; k < 3; k++) {
      out[k] += (samples[at + k] / 255) * alpha * weight;
    }

    out[3] += alpha * weight;
  }
}

/**
 * One die drawn into a square of `size` pixels at `offset` across a strip of
 * `width`: premultiplied skin and its alpha into `skin`, the body's light into
 * `tint`. Supersampled, then averaged down by the caller's encoder.
 *
 * A see-through die — `opacity` given, as glass is — has its far faces drawn
 * first, as seen through it, and the near ones over them: what the near glass
 * lets through shows the far side's numerals and its colour again behind.
 */
function drawDie(
  mesh,
  pose,
  { skin, tint, width },
  offset,
  size,
  maps,
  opacity,
) {
  const span = size * SUPERSAMPLE;
  const stride = width * SUPERSAMPLE;
  const behind = opacity !== undefined && {
    skin: new Float32Array(span * span * 4),
    tint: new Float32Array(span * span),
  };
  const colourAt = reader(maps.colour, 4);
  const surfaceAt = reader(maps.surface, 3);
  const texel = new Float32Array(4);
  const finish = new Float32Array(4);

  const points = [];
  let radius = 0;

  for (let index = 0; index < mesh.positions.length; index += 3) {
    const point = rotate(mesh.positions.slice(index, index + 3), pose);

    points.push(point);
    radius = Math.max(radius, Math.hypot(...point));
  }

  const scale = (span * 0.46) / radius;
  const centre = span / 2;

  for (const far of behind ? [true, false] : [false]) {
    const depth = new Float32Array(span * span).fill(-Infinity);

    for (let at = 0; at < mesh.indices.length; at += 3) {
      const ids = mesh.indices.slice(at, at + 3);
      const [a, b, c] = ids.map((id) => points[id]);
      const facingOut = normalise([
        (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
        (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
      ]);

      if (facingOut[2] <= 0 !== far) {
        continue;
      }

      // A far face is lit as it is seen: from inside, towards the viewer.
      const normal = far ? facingOut.map((value) => -value) : facingOut;

      const screen = [a, b, c].map(([x, y, z]) => [
        centre + x * scale,
        centre - y * scale,
        z,
      ]);
      const uvs = ids.map((id) => mesh.uvs.slice(id * 2, id * 2 + 2));
      const area =
        (screen[1][0] - screen[0][0]) * (screen[2][1] - screen[0][1]) -
        (screen[2][0] - screen[0][0]) * (screen[1][1] - screen[0][1]);

      if (!area) {
        continue;
      }

      /* ---- The light this face catches, the same across it. ---- */

      const diffuse =
        0.44 +
        0.62 * Math.max(0, dot(normal, KEY)) +
        0.22 * Math.max(0, dot(normal, FILL));
      const facing = Math.max(0, dot(normal, HALF));
      const reflected = normal.map(
        (value, k) => 2 * normal[2] * value - VIEW[k],
      );

      const left = Math.max(
        0,
        Math.floor(Math.min(...screen.map((p) => p[0]))),
      );
      const right = Math.min(
        span - 1,
        Math.ceil(Math.max(...screen.map((p) => p[0]))),
      );
      const top = Math.max(0, Math.floor(Math.min(...screen.map((p) => p[1]))));
      const bottom = Math.min(
        span - 1,
        Math.ceil(Math.max(...screen.map((p) => p[1]))),
      );

      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const w1 =
            ((px - screen[0][0]) * (screen[2][1] - screen[0][1]) -
              (screen[2][0] - screen[0][0]) * (py - screen[0][1])) /
            area;
          const w2 =
            ((screen[1][0] - screen[0][0]) * (py - screen[0][1]) -
              (px - screen[0][0]) * (screen[1][1] - screen[0][1])) /
            area;
          const w0 = 1 - w1 - w2;

          if (w0 < 0 || w1 < 0 || w2 < 0) {
            continue;
          }

          const z = screen[0][2] * w0 + screen[1][2] * w1 + screen[2][2] * w2;
          const local = y * span + x;

          if (z <= depth[local]) {
            continue;
          }

          depth[local] = z;

          const u = uvs[0][0] * w0 + uvs[1][0] * w1 + uvs[2][0] * w2;
          const v = uvs[0][1] * w0 + uvs[1][1] * w1 + uvs[2][1] * w2;
          const [r, g, bl, alpha] = colourAt(u, v, texel);
          const [occlusion, roughness, metalness] = surfaceAt(u, v, finish);

          /* ---- Metal reflects the room in its own colour; everything else
           is lit, with a white highlight that the body shares. ---- */

          const lit =
            (metalness * (0.15 + studio(reflected, roughness)) +
              (1 - metalness) * diffuse) *
            occlusion;
          const shine =
            (1 - metalness) *
            0.55 *
            (1 - roughness) ** 2 *
            facing ** (6 + 90 * (1 - roughness));
          const highlight = clamp(shine);

          const painted = [
            clamp(r * lit, 0, alpha),
            clamp(g * lit, 0, alpha),
            clamp(bl * lit, 0, alpha),
            alpha,
          ];

          if (far) {
            behind.skin.set(painted, local * 4);
            behind.tint[local] =
              (1 - alpha) * opacity * clamp(diffuse * occlusion);
            continue;
          }

          const out = (y * stride + offset * SUPERSAMPLE + x) * 4;
          // How much of the far side the near glass lets through.
          const through = behind ? (1 - alpha) * (1 - opacity) : 0;

          for (let k = 0; k < 4; k++) {
            skin[out + k] =
              highlight +
              (1 - highlight) *
                (painted[k] +
                  through * (behind ? behind.skin[local * 4 + k] : 0));
          }

          tint[out / 4] = behind
            ? opacity * clamp(diffuse * occlusion) +
              (1 - opacity) * behind.tint[local]
            : clamp(diffuse * occlusion);
        }
      }
    }
  }
}

/** The supersampled strip averaged down to its pixels, as the two images. */
function encode({ skin, tint, width, height }) {
  const pixels = width * height;
  const picture = new Uint8Array(pixels * 4);
  const mask = new Uint8Array(pixels * 4);
  const stride = width * SUPERSAMPLE;
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sum = [0, 0, 0, 0, 0];

      for (let dy = 0; dy < SUPERSAMPLE; dy++) {
        for (let dx = 0; dx < SUPERSAMPLE; dx++) {
          const at = (y * SUPERSAMPLE + dy) * stride + x * SUPERSAMPLE + dx;

          for (let k = 0; k < 4; k++) {
            sum[k] += skin[at * 4 + k];
          }

          sum[4] += tint[at];
        }
      }

      const alpha = sum[3] / samples;
      const at = (y * width + x) * 4;

      for (let k = 0; k < 3; k++) {
        picture[at + k] =
          alpha > 0 ? Math.round(clamp(sum[k] / samples / alpha) * 255) : 0;
      }

      picture[at + 3] = Math.round(clamp(alpha) * 255);
      mask.set([255, 255, 255, Math.round(clamp(sum[4] / samples) * 255)], at);
    }
  }

  return {
    picture: encodePng(width, height, 4, picture),
    tint: encodePng(width, height, 4, mask),
  };
}

function canvas(width, height) {
  const pixels = width * SUPERSAMPLE * height * SUPERSAMPLE;

  return {
    width,
    height,
    skin: new Float32Array(pixels * 4),
    tint: new Float32Array(pixels),
  };
}

/**
 * Both pictures of one theme, from its scene and its colour and surface maps
 * (PNG), and its `opacity` if it is see-through. Returns `{ tile, set }`, each `{ picture, tint }` PNG buffers.
 */
export function drawThumbnails(scene, colourPng, surfacePng, opacity) {
  const maps = { colour: decodePng(colourPng), surface: decodePng(surfacePng) };
  const mesh = (name) => scene.meshes.find((one) => one.name === name);

  const tile = canvas(TILE, TILE);

  drawDie(mesh("d20"), TILE_POSE, tile, 0, TILE, maps, opacity);

  const set = canvas(CELL * DICE_TYPES.length, CELL);

  DICE_TYPES.forEach((die, index) => {
    drawDie(mesh(die), POSES[die], set, index * CELL, CELL, maps, opacity);
  });

  return { tile: encode(tile), set: encode(set) };
}
