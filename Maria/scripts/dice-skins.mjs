/**
 * Dice SKINS, painted from the stock meshes' own UV layout.
 *
 * Every die is a handful of flat faces ringed by a thin bevel, all sharing one
 * 1024² atlas with the numerals already placed inside each face. A skin keeps
 * the meshes, so the physics — and the shared roll — never change; it only
 * repaints what the atlas says about each pixel. A RIMMED skin paints:
 *
 *   frame     a metal band along the inside of every face's edge, and the
 *             bevel itself, raised above the enamel
 *   enamel    the face's middle, left TRANSPARENT so the player's dice colour
 *             shows through (`material.type: "color"`), darkened where the
 *             frame overhangs it and flecked with glitter
 *   numerals  the stock glyphs, embossed in the same metal
 *
 * Glitter is three things at once: a pale fleck in the colour map, a smooth
 * metallic spot in the surface map, and a random tilt in the normal map, so
 * each fleck catches the light at its own moment as the die tumbles.
 *
 * The EPOXY skin keeps the glitter and paints the rest differently — see
 * `paintEpoxy`. The PAPER skin turns the whole arrangement round: the paper is
 * the opaque part and the player's colour is the ink — see `paintPaper`. The
 * CRACKED skin is opaque black too, with the colour showing only through its
 * cracks — see `paintCracked` — and the INLAID skins are worn metal with the
 * colour in a channel round a raised plate on every face — see `carveInlay`.
 * The CORNERED skins are metal too, a raised rim round every face and a
 * bracket in each of its corners, with the colour as swirled enamel between
 * them — see `carveCornered`.
 * The ASIIMOV skin paints by the die's corners rather than its faces: white,
 * with each corner capped in black or in the player's colour — see
 * `paintAsiimov`. The WOOD skin is the one the player's colour never reaches:
 * opaque hardwood throughout — see `paintWood`. The COMPANION skin builds
 * every die like a certain cube — white corners and bars over slate, with
 * the colour in channels between them — see `paintCompanion`. The CRYSTAL
 * skin is polished stone in the colour, its corners chipped into facets that
 * live in the normal map — see `paintCrystal`. FADE swirls the colour into a
 * darker shade of itself, GALAXY sets a spiral galaxy in it, seen through each
 * face, ORNATE is black with raised scrollwork in it, and GLASS is the colour
 * as see-through glass — see `paintFade`, `paintGalaxy`, `paintOrnate` and
 * `paintGlass`. CASE HARDENED is heat-tinted steel, mostly blue, keeping its
 * own colours — see `paintCaseHardened` — and LABRADORITE is grey stone,
 * keeping its own too, washed with a soft flash of blue, teal and gold that
 * brightens at an angle of its own — see `paintLabradorite`.
 *
 * What each skin is made of — its recipe — is in dice-recipes.mjs.
 *
 * Distances are measured on the 3D face, not in the atlas, so a frame is the
 * same width on every die whatever its share of the texture. Deterministic:
 * the same recipe always paints the same bytes.
 */

import { rgbOf } from "../lib/dice-themes.mjs";
import { decodePng, encodePng } from "./png.mjs";

const SIZE = 1024;

/** Flat faces per die; every smaller triangle is part of a bevel. */
const FACE_COUNTS = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 10,
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.sqrt(dot(a, a));
const normalise = (a) => {
  const span = length(a) || 1;

  return a.map((value) => value / span);
};
const clamp = (value, low = 0, high = 1) =>
  Math.min(high, Math.max(low, value));

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));

  return t * t * (3 - 2 * t);
}

/** `from` taken `t` of the way to `to`, channel by channel. */
const mix = (from, to, t) =>
  from.map((value, k) => value + (to[k] - value) * t);

/** Distance from (x, y, z) to the nearest outline edge. Allocation-free: it runs per pixel. */
function edgeDistance(edges, x, y, z) {
  let nearest = Infinity;

  for (const { a, ab, span } of edges) {
    const t = clamp(
      ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / span,
    );
    const dx = x - a[0] - ab[0] * t;
    const dy = y - a[1] - ab[1] * t;
    const dz = z - a[2] - ab[2] * t;

    nearest = Math.min(nearest, dx * dx + dy * dy + dz * dz);
  }

  return Math.sqrt(nearest);
}

/** Not `rgbOf` itself: `.map(hex)` would hand it an index as a level. */
const hex = (colour) => rgbOf(colour);

/** Integer hash to [0, 1): stable glitter without a seeded generator. */
function hash(x, y, salt) {
  let h =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(salt, 1442695041);

  h = Math.imul(h ^ (h >>> 13), 1274126177);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth noise in [0, 1) on a lattice `cell` pixels apart. */
function valueNoise(x, y, cell, salt) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = smoothstep(0, 1, x / cell - gx);
  const fy = smoothstep(0, 1, y / cell - gy);
  const top = hash(gx, gy, salt) * (1 - fx) + hash(gx + 1, gy, salt) * fx;
  const bottom =
    hash(gx, gy + 1, salt) * (1 - fx) + hash(gx + 1, gy + 1, salt) * fx;

  return top * (1 - fy) + bottom * fy;
}

/** `hash`, on a 3D lattice. */
function hash3(x, y, z, salt) {
  let h =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(z, 2246822519) +
    Math.imul(salt, 1442695041);

  h = Math.imul(h ^ (h >>> 13), 1274126177);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** `valueNoise` through the die rather than across the atlas, on a unit lattice. */
function valueNoise3(x, y, z, salt) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const gz = Math.floor(z);
  const fx = smoothstep(0, 1, x - gx);
  const fy = smoothstep(0, 1, y - gy);
  const fz = smoothstep(0, 1, z - gz);

  const lerp = (a, b, t) => a + (b - a) * t;
  const corner = (dx, dy, dz) => hash3(gx + dx, gy + dy, gz + dz, salt);
  const plane = (dz) =>
    lerp(
      lerp(corner(0, 0, dz), corner(1, 0, dz), fx),
      lerp(corner(0, 1, dz), corner(1, 1, dz), fx),
      fy,
    );

  return lerp(plane(0), plane(1), fz);
}

/**
 * Cellular noise on a unit lattice: the nearest of one jittered point per cell,
 * the gap to the second nearest — small along the line two cells meet on — and
 * which cell won, so each can be given a character of its own.
 *
 * `wall` is the true distance to the edge of the nearest point's cell — the
 * nearest of its walls with every neighbour, where `gap` only falls towards
 * one of them and swells where three cells meet — and `seam` is a number
 * belonging to that wall alone, the same from either side, so a whole wall can
 * be kept or dropped.
 */
const CANDIDATES = new Float64Array(27 * 6);

function cellAt(x, y, z) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  const gz = Math.floor(z);
  let first = Infinity;
  let second = Infinity;
  let nearest = 0;
  let count = 0;

  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ix = gx + dx;
        const iy = gy + dy;
        const iz = gz + dz;
        const ox = ix + hash3(ix, iy, iz, 31) - x;
        const oy = iy + hash3(ix, iy, iz, 37) - y;
        const oz = iz + hash3(ix, iy, iz, 41) - z;
        const d = ox * ox + oy * oy + oz * oz;

        CANDIDATES.set([ix, iy, iz, ox, oy, oz], count * 6);

        if (d < first) {
          second = first;
          first = d;
          nearest = count;
        } else if (d < second) {
          second = d;
        }

        count++;
      }
    }
  }

  const [ix, iy, iz, ox, oy, oz] = CANDIDATES.subarray(
    nearest * 6,
    nearest * 6 + 6,
  );
  let wall = Infinity;
  let neighbour = nearest;
  let across = [0, 0, 1];

  for (let index = 0; index < count; index++) {
    if (index === nearest) {
      continue;
    }

    const at = index * 6;
    const ex = CANDIDATES[at + 3] - ox;
    const ey = CANDIDATES[at + 4] - oy;
    const ez = CANDIDATES[at + 5] - oz;
    const span = Math.hypot(ex, ey, ez);
    const own =
      CANDIDATES[at + 3] ** 2 +
      CANDIDATES[at + 4] ** 2 +
      CANDIDATES[at + 5] ** 2;
    const distance = (own - first) / (2 * span);

    if (distance < wall) {
      wall = distance;
      neighbour = index;
      across = [ex / span, ey / span, ez / span];
    }
  }

  const mine = hash3(ix, iy, iz, 151);
  const theirs = hash3(
    CANDIDATES[neighbour * 6],
    CANDIDATES[neighbour * 6 + 1],
    CANDIDATES[neighbour * 6 + 2],
    151,
  );

  return {
    gap: Math.sqrt(second) - Math.sqrt(first),
    wall,
    // The wall's own normal, for telling how steeply it meets a surface.
    across,
    trait: (salt) => hash3(ix, iy, iz, salt),
    seam: (salt) =>
      hash(
        Math.floor(Math.min(mine, theirs) * 1e6),
        Math.floor(Math.max(mine, theirs) * 1e6),
        salt,
      ),
  };
}

/** Edges used by one triangle of the face only: its outline. */
function outline(triangles) {
  const key = (point) => point.map((value) => value.toFixed(5)).join(",");
  const edges = new Map();

  for (const { points } of triangles) {
    for (let corner = 0; corner < 3; corner++) {
      const a = points[corner];
      const b = points[(corner + 1) % 3];
      const id = [key(a), key(b)].sort().join("|");
      const seen = edges.get(id);

      if (seen) {
        seen.count++;
      } else {
        edges.set(id, { a, b, count: 1 });
      }
    }
  }

  return [...edges.values()]
    .filter((edge) => edge.count === 1)
    .map(({ a, b }) => {
      const ab = sub(b, a);

      return { a, b, ab, span: dot(ab, ab) };
    });
}

/** The flat faces of every die, each with its triangles and outline. */
function readFaces(scene) {
  const faces = [];

  for (const mesh of scene.meshes) {
    const count = FACE_COUNTS[mesh.name];

    if (!count) {
      continue;
    }

    const point = (index) => mesh.positions.slice(index * 3, index * 3 + 3);
    const uv = (index) => mesh.uvs.slice(index * 2, index * 2 + 2);
    const clusters = [];

    for (let at = 0; at < mesh.indices.length; at += 3) {
      const ids = mesh.indices.slice(at, at + 3);
      const points = ids.map(point);
      const normal = cross(
        sub(points[1], points[0]),
        sub(points[2], points[0]),
      );
      const area = length(normal) / 2;

      if (area === 0) {
        continue;
      }

      const unit = normal.map((value) => value / (2 * area));
      let cluster = clusters.find((one) => dot(one.normal, unit) > 0.999);

      if (!cluster) {
        cluster = { normal: unit, area: 0, triangles: [] };
        clusters.push(cluster);
      }

      cluster.area += area;
      cluster.triangles.push({ points, uvs: ids.map(uv), area });
    }

    clusters.sort((a, b) => b.area - a.area);

    for (const face of clusters.slice(0, count)) {
      const edges = outline(face.triangles);
      const perimeter = edges.reduce(
        (sum, { a, b }) => sum + length(sub(b, a)),
        0,
      );

      faces.push({
        die: mesh.name,
        normal: face.normal,
        triangles: face.triangles,
        edges,
        inradius: (2 * face.area) / perimeter,
        centre: face.triangles
          .reduce(
            (sum, { points, area }) =>
              points.reduce(
                (total, point) =>
                  total.map((value, k) => value + (point[k] * area) / 3),
                sum,
              ),
            [0, 0, 0],
          )
          .map((value) => value / face.area),
      });
    }
  }

  return faces;
}

/**
 * Which face owns each pixel, how far that pixel is from the face's edge on
 * the die itself, how many pixels make one unit there, and where on the die it
 * is. Pixels no face covers are the bevels and the gutters between islands —
 * metal either way.
 */
function rasterize(faces) {
  const owner = new Int16Array(SIZE * SIZE).fill(-1);
  const distance = new Float32Array(SIZE * SIZE);
  const density = new Float32Array(SIZE * SIZE);
  const position = new Float32Array(SIZE * SIZE * 3);

  faces.forEach((face, index) => {
    for (const { points, uvs, area } of face.triangles) {
      // Babylon loads textures flipped, so v runs up the image.
      const [p0, p1, p2] = uvs.map(([u, v]) => [
        u * SIZE - 0.5,
        (1 - v) * SIZE - 0.5,
      ]);
      const span =
        (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]);

      if (span === 0) {
        continue;
      }

      const perUnit = Math.sqrt(Math.abs(span) / 2 / area);
      const left = Math.max(0, Math.floor(Math.min(p0[0], p1[0], p2[0])));
      const right = Math.min(
        SIZE - 1,
        Math.ceil(Math.max(p0[0], p1[0], p2[0])),
      );
      const top = Math.max(0, Math.floor(Math.min(p0[1], p1[1], p2[1])));
      const bottom = Math.min(
        SIZE - 1,
        Math.ceil(Math.max(p0[1], p1[1], p2[1])),
      );

      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const w1 =
            ((x - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (y - p0[1])) /
            span;
          const w2 =
            ((p1[0] - p0[0]) * (y - p0[1]) - (x - p0[0]) * (p1[1] - p0[1])) /
            span;
          const w0 = 1 - w1 - w2;

          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) {
            continue;
          }

          const pixel = y * SIZE + x;
          const px = points[0][0] * w0 + points[1][0] * w1 + points[2][0] * w2;
          const py = points[0][1] * w0 + points[1][1] * w1 + points[2][1] * w2;
          const pz = points[0][2] * w0 + points[1][2] * w1 + points[2][2] * w2;

          owner[pixel] = index;
          distance[pixel] = edgeDistance(face.edges, px, py, pz);
          density[pixel] = perUnit;
          position[pixel * 3] = px;
          position[pixel * 3 + 1] = py;
          position[pixel * 3 + 2] = pz;
        }
      }
    }
  });

  return { owner, distance, density, position };
}

/** The stock numerals as coverage in [0, 1], off the palette's transparency. */
function readGlyphs(png) {
  const { width, height, samples, transparency } = decodePng(png);

  if (width !== SIZE || height !== SIZE) {
    throw new Error(
      `Expected a ${SIZE}² numeral atlas, found ${width}×${height}.`,
    );
  }

  const alpha = (index) =>
    index < transparency.length ? transparency[index] : 255;

  return Float32Array.from(samples, (index) => alpha(index) / 255);
}

/** Each pixel's square neighbourhood, averaged — or its maximum, to thicken. */
function neighbourhood(source, radius, widest = false) {
  const span = radius * 2 + 1;

  const pass = (from, across) => {
    const to = new Float32Array(from.length);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let total = 0;

        for (let k = -radius; k <= radius; k++) {
          const sx = across ? Math.min(SIZE - 1, Math.max(0, x + k)) : x;
          const sy = across ? y : Math.min(SIZE - 1, Math.max(0, y + k));
          const value = from[sy * SIZE + sx];

          total = widest ? Math.max(total, value) : total + value;
        }

        to[y * SIZE + x] = widest ? total : total / span;
      }
    }

    return to;
  };

  return pass(pass(source, true), false);
}

/**
 * A sanity check against a future dice-box shipping a different layout: the
 * numerals must sit on the faces found, or every skin would be painted beside
 * its dice.
 */
function assertAligned(glyphs, owner) {
  let inked = 0;
  let placed = 0;

  for (let pixel = 0; pixel < glyphs.length; pixel++) {
    if (glyphs[pixel] > 0.5) {
      inked++;
      placed += owner[pixel] >= 0 ? 1 : 0;
    }
  }

  if (placed / inked < 0.95) {
    throw new Error(
      `Only ${Math.round((placed / inked) * 100)}% of the numerals land on a face: the dice atlas has changed.`,
    );
  }
}

/**
 * A bar under every 6 and 9, so the two can be told apart whichever way up a
 * die lies. Which face carries which number comes off the colliders — see
 * `faceOfValue` — and which way is down off the glyph itself: a 6's loop is
 * at its foot and a 9's at its head. Close enough under the numeral to join
 * it as one mark (see `numeralMarks`), so a skin that shrinks its numerals to
 * fit takes the bar with them.
 */
function underlineSixesAndNines(ink, owner, faces, scene) {
  const marked = Float32Array.from(ink);
  const label = new Int32Array(SIZE * SIZE).fill(-1);
  const queue = new Int32Array(SIZE * SIZE);

  for (const die of ["d6", "d8", "d10", "d12", "d20"]) {
    for (const value of [6, 9]) {
      if (!Object.values(scene.colliderFaceMap[die]).includes(value)) {
        continue;
      }

      const face = faceOfValue(scene, faces, die, value);
      const pixels = [];

      for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
        if (owner[pixel] === face && ink[pixel] > 0.5) {
          pixels.push(pixel);
        }
      }

      const xs = pixels.map((pixel) => pixel % SIZE);
      const ys = pixels.map((pixel) => Math.floor(pixel / SIZE));
      const [left, right] = [Math.min(...xs) - 1, Math.max(...xs) + 1];
      const [top, bottom] = [Math.min(...ys) - 1, Math.max(...ys) + 1];
      const within = (pixel) => {
        const x = pixel % SIZE;
        const y = Math.floor(pixel / SIZE);

        return x >= left && x <= right && y >= top && y <= bottom;
      };
      const outside = new Set(
        floodFrom(
          top * SIZE + left,
          (next) => within(next) && ink[next] <= 0.5,
          label.fill(-1),
          0,
          queue,
        ),
      );
      const hole = [];

      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const pixel = y * SIZE + x;

          if (ink[pixel] <= 0.5 && !outside.has(pixel)) {
            hole.push([x, y]);
          }
        }
      }

      if (hole.length === 0) {
        throw new Error(
          `Expected a loop in the ${die}'s ${value}: the dice atlas has changed.`,
        );
      }

      const mean = (points) =>
        points
          .reduce((sum, [x, y]) => [sum[0] + x, sum[1] + y], [0, 0])
          .map((total) => total / points.length);
      const [cx, cy] = mean(xs.map((x, k) => [x, ys[k]]));
      const [hx, hy] = mean(hole);
      const sign = value === 6 ? 1 : -1;
      const reach = Math.hypot(hx - cx, hy - cy) || 1;
      const down = [((hx - cx) / reach) * sign, ((hy - cy) / reach) * sign];
      const across = [-down[1], down[0]];

      const along = xs.map(
        (x, k) => (x - cx) * down[0] + (ys[k] - cy) * down[1],
      );
      const side = xs.map(
        (x, k) => (x - cx) * across[0] + (ys[k] - cy) * across[1],
      );
      const tall = Math.max(...along) - Math.min(...along);
      const stroke = 0.12 * tall;
      const half = ((Math.max(...side) - Math.min(...side)) / 2) * 0.8;
      const middle = (Math.max(...side) + Math.min(...side)) / 2;
      const drop = Math.max(...along) + 0.7 * stroke + stroke / 2;
      const bx = cx + down[0] * drop + across[0] * middle;
      const by = cy + down[1] * drop + across[1] * middle;
      const room = Math.ceil(half + stroke);

      for (let y = Math.floor(by) - room; y <= Math.ceil(by) + room; y++) {
        for (let x = Math.floor(bx) - room; x <= Math.ceil(bx) + room; x++) {
          const pixel = y * SIZE + x;

          if (owner[pixel] !== face) {
            continue;
          }

          const off = segmentDistance(
            x,
            y,
            bx - across[0] * half,
            by - across[1] * half,
            bx + across[0] * half,
            by + across[1] * half,
          );

          marked[pixel] = Math.max(
            marked[pixel],
            clamp(stroke / 2 + 0.5 - off),
          );
        }
      }
    }
  }

  return marked;
}

/** The work every skin shares: which face owns each pixel, and the numerals. */
function prepare({ meshes, numerals }) {
  const faces = readFaces(meshes);
  const raster = rasterize(faces);
  const ink = underlineSixesAndNines(
    readGlyphs(numerals),
    raster.owner,
    faces,
    meshes,
  );

  assertAligned(ink, raster.owner);

  const d20 = faces
    .filter((face) => face.die === "d20")
    .map((face) => face.inradius);

  // Along each face's longest edge: a direction in its plane to brush along.
  const tangents = faces.map(({ edges }) => {
    const { ab, span } = edges.reduce((long, edge) =>
      edge.span > long.span ? edge : long,
    );

    return ab.map((value) => value / Math.sqrt(span));
  });

  return {
    ...raster,
    ink,
    faces,
    normals: faces.map((face) => face.normal),
    tangents,
    dice: faces.map((face) => face.die),
    reference: d20.sort((a, b) => a - b)[d20.length >> 1],
  };
}

/** Flecks in pairs of pixels, so a fleck survives the first mip level. */
function fleckAt(x, y, density) {
  return hash(x >> 1, y >> 1, 11) < density;
}

/**
 * The relief one set of proportions gives: where the metal is, how high it
 * stands, and the normal map that says so. Shared by every skin cut the same
 * way, whatever metal it is cast in.
 */
function sculpt(recipe, { ink, reference, owner, distance, density }) {
  const glyphs = recipe.weight ? neighbourhood(ink, recipe.weight, true) : ink;

  const frame = recipe.frame * reference;
  const bevel = recipe.bevel * frame;
  const depth = recipe.depth * frame;

  // Softened so the emboss rounds over instead of stepping, and a wider pass
  // for the dark that collects round each numeral's foot.
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 3);

  const height = new Float32Array(SIZE * SIZE);
  const metal = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      height[pixel] = depth;
      metal[pixel] = 1;
      continue;
    }

    const d = distance[pixel];
    const half = 0.75 / density[pixel];

    height[pixel] = Math.max(
      depth * (1 - smoothstep(frame - bevel, frame, d)),
      depth * 0.8 * relief[pixel],
    );
    metal[pixel] = Math.max(
      1 - smoothstep(frame - half, frame + half, d),
      glyphs[pixel],
    );
  }

  // Float64, unlike the other skins' tilts: these flecks were always summed in
  // double precision, and a float32 would shift a few normals by a byte.
  const tiltX = new Float64Array(SIZE * SIZE);
  const tiltY = new Float64Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (
        owner[pixel] >= 0 &&
        metal[pixel] < 0.5 &&
        fleckAt(x, y, recipe.fleck.density)
      ) {
        tiltX[pixel] = (hash(x >> 1, y >> 1, 19) - 0.5) * 1.1;
        tiltY[pixel] = (hash(x >> 1, y >> 1, 23) - 0.5) * 1.1;
      }
    }
  }

  return {
    frame,
    bevel,
    glyphs,
    halo,
    metal,
    normal: surfaceNormals({ height, tiltX, tiltY }, { owner, density }),
  };
}

/**
 * The map every theme carries beside its colour, in the glTF layout the
 * vendored dice-box reads (see Maria/vendor/dice-box): red occlusion, green
 * roughness, blue metalness, each 0..1.
 */
function writeSurface(surface, pixel, { occlusion, roughness, metalness }) {
  surface[pixel * 3] = Math.round(clamp(occlusion) * 255);
  surface[pixel * 3 + 1] = Math.round(clamp(roughness) * 255);
  surface[pixel * 3 + 2] = Math.round(clamp(metalness) * 255);
}

/** Painted colour layers, premultiplied over the body colour. */
function layers() {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  return {
    over([cr, cg, cb], alpha) {
      r = cr * alpha + r * (1 - alpha);
      g = cg * alpha + g * (1 - alpha);
      b = cb * alpha + b * (1 - alpha);
      a = alpha + a * (1 - alpha);
    },
    write(colour, pixel) {
      colour.set(
        a > 0
          ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)]
          : [0, 0, 0],
        pixel * 4,
      );
      colour[pixel * 4 + 3] = Math.round(255 * a);
    },
  };
}

/**
 * The numerals every die wears — the stock glyphs, with a 6 and a 9 told apart
 * — for the house dice, which are nothing else: see `paintHouseSurface` and
 * `paintHouseColour`. Exported for scripts/dice-assets.mjs.
 */
export function numeralInk(sources) {
  return prepare(sources).ink;
}

/**
 * The house dice's surface: nothing but the numerals over a plain body, since
 * those dice are the stock dice in two colours of paint.
 */
export function paintHouseSurface(ink, { body, numerals: paint }) {
  const surface = new Uint8Array(SIZE * SIZE * 3);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    writeSurface(surface, pixel, {
      occlusion: 1,
      roughness: body + (paint - body) * ink[pixel],
      metalness: ink[pixel],
    });
  }

  return encodePng(SIZE, SIZE, 3, surface);
}

/**
 * The house dice's numerals as a colour map laid out like a skin's — the
 * glyphs in `colour`, transparent everywhere else, where the body colour
 * shows.
 */
export function paintHouseColour(ink, [r, g, b]) {
  const colour = new Uint8Array(SIZE * SIZE * 4);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    colour.set([r, g, b, Math.round(255 * ink[pixel])], pixel * 4);
  }

  return encodePng(SIZE, SIZE, 4, colour);
}

/** One recipe's colour and surface maps, over its sculpted relief. */
function paint(recipe, { owner, distance }, shape) {
  const { frame, bevel, glyphs, halo, metal } = shape;
  const { finish } = recipe;
  const reach = recipe.shadow * frame;

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);

  const metalColour = hex(recipe.metal);
  const fleckColour = hex(recipe.fleck.color);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      const face = owner[pixel];
      const m = metal[pixel];

      /* ---- Enamel: a transparent layer over the body colour. ---- */

      const d = face < 0 ? 0 : distance[pixel];
      const overhang = face < 0 ? 0 : 1 - smoothstep(frame, frame + reach, d);
      const cloud = valueNoise(x, y, 24, 7);
      const foot = clamp(halo[pixel] - glyphs[pixel]) * 0.9;

      const fleck = face >= 0 && fleckAt(x, y, recipe.fleck.density);
      const fleckAlpha = fleck ? 0.35 + 0.5 * hash(x >> 1, y >> 1, 13) : 0;

      const shade = clamp(0.55 * overhang + 0.14 * cloud + foot);
      const alpha = fleckAlpha + shade * (1 - fleckAlpha);
      const enamel =
        alpha === 0
          ? [0, 0, 0]
          : fleckColour.map((c) => (c * fleckAlpha) / alpha);

      /* ---- Metal: a soft sheen across the band. ---- */

      const across = face < 0 ? 0.5 : clamp(d / Math.max(frame - bevel, 1e-6));
      const sheen = 0.93 + 0.1 * Math.sin(Math.PI * across);

      for (let channel = 0; channel < 3; channel++) {
        const metalValue = clamp(metalColour[channel] * sheen, 0, 255);

        colour[pixel * 4 + channel] = Math.round(
          metalValue * m + enamel[channel] * (1 - m),
        );
      }

      colour[pixel * 4 + 3] = Math.round(255 * (m + alpha * (1 - m)));

      /* ---- Surface: polished metal, glossy enamel, foil flecks that
         reflect the room in whatever colour the enamel is. ---- */

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.5 * overhang * (1 - m) - 0.6 * foot,
        roughness:
          (finish.metal + 0.1 * cloud) * m +
          (fleck ? finish.fleck : finish.enamel) * (1 - m),
        metalness: m + (fleck ? 1 - m : 0),
      });
    }
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
  };
}

/**
 * A die cast in clear resin round a sheet of crumpled foil, in the player's
 * colour.
 *
 * Nothing here is transparent: dice-box offers a lit surface and three maps,
 * no depth and no refraction. The depth is painted instead, as layers over the
 * body colour, bottom to top:
 *
 *   resin     the colour taken down towards black, most at each face's edge,
 *             where a real die is thickest — and least where foil sits in
 *             front of it
 *   foil      shards from cellular noise THROUGH THE DIE, not across the
 *             atlas, so they are one size on every die and run on round its
 *             edges. Each shard is lighter or darker than the colour, sunk
 *             nearer or further, with a dark crease where two meet, and tilted
 *             in the normal map so it flashes on its own as the die tumbles
 *   glitter   the rimmed skins' flecks, in holographic colours
 *   numerals  engraved, gold, on a dark foot that keeps them legible on
 *             whatever colour the player picked
 *
 * The bevels are resin seen edge-on: the darkest part of the die.
 */
function paintEpoxy(recipe, base) {
  const { ink, reference, owner, distance, position } = base;
  const { resin, foil, fleck, finish } = recipe;

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 3);

  const shard = foil.shard * reference;
  const clump = foil.clump * reference;
  const edge = resin.edge * reference;
  const engrave = recipe.engrave * reference;

  const gold = hex(recipe.metal);
  const holo = fleck.colors.map(hex);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      // What the texture adds over the body colour, and how much of it hides.
      const paint = layers();
      const over = paint.over;

      if (owner[pixel] < 0) {
        over([0, 0, 0], resin.depth + resin.rim);
        paint.write(colour, pixel);
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.resin,
          metalness: 0,
        });
        continue;
      }

      const px = position[pixel * 3];
      const py = position[pixel * 3 + 1];
      const pz = position[pixel * 3 + 2];

      /* ---- Foil: which shard, and what kind of shard it is. ---- */

      const cell = cellAt(px / shard, py / shard, pz / shard);
      const gathered = smoothstep(
        0.32,
        0.52,
        valueNoise3(px / clump, py / clump, pz / clump, 43),
      );
      const present =
        gathered *
        (cell.trait(47) < foil.coverage ? 1 : 0) *
        (1 - glyphs[pixel]);
      const near = present * (0.45 + 0.55 * cell.trait(53));
      const facet = cell.trait(59);
      const crease = 1 - smoothstep(0, foil.crease, cell.gap);

      /* ---- Colour, bottom to top. ---- */

      // A bright shard clears the resin in front of it altogether: foil is lit
      // by what it reflects, so its colour is the body's own at full strength,
      // and only a little white on top — more turns red into pink.
      const rim = 1 - smoothstep(0, edge, distance[pixel]);
      const clearing = near * (0.55 + 0.45 * facet);
      over([0, 0, 0], (resin.depth + resin.rim * rim) * (1 - clearing));

      if (facet > 0.5) {
        over([255, 255, 255], near * (facet - 0.5) * 2 * foil.light);
      } else {
        over([0, 0, 0], near * (0.5 - facet) * 2 * foil.dark);
      }

      over([0, 0, 0], crease * near * 0.45);

      const fleckHere = fleckAt(x, y, fleck.density) && glyphs[pixel] < 0.5;

      if (fleckHere) {
        const tint = holo[Math.floor(hash(x >> 1, y >> 1, 29) * holo.length)];

        over(tint, 0.55 + 0.4 * hash(x >> 1, y >> 1, 13));
      }

      over([0, 0, 0], clamp(halo[pixel] - glyphs[pixel]) * 0.75);

      const across = 0.93 + 0.12 * valueNoise(x, y, 6, 71);

      over(
        gold.map((c) => clamp(c * across, 0, 255)),
        glyphs[pixel],
      );

      paint.write(colour, pixel);

      /* ---- Surface, under the coat: foil as metal — so it reflects in the
         body colour — duller along its creases, in resin that is not; foil
         glitter; gilt numerals. ---- */

      const foilRough = finish.foil + 0.25 * crease;
      const bed = fleckHere
        ? { roughness: finish.fleck, metalness: 1 }
        : {
            roughness: finish.resin + (foilRough - finish.resin) * near,
            metalness: near,
          };

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.4 * crease * near,
        roughness:
          bed.roughness + (finish.numerals - bed.roughness) * glyphs[pixel],
        metalness: bed.metalness + (1 - bed.metalness) * glyphs[pixel],
      });

      /* ---- Relief: sunk numerals, tilted shards, tilted flecks. ---- */

      height[pixel] = -engrave * relief[pixel];
      tiltX[pixel] = (cell.trait(61) - 0.5) * foil.tilt * near;
      tiltY[pixel] = (cell.trait(67) - 0.5) * foil.tilt * near;

      if (fleckHere) {
        tiltX[pixel] += (hash(x >> 1, y >> 1, 19) - 0.5) * 1.1;
        tiltY[pixel] += (hash(x >> 1, y >> 1, 23) - 0.5) * 1.1;
      }
    }
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/** `source` read between its pixels. */
function sample(source, x, y) {
  const x0 = clamp(Math.floor(x), 0, SIZE - 1);
  const y0 = clamp(Math.floor(y), 0, SIZE - 1);
  const x1 = Math.min(SIZE - 1, x0 + 1);
  const y1 = Math.min(SIZE - 1, y0 + 1);
  const fx = clamp(x - x0);
  const fy = clamp(y - y0);
  const top = source[y0 * SIZE + x0] * (1 - fx) + source[y0 * SIZE + x1] * fx;
  const bottom =
    source[y1 * SIZE + x0] * (1 - fx) + source[y1 * SIZE + x1] * fx;

  return top * (1 - fy) + bottom * fy;
}

/** The atlas read through a slow, small random offset: a hand, not a font. */
function wobble(source, { amplitude, cell }) {
  const out = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      out[y * SIZE + x] = sample(
        source,
        x + (valueNoise(x, y, cell, 113) - 0.5) * 2 * amplitude,
        y + (valueNoise(x, y, cell, 127) - 0.5) * 2 * amplitude,
      );
    }
  }

  return out;
}

/**
 * Random planes passing within `reach` of the middle of every die — they all
 * sit at their own origin — so each crosses whichever die it lands on, the way
 * one fold crosses the whole sheet. `sign` is a coin each: valley or mountain,
 * a scratch that bites dark or one that shows bright metal.
 */
function creasePlanes(count, reach, salt = 131) {
  return Array.from({ length: count }, (_, index) => {
    const axis = [1, 2, 3].map((k) => hash(index, k, salt) - 0.5);
    const span = length(axis) || 1;

    return {
      normal: axis.map((value) => value / span),
      offset: (hash(index, 4, salt) - 0.5) * 2 * reach,
      sign: hash(index, 5, salt) < 0.5 ? -1 : 1,
    };
  });
}

/**
 * Numerals as a pen writes them: the glyphs thinned to their middle lines —
 * Zhang and Suen's thinning — and drawn again along those in a line `width`
 * wide, the pen pressing harder and lighter by up to `pressure` as it goes,
 * with a `blot` of ink where a stroke stops. Sizes in d20 face inradii, so
 * the pen is the same pen on every die.
 */
function penNumerals(glyphs, { owner, position, density, reference }, pen) {
  const solid = Uint8Array.from(glyphs, (value) => (value > 0.5 ? 1 : 0));
  const at = (pixel, dx, dy) => solid[pixel + dy * SIZE + dx];
  const inside = [];

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const x = pixel % SIZE;
    const y = Math.floor(pixel / SIZE);

    if (solid[pixel] && x > 0 && y > 0 && x < SIZE - 1 && y < SIZE - 1) {
      inside.push(pixel);
    }
  }

  // Round P2 to P9, clockwise from straight up.
  const ring = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  let changed = true;

  while (changed) {
    changed = false;

    for (const second of [false, true]) {
      const peeled = inside.filter((pixel) => {
        if (!solid[pixel]) {
          return false;
        }

        const p = ring.map(([dx, dy]) => at(pixel, dx, dy));
        const filled = p.reduce((sum, value) => sum + value, 0);
        const turns = p.filter((value, k) => !value && p[(k + 1) % 8]).length;
        const [p2, , p4, , p6, , p8] = p;

        return (
          filled >= 2 &&
          filled <= 6 &&
          turns === 1 &&
          (second ? p2 * p4 * p8 === 0 : p2 * p4 * p6 === 0) &&
          (second ? p2 * p6 * p8 === 0 : p4 * p6 * p8 === 0)
        );
      });

      for (const pixel of peeled) {
        solid[pixel] = 0;
      }

      changed ||= peeled.length > 0;
    }
  }

  /* ---- How far every pixel is from the line, and from a stroke's end. ---- */

  const REACH = 4;
  const fromLine = new Float32Array(SIZE * SIZE).fill(Infinity);
  const fromEnd = new Float32Array(SIZE * SIZE).fill(Infinity);

  for (const pixel of inside) {
    if (!solid[pixel]) {
      continue;
    }

    const neighbours = ring.reduce(
      (sum, [dx, dy]) => sum + at(pixel, dx, dy),
      0,
    );
    const x = pixel % SIZE;
    const y = Math.floor(pixel / SIZE);

    for (let dy = -REACH; dy <= REACH; dy++) {
      for (let dx = -REACH; dx <= REACH; dx++) {
        const tx = x + dx;
        const ty = y + dy;

        if (tx < 0 || ty < 0 || tx >= SIZE || ty >= SIZE) {
          continue;
        }

        const target = ty * SIZE + tx;
        const gap = Math.hypot(dx, dy);

        fromLine[target] = Math.min(fromLine[target], gap);

        if (neighbours === 1) {
          fromEnd[target] = Math.min(fromEnd[target], gap);
        }
      }
    }
  }

  const lettering = new Float32Array(SIZE * SIZE);
  const width = pen.width * reference;
  const pressureScale = pen.scale * reference;

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0 || fromLine[pixel] === Infinity) {
      continue;
    }

    const perPixel = 1 / density[pixel];
    const press = valueNoise3(
      position[pixel * 3] / pressureScale,
      position[pixel * 3 + 1] / pressureScale,
      position[pixel * 3 + 2] / pressureScale,
      851,
    );
    const half = (width * (1 - pen.pressure / 2 + pen.pressure * press)) / 2;
    const soft = 0.5 * perPixel;
    const line =
      1 - smoothstep(half - soft, half + soft, fromLine[pixel] * perPixel);
    const blot =
      1 -
      smoothstep(
        half * pen.blot - soft,
        half * pen.blot + soft,
        fromEnd[pixel] * perPixel,
      );

    lettering[pixel] = Math.max(line, blot);
  }

  return lettering;
}

/**
 * A die folded from a sheet of paper and drawn on in pen, in the PLAYER'S
 * colour.
 *
 * The other skins inverted: here the paper is opaque and the ink is the hole
 * in it, so `material.type: "color"` fills every pen line with the body colour
 * and choosing a colour is choosing a pen. Nothing is quite even, because a
 * hand drew it:
 *
 *   folds     every edge inked — the bevel, and a band either side of it whose
 *             width wanders along the edge the way a pen's pressure does
 *   sketch    a second, thinner line inset along each edge, the bevel a drawn
 *             die is given, broken wherever the pen lifted
 *   numerals  written in the same pen — the stock glyphs, wobbled, thinned
 *             to their middle lines and drawn along them — see `penNumerals`
 *   paper     warm white and matte, clouded the way a sheet is formed, its
 *             fibres showing as faint streaks every way, a few flecks of pulp,
 *             a tooth in the normal map, and a few creases right across the
 *             die where the sheet was folded and opened out again
 */
function paintPaper(recipe, base) {
  const { ink, reference, owner, distance, density, position } = base;
  const { pen, sketch, creases, fibres, finish } = recipe;

  const paper = hex(recipe.paper);
  const outline = pen.outline * reference;
  const wander = pen.wander * reference;
  const inset = sketch.inset * reference;
  const stroke = sketch.width * reference;
  const gap = sketch.gap * reference;
  const creaseWidth = creases.width * reference;
  const creaseDepth = creases.depth * reference;

  const lettering = penNumerals(
    wobble(ink, recipe.wobble),
    base,
    recipe.numerals,
  );
  const cloudScale = recipe.cloud.scale * reference;
  const fleckScale = recipe.flecks.scale * reference;
  // Each set of fibres streaks one way through the sheet.
  const strands = Array.from({ length: fibres.ways }, (_, way) => {
    const along = normalise([1, 2, 3].map((k) => hash(way, k, 861) - 0.5));
    const side = normalise(
      cross(along, Math.abs(along[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]),
    );

    return [side, along, cross(along, side)];
  });
  const thin = fibres.width * reference;
  const run = fibres.length * reference;
  const planes = creasePlanes(creases.count, reference);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      // The folds themselves: solid ink, which leaves the body colour.
      if (owner[pixel] < 0) {
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.ink,
          metalness: 0,
        });
        continue;
      }

      const px = position[pixel * 3];
      const py = position[pixel * 3 + 1];
      const pz = position[pixel * 3 + 2];
      const d = distance[pixel];
      const half = 0.75 / density[pixel];

      /* ---- Ink: the fold line, the sketched bevel, the numerals. ---- */

      const pressure = valueNoise3(px / wander, py / wander, pz / wander, 73);
      const reach = outline * (0.6 + 0.8 * pressure);
      const edge = 1 - smoothstep(reach - half, reach + half, d);

      const drift = valueNoise3(px / wander, py / wander, pz / wander, 79);
      const centre = inset * (0.9 + 0.2 * drift);
      const thickness =
        stroke *
        (0.5 +
          0.8 *
            valueNoise3(
              (2 * px) / wander,
              (2 * py) / wander,
              (2 * pz) / wander,
              83,
            ));
      const lifted = smoothstep(
        sketch.lift - 0.06,
        sketch.lift + 0.06,
        valueNoise3(px / gap, py / gap, pz / gap, 89),
      );
      const line =
        (1 -
          smoothstep(
            thickness - half,
            thickness + half,
            Math.abs(d - centre),
          )) *
        lifted;

      const load = 0.82 + 0.18 * valueNoise(x, y, 3, 97);
      const inked = Math.max(edge, line, lettering[pixel]) * load;

      /* ---- Paper: grain, and where the sheet was creased. ---- */

      let ridge = 0;

      for (const { normal, offset, sign } of planes) {
        const across =
          px * normal[0] + py * normal[1] + pz * normal[2] - offset;

        ridge += sign * (1 - smoothstep(0, creaseWidth, Math.abs(across)));
      }

      const grain =
        0.6 * valueNoise(x, y, 2, 101) + 0.4 * valueNoise(x, y, 9, 103);
      const cloud = fbm3(
        px / cloudScale,
        py / cloudScale,
        pz / cloudScale,
        3,
        857,
      );
      let fibre = 0;

      strands.forEach(([side, along, out], way) => {
        const streak = smoothstep(
          fibres.from,
          fibres.to,
          valueNoise3(
            (px * side[0] + py * side[1] + pz * side[2]) / thin,
            (px * along[0] + py * along[1] + pz * along[2]) / run,
            (px * out[0] + py * out[1] + pz * out[2]) / run,
            863 + way,
          ),
        );

        fibre += way % 2 ? streak : -streak;
      });

      const fleck = smoothstep(
        0.93,
        0.97,
        valueNoise3(px / fleckScale, py / fleckScale, pz / fleckScale, 869),
      );
      const tone =
        0.955 +
        0.05 * grain +
        recipe.cloud.strength * (cloud - 0.5) +
        fibres.strength * fibre -
        0.05 * Math.abs(ridge);

      for (let channel = 0; channel < 3; channel++) {
        colour[pixel * 4 + channel] = Math.round(
          clamp(
            paper[channel] * tone * (1 - recipe.flecks.strength * fleck),
            0,
            255,
          ),
        );
      }

      colour[pixel * 4 + 3] = Math.round(255 * (1 - inked));

      // Matte paper, a little sheen on the ink, and a shadow down each crease.
      writeSurface(surface, pixel, {
        occlusion: 1 - 0.25 * Math.abs(ridge),
        roughness: finish.paper + (finish.ink - finish.paper) * inked,
        metalness: 0,
      });

      height[pixel] =
        creaseDepth * ridge + fibres.depth * reference * Math.abs(fibre);
      tiltX[pixel] = (valueNoise(x, y, 2, 107) - 0.5) * recipe.grain;
      tiltY[pixel] = (valueNoise(x, y, 2, 109) - 0.5) * recipe.grain;
    }
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * Matte black, split by a web of cracks filled with glittering resin in the
 * PLAYER'S colour, and lettered in white.
 *
 *   cracks    the walls of cellular noise through the die — warped so they
 *             wander, not every wall kept so some run out at a junction, their
 *             width breathing along their length, and held back from the
 *             numerals. Sunk below the surface, darkening down each wall
 *   resin     the channel left TRANSPARENT, so the body colour fills it, and
 *             salted with pale and holographic glitter
 *   black     everything else, opaque: the one skin whose surface the
 *             player's colour reaches only through the cracks
 *   numerals  the stock glyphs in white enamel
 */
function paintCracked(recipe, base) {
  const { ink, reference, owner, density, position, normals } = base;
  const { crack, fleck, finish } = recipe;

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const clearance = neighbourhood(
    neighbourhood(glyphs, crack.clearance, true),
    2,
  );

  const cell = crack.cell * reference;
  const warp = crack.warp * cell;
  const swirl = crack.swirl * cell;
  const width = crack.width * reference;
  const depth = crack.depth * reference;

  const black = hex(recipe.black);
  const white = hex(recipe.numerals);
  const glitter = fleck.colors.map(hex);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        colour.set([...black, 255], pixel * 4);
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.black,
          metalness: 0,
        });
        continue;
      }

      const px = position[pixel * 3];
      const py = position[pixel * 3 + 1];
      const pz = position[pixel * 3 + 2];
      const sx = px / swirl;
      const sy = py / swirl;
      const sz = pz / swirl;

      /* ---- Where the cracks run. ---- */

      const wx = px + (valueNoise3(sx, sy, sz, 161) - 0.5) * 2 * warp;
      const wy = py + (valueNoise3(sx, sy, sz, 163) - 0.5) * 2 * warp;
      const wz = pz + (valueNoise3(sx, sy, sz, 167) - 0.5) * 2 * warp;
      const seam = cellAt(wx / cell, wy / cell, wz / cell);

      // A wall is a plane through the die, and a plane meeting a face at a
      // shallow angle leaves a wide smear where a steep one leaves a hairline.
      // Measured along the face instead, every crack is its own width; one
      // nearly flat to the face has no line to draw, and is left out.
      const face = normals[owner[pixel]];
      const facing = Math.abs(dot(seam.across, face));
      const steep = Math.sqrt(1 - Math.min(1, facing * facing));

      const open =
        (seam.seam(157) < crack.keep ? 1 : 0) *
        smoothstep(0.3, 0.5, steep) *
        (1 - clearance[pixel]);
      const half =
        width * (0.75 + 0.5 * valueNoise3(1.7 * sx, 1.7 * sy, 1.7 * sz, 173));
      const soft = 0.75 / density[pixel];
      const from = (seam.wall * cell) / Math.max(steep, 0.3);
      const inside = open * (1 - smoothstep(half - soft, half + soft, from));
      const wall = inside * smoothstep(half * 0.45, half, from);

      /* ---- Colour: black, the resin through the cracks, the numerals. ---- */

      const paint = layers();
      const over = paint.over;

      over(black, 1 - inside);
      over([0, 0, 0], wall * 0.55);

      const fleckHere = inside > 0.5 && fleckAt(x, y, fleck.density);

      if (fleckHere) {
        const pick = hash(x >> 1, y >> 1, 179);

        if (pick < 0.18) {
          over([0, 0, 0], 0.4);
        } else {
          over(
            glitter[Math.floor(hash(x >> 1, y >> 1, 181) * glitter.length)],
            0.3 + 0.45 * hash(x >> 1, y >> 1, 13),
          );
        }
      }

      over(white, glyphs[pixel]);
      paint.write(colour, pixel);

      /* ---- Surface: satin black, glassy resin, foil glitter, enamel
         numerals, and shadow down the walls of each crack. ---- */

      const bed = fleckHere
        ? { roughness: finish.fleck, metalness: 1 }
        : {
            roughness: finish.black + (finish.resin - finish.black) * inside,
            metalness: 0,
          };

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.6 * wall,
        roughness:
          bed.roughness + (finish.numerals - bed.roughness) * glyphs[pixel],
        metalness: bed.metalness * (1 - glyphs[pixel]),
      });

      /* ---- Relief: the channel sunk, its glitter tilted. ---- */

      height[pixel] =
        -depth * open * (1 - smoothstep(half * 0.5, half + soft, from));

      if (fleckHere) {
        tiltX[pixel] = (hash(x >> 1, y >> 1, 19) - 0.5) * 1.1;
        tiltY[pixel] = (hash(x >> 1, y >> 1, 23) - 0.5) * 1.1;
      }
    }
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * The stock numerals, shrunk wherever they would reach a pixel `open` turns
 * down. Each face's numerals shrink towards their own middle, so they stay
 * where they were placed, and every face of a die by the same factor, so a
 * die's numerals stay one size.
 */
function fitNumerals({ ink, owner, dice }, open) {
  const weight = new Float64Array(dice.length);
  const middleX = new Float64Array(dice.length);
  const middleY = new Float64Array(dice.length);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face >= 0 && ink[pixel] > 0) {
      weight[face] += ink[pixel];
      middleX[face] += (pixel % SIZE) * ink[pixel];
      middleY[face] += Math.floor(pixel / SIZE) * ink[pixel];
    }
  }

  for (let face = 0; face < dice.length; face++) {
    middleX[face] /= weight[face] || 1;
    middleY[face] /= weight[face] || 1;
  }

  const strokes = new Map(dice.map((die) => [die, []]));

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face >= 0 && ink[pixel] > 0.5) {
      strokes.get(dice[face]).push(pixel);
    }
  }

  const fits = (pixels, scale) =>
    pixels.every((pixel) => {
      const face = owner[pixel];
      const x = Math.round(
        middleX[face] + ((pixel % SIZE) - middleX[face]) * scale,
      );
      const y = Math.round(
        middleY[face] + (Math.floor(pixel / SIZE) - middleY[face]) * scale,
      );
      const landing = y * SIZE + x;

      return owner[landing] === face && open(landing);
    });

  const scales = new Map(
    [...strokes].map(([die, pixels]) => {
      let scale = 1;

      while (scale > 0.5 && !fits(pixels, scale)) {
        scale -= 0.01;
      }

      return [die, scale];
    }),
  );

  const fitted = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const scale = scales.get(dice[face]) ?? 1;

    if (scale === 1) {
      fitted[pixel] = ink[pixel];
      continue;
    }

    const x = middleX[face] + ((pixel % SIZE) - middleX[face]) / scale;
    const y =
      middleY[face] + (Math.floor(pixel / SIZE) - middleY[face]) / scale;
    const from = Math.round(y) * SIZE + Math.round(x);

    fitted[pixel] = owner[from] === face ? sample(ink, x, y) : 0;
  }

  return fitted;
}

/**
 * The metal's wear and the relief cast into it — everything about an inlaid
 * die except which metal it is, so the three metals share one carving.
 * Distances run in from each face's edge, so the plate is the face's own
 * shape, smaller: a triangle on a d20, a square on a d6, a kite on a d10.
 *
 *   frame     a polished band along the edge, level with the plate
 *   channel   the ring sunk between frame and plate, with a shadowed lip
 *   plate     the face's middle, raised, its numerals engraved — shrunk
 *             first wherever the stock ones would reach the channel
 *   wear      a patina that comes and goes across the die, brushed streaks
 *             along one edge of each face, scratches cut at random angles
 *             right across it, and grime gathered round every recess
 */
function carveInlay(recipe, base) {
  const { reference, owner, distance, density, position, normals, tangents } =
    base;
  const { wear } = recipe;

  const frame = recipe.frame * reference;
  const inner = (recipe.frame + recipe.channel) * reference;
  const numeralsFrom = inner + recipe.margin * reference;
  const depth = recipe.depth * reference;
  const engrave = recipe.engrave * reference;
  const patina = 0.7 * reference;
  const streak = 0.012 * reference;
  const run = 0.5 * reference;
  const pieces = 0.35 * reference;

  const glyphs = neighbourhood(
    fitNumerals(base, (pixel) => distance[pixel] >= numeralsFrom),
    recipe.weight,
    true,
  );
  const relief = neighbourhood(glyphs, 1);
  const scratches = creasePlanes(wear.scratches, 3 * reference, 211);

  const channel = new Float32Array(SIZE * SIZE);
  const plate = new Float32Array(SIZE * SIZE);
  const tone = new Float32Array(SIZE * SIZE);
  const brushed = new Float32Array(SIZE * SIZE);
  const scratch = new Float32Array(SIZE * SIZE);
  const height = new Float32Array(SIZE * SIZE);
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const px = position[pixel * 3];
    const py = position[pixel * 3 + 1];
    const pz = position[pixel * 3 + 2];
    const point = [px, py, pz];
    const d = distance[pixel];
    const soft = 0.75 / density[pixel];

    plate[pixel] = smoothstep(inner - soft, inner + soft, d);
    channel[pixel] = smoothstep(frame - soft, frame + soft, d) - plate[pixel];

    /* ---- The wear. ---- */

    const along = tangents[face];
    const across = cross(normals[face], along);

    tone[pixel] = valueNoise3(px / patina, py / patina, pz / patina, 193);
    brushed[pixel] = valueNoise(
      dot(point, across) / streak,
      dot(point, along) / run,
      1,
      197,
    );

    for (const { normal, offset, sign } of scratches) {
      const off = Math.abs(dot(point, normal) - offset);

      if (off < 2 * soft) {
        const piece = valueNoise3(
          px / pieces + offset * 97,
          py / pieces,
          pz / pieces,
          199,
        );

        scratch[pixel] +=
          sign *
          (1 - smoothstep(0, 2 * soft, off)) *
          smoothstep(0.55, 0.7, piece);
      }
    }
  }

  const sunk = neighbourhood(channel, 1);
  const recessed = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    recessed[pixel] = Math.max(channel[pixel], glyphs[pixel]);
  }

  const gathered = neighbourhood(recessed, 2);
  const grime = new Float32Array(SIZE * SIZE);
  const lip = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        continue;
      }

      grime[pixel] = clamp(gathered[pixel] - recessed[pixel]) * wear.grime;
      lip[pixel] = channel[pixel] * clamp(1 - sunk[pixel]) * 0.6;

      height[pixel] =
        -depth * sunk[pixel] -
        engrave * relief[pixel] +
        wear.brush * 0.006 * reference * brushed[pixel] -
        0.002 * reference * Math.abs(scratch[pixel]);

      if (channel[pixel] > 0.5 && fleckAt(x, y, recipe.fleck.density)) {
        tiltX[pixel] = (hash(x >> 1, y >> 1, 19) - 0.5) * 1.1;
        tiltY[pixel] = (hash(x >> 1, y >> 1, 23) - 0.5) * 1.1;
      }
    }
  }

  return {
    glyphs,
    channel,
    plate,
    lip,
    grime,
    tone,
    brushed,
    scratch,
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * One metal's colour and surface maps over an inlaid carving: the metal
 * opaque, the frame polished and the plate worn, the channel left TRANSPARENT
 * so the player's colour fills it, salted with glitter, and the numerals
 * filled black.
 */
function paintInlaid(recipe, { owner }, carving) {
  const { glyphs, channel, plate, lip, grime, tone, brushed, scratch } =
    carving;
  const { wear, fleck, finish } = recipe;

  const metal = hex(recipe.metal);
  const numerals = hex(recipe.numerals);
  const glitter = fleck.colors.map(hex);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      // The bevels: the edges a die is handled by, worn bright.
      if (owner[pixel] < 0) {
        colour.set(
          [...metal.map((c) => clamp(c * 1.12, 0, 255)), 255],
          pixel * 4,
        );
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.bevel,
          metalness: 1,
        });
        continue;
      }

      // The frame is handled more than it is looked at, and keeps its polish.
      const worn = wear.frame + (1 - wear.frame) * plate[pixel];
      const toneShift = wear.tone * worn;
      const brushShift = wear.brush * worn;
      const scuff = scratch[pixel];
      const sheen =
        (1 - toneShift + 2 * toneShift * tone[pixel]) *
        (1 - brushShift + 2 * brushShift * brushed[pixel]) *
        (1 - grime[pixel]) *
        (1 + 0.12 * clamp(scuff, 0, 1) - 0.18 * clamp(-scuff, 0, 1));

      const paint = layers();
      const over = paint.over;

      over(
        metal.map((c) => clamp(c * sheen, 0, 255)),
        1 - channel[pixel],
      );
      over([0, 0, 0], lip[pixel]);

      const fleckHere = channel[pixel] > 0.5 && fleckAt(x, y, fleck.density);

      if (fleckHere) {
        over(
          glitter[Math.floor(hash(x >> 1, y >> 1, 181) * glitter.length)],
          0.25 + 0.4 * hash(x >> 1, y >> 1, 13),
        );
      }

      over(numerals, glyphs[pixel]);
      paint.write(colour, pixel);

      /* ---- Surface: the wear as roughness — rougher where the patina is
         dull and the grime sits, smoother down a bright scratch — glassy
         resin, foil glitter, satin black numerals. ---- */

      const rough =
        finish.frame +
        (finish.plate - finish.frame) * plate[pixel] +
        worn * (0.14 * (1 - tone[pixel]) + 0.12 * (1 - brushed[pixel])) +
        0.6 * grime[pixel] -
        0.1 * clamp(scuff, 0, 1) +
        0.15 * clamp(-scuff, 0, 1);
      const resin = fleckHere ? finish.fleck : finish.resin;
      const metalShare = clamp(1 - channel[pixel] - glyphs[pixel]);

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.9 * grime[pixel] - 0.6 * lip[pixel],
        roughness:
          rough * metalShare +
          resin * channel[pixel] +
          finish.numerals * glyphs[pixel],
        // Only part foil: a wholly metal fleck facing away from the light is black.
        metalness: metalShare + (fleckHere ? finish.foil * channel[pixel] : 0),
      });
    }
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: carving.normal,
  };
}

/**
 * Each face's corners, for the CORNERED skins' brackets: the point, the two
 * edges leaving it — each as its direction, its length, and the way across
 * it into the face — and how far along either edge a point `inset` in from
 * both of them sits, per unit of `inset`.
 *
 * Some faces' corners are clipped by slivers too short to see — a d4's all
 * are — so a corner is where two neighbouring SIDES of the face would meet,
 * the slivers between them dropped. Where two sides run straight on there is
 * no corner.
 */
function faceCorners(faces) {
  return faces.map(({ edges, centre, normal }) => {
    const longest = Math.max(...edges.map(({ span }) => span));
    // `span` is squared: sides at least a tenth as long as the longest.
    const sides = edges.filter(({ span }) => span > 0.01 * longest);
    const right = normalise(sub(sides[0].a, centre));
    const up = cross(normal, right);
    const bearing = ({ a, b }) => {
      const middle = sub(
        a.map((value, k) => (value + b[k]) / 2),
        centre,
      );

      return Math.atan2(dot(middle, up), dot(middle, right));
    };

    sides.sort((one, two) => bearing(one) - bearing(two));

    return sides.flatMap((first, index) => {
      const second = sides[(index + 1) % sides.length];
      const u = normalise(first.ab);
      const v = normalise(second.ab);
      const both = cross(u, v);
      const square = dot(both, both);

      if (square < 1e-4) {
        return [];
      }

      const t = dot(cross(sub(second.a, first.a), v), both) / square;
      const at = first.a.map((value, k) => value + u[k] * t);
      const far = ({ a, b }) =>
        length(sub(a, at)) > length(sub(b, at)) ? a : b;
      const ends = [far(first), far(second)];
      const [one, two] = ends.map((end) => normalise(sub(end, at)));
      const turn = dot(one, two);
      const across = (from, to) =>
        normalise(
          sub(
            to,
            from.map((value) => value * turn),
          ),
        );

      return [
        {
          at,
          lead: Math.sqrt((1 + turn) / (1 - turn)),
          edges: [
            {
              along: one,
              inward: across(one, two),
              span: length(sub(ends[0], at)),
            },
            {
              along: two,
              inward: across(two, one),
              span: length(sub(ends[1], at)),
            },
          ],
        },
      ];
    });
  });
}

/**
 * How far inside the nearest corner bracket `point` is — negative outside
 * it. A bracket is two bands, one along each edge leaving its corner, each
 * `inset` in from its edge and `width` wide, joined in an L at the corner and
 * running `arm` along the edge, or `reach` of it if that is shorter. Die units.
 */
function bracketDepth(point, corners, { inset, width, arm, reach }) {
  let deepest = -Infinity;

  for (const { at, lead, edges } of corners) {
    const rx = point[0] - at[0];
    const ry = point[1] - at[1];
    const rz = point[2] - at[2];
    const off = edges.map(
      ({ inward }) => rx * inward[0] + ry * inward[1] + rz * inward[2],
    );

    edges.forEach(({ along, span }, side) => {
      const run = rx * along[0] + ry * along[1] + rz * along[2];
      const end = inset * lead + Math.min(arm, reach * span);
      const inside = Math.min(
        off[side] - inset,
        inset + width - off[side],
        off[1 - side] - inset,
        end - run,
      );

      deepest = Math.max(deepest, inside);
    });
  }

  return deepest;
}

/**
 * The relief the CORNERED skins share, whatever metal they are cast in: a
 * rim round every face, a bracket in each of its corners and the numerals,
 * all standing proud of the enamel between them, and the swirl in that
 * enamel. Sizes are fractions of a d20 face's inradius.
 *
 *   rim       a flat band along the face's edge, rounding over into the
 *             enamel across `bevel`
 *   brackets  an L in every corner, set `gap` in from the rim — see
 *             `bracketDepth` — rounded over the whole of their width, so
 *             they read as cast ridges rather than flat paint
 *   numerals  the stock glyphs, raised, and shrunk where they would reach
 *             the rim or a bracket — see `fitNumerals` — keeping `margin` of
 *             enamel round them; a d4's sit in its corners
 *   enamel    sunk between them, darkened where the metal stands over it,
 *             and marbled through the die by warped noise
 */
function carveCornered(recipe, base) {
  const { reference, owner, distance, density, position, faces } = base;
  const { bracket, enamel } = recipe;

  const frame = recipe.frame * reference;
  const bevel = recipe.bevel * reference;
  const depth = recipe.depth * reference;
  const margin = recipe.margin * reference;
  const swirl = enamel.scale * reference;
  const shape = {
    inset: (recipe.frame + bracket.gap) * reference,
    width: bracket.width * reference,
    arm: bracket.arm * reference,
    reach: bracket.reach,
  };
  const corners = faceCorners(faces);

  const brackets = new Float32Array(SIZE * SIZE).fill(-Infinity);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face >= 0) {
      brackets[pixel] = bracketDepth(
        position.subarray(pixel * 3, pixel * 3 + 3),
        corners[face],
        shape,
      );
    }
  }

  const glyphs = neighbourhood(
    fitNumerals(
      base,
      (pixel) =>
        distance[pixel] >= frame + margin && brackets[pixel] <= -margin,
    ),
    recipe.weight,
    true,
  );
  const relief = neighbourhood(glyphs, 1);

  const metal = new Float32Array(SIZE * SIZE);
  const height = new Float32Array(SIZE * SIZE);
  const marble = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0) {
      metal[pixel] = 1;
      height[pixel] = depth;
      continue;
    }

    const soft = 0.75 / density[pixel];
    const rim = frame - distance[pixel];
    const ridge = brackets[pixel];

    metal[pixel] = Math.max(
      smoothstep(-soft, soft, rim),
      smoothstep(-soft, soft, ridge),
      glyphs[pixel],
    );
    height[pixel] = Math.max(
      depth * smoothstep(0, bevel, rim),
      depth * bracket.height * smoothstep(0, shape.width / 2, ridge),
      depth * 0.8 * relief[pixel],
    );

    const qx = position[pixel * 3] / swirl;
    const qy = position[pixel * 3 + 1] / swirl;
    const qz = position[pixel * 3 + 2] / swirl;

    marble[pixel] = fbm3(
      qx + (fbm3(qx, qy, qz, 3, 613) - 0.5) * 2 * enamel.warp,
      qy + (fbm3(qx + 5.2, qy, qz, 3, 617) - 0.5) * 2 * enamel.warp,
      qz + (fbm3(qx, qy + 9.1, qz, 3, 619) - 0.5) * 2 * enamel.warp,
      3,
      631,
    );
  }

  const spread = neighbourhood(metal, recipe.shadow);
  const shade = metal.map((value, pixel) => clamp(spread[pixel] - value));
  const flat = new Float32Array(SIZE * SIZE);

  return {
    glyphs,
    metal,
    shade,
    marble,
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/**
 * One metal's colours over the CORNERED carving: polished metal for the rim,
 * the brackets and the numerals, and between them enamel in the PLAYER'S
 * colour — transparent, so the body shows — marbled darker and paler, with
 * pearly streaks along the swirl and shadow where the metal stands over it.
 */
function paintCornered(recipe, { owner }, carving) {
  const { metal, shade, marble } = carving;
  const { enamel, finish } = recipe;
  const cast = hex(recipe.metal);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        colour.set([...cast, 255], pixel * 4);
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.metal,
          metalness: 1,
        });
        continue;
      }

      const m = metal[pixel];
      const swirl = marble[pixel];
      const dark = smoothstep(0.5, 0.3, swirl);
      const pale = smoothstep(0.52, 0.7, swirl);
      const pearl = 1 - smoothstep(0, enamel.streak, Math.abs(swirl - 0.56));
      const polish = 0.92 + 0.14 * valueNoise(x, y, 6, 641);

      const paint = layers();

      paint.over(
        [0, 0, 0],
        clamp(enamel.dark * dark + enamel.shadow * shade[pixel]),
      );
      paint.over([255, 255, 255], enamel.light * pale + enamel.pearl * pearl);
      paint.over(
        cast.map((c) => clamp(c * polish, 0, 255)),
        m,
      );
      paint.write(colour, pixel);

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.5 * shade[pixel] * (1 - m),
        roughness:
          finish.metal * m + (finish.enamel + 0.06 * (1 - pale)) * (1 - m),
        // A little metal in the pale swirls, for the enamel's pearly sheen.
        metalness: m + enamel.sheen * Math.max(pale, pearl) * (1 - m),
      });
    }
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: carving.normal,
  };
}
/**
 * Every corner of every die: `out` points through it, `apex` is where its
 * faces' outlines end, and `meeting` holds, for each face there, that end and
 * the face's middle. The bevel keeps the outlines from meeting in one point,
 * so their ends are gathered by direction.
 */
function dieCorners(faces) {
  const corners = [];

  faces.forEach(({ die, edges, centre }, face) => {
    for (const point of edges.flatMap(({ a, b }) => [a, b])) {
      const direction = normalise(point);
      let corner = corners.find(
        (one) => one.die === die && dot(one.direction, direction) > 0.97,
      );

      if (!corner) {
        corner = { die, direction, ends: new Map() };
        corners.push(corner);
      }

      // The end furthest from the face's middle is the corner; any nearer
      // one belongs to a sliver of bevel.
      const span = length(sub(point, centre));

      if (span > (corner.ends.get(face)?.span ?? 0)) {
        corner.ends.set(face, { point, span, centre });
      }
    }
  });

  return corners.map(({ die, ends }) => {
    const meeting = [...ends.values()];
    const sum = (pick) =>
      meeting.reduce(
        (total, end) => total.map((value, k) => value + pick(end)[k]),
        [0, 0, 0],
      );

    return {
      die,
      out: normalise(sum(({ point }) => normalise(point))),
      apex: sum(({ point }) => point).map((value) => value / meeting.length),
      faces: new Set(ends.keys()),
      meeting,
    };
  });
}

/**
 * How far along its `out` the plane cutting a corner off sits, to cross each
 * face meeting there `fraction` of the way from the corner to the middle.
 */
function cutOffset({ out, meeting }, fraction) {
  return (
    meeting.reduce(
      (sum, { point, centre }) =>
        sum +
        dot(
          point.map((value, k) => value + (centre[k] - value) * fraction),
          out,
        ),
      0,
    ) / meeting.length
  );
}

/** Every edge of every die: two of its corners that share two faces. */
function dieEdges(corners) {
  return corners.flatMap((from, index) =>
    corners.slice(index + 1).flatMap((to) => {
      const shared = [...from.faces].filter((face) => to.faces.has(face));

      if (from.die !== to.die || shared.length < 2) {
        return [];
      }

      const span = sub(to.apex, from.apex);

      return [
        {
          from,
          to,
          faces: shared.slice(0, 2),
          length: length(span),
          direction: normalise(span),
        },
      ];
    }),
  );
}

/** Distance from (x, y) to the segment from (ax, ay) to (bx, by). */
function segmentDistance(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));

  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}

/**
 * The faces' paint carried out across the gutters round them, a pixel a
 * pass. The atlas maps each bevel across the gutter between its faces'
 * islands, so a skin whose corners are painted needs its bevels to wear what
 * the faces either side of them do.
 */
function bleed(owner, layers, passes) {
  const filled = Uint8Array.from(owner, (face) => (face >= 0 ? 1 : 0));

  for (let pass = 0; pass < passes; pass++) {
    const reached = [];

    for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
      if (filled[pixel]) {
        continue;
      }

      const x = pixel % SIZE;
      const from = [
        x > 0 ? pixel - 1 : -1,
        x < SIZE - 1 ? pixel + 1 : -1,
        pixel - SIZE,
        pixel + SIZE,
      ].find((next) => next >= 0 && next < SIZE * SIZE && filled[next]);

      if (from !== undefined) {
        reached.push(pixel, from);
      }
    }

    for (let at = 0; at < reached.length; at += 2) {
      const [pixel, from] = [reached[at], reached[at + 1]];

      for (const { data, channels } of layers) {
        data.copyWithin(
          pixel * channels,
          from * channels,
          (from + 1) * channels,
        );
      }

      filled[pixel] = 1;
    }
  }
}

/** One of `weights`' keys, picked by `roll` in [0, 1) in proportion. */
function weighted(weights, roll) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let left = roll * total;

  for (const [key, weight] of Object.entries(weights)) {
    left -= weight;

    if (left < 0) {
      return key;
    }
  }

  return Object.keys(weights).at(-1);
}

/**
 * White plastic panelled in black and in the PLAYER'S colour, with the
 * markings of a machine part.
 *
 *   caps      every corner of the die cut off square, so each cap crosses
 *             every face meeting there in straight lines and reads as one
 *             panel round the corner — a pentagon on a d20, a triangle on a
 *             d6. Dealt round the dice in `corners` order, each a size of its
 *             own: TRANSPARENT for the player's colour, black and sunk, white
 *             with a line inside, two-tone either way round, white with a
 *             chevron of colour, or hazard-striped
 *   edges     every edge of a die given one marking, measured from the edge
 *             itself so it wraps onto both faces and over the bevel: a
 *             bracket of panel line, a bar of colour, a strip of barcode, or
 *             a block of hazard stripes — each kept to the stretch of edge
 *             the caps leave clear
 *   lines     a dark outline round every cap, up to two more following it
 *             out across the white, and a pale one inside a black cap where
 *             its sunk edge would catch the light
 *   numerals  the stock glyphs in black, shrunk wherever they would reach a
 *             cap's lines, with every marking held clear of them
 *   bevels    whatever the faces they join are, carried over the gutters
 */
function paintAsiimov(recipe, base) {
  const { reference, owner, density, position, normals, dice, faces } = base;
  const { colours, finish } = recipe;
  const units = (value) => value * reference;

  const outline = units(recipe.outline);
  const echoGap = units(recipe.echo.gap);
  const echoWidth = units(recipe.echo.width);
  const rimInset = units(recipe.rim.inset);
  const rimWidth = units(recipe.rim.width);
  const split = units(recipe.split);
  const [chevronFrom, chevronTo] = recipe.chevron.map(units);
  const stripePitch = units(recipe.stripes);
  const margin = units(recipe.margin);
  const depth = units(recipe.depth);
  const groove = units(recipe.groove);
  const engrave = units(recipe.engrave);
  const rail = {
    inset: units(recipe.rail.inset),
    half: units(recipe.rail.width) / 2,
  };
  const bar = {
    depth: units(recipe.bar.depth),
    gap: units(recipe.bar.gap),
    width: units(recipe.bar.width),
  };
  const ticks = {
    inset: units(recipe.ticks.inset),
    height: units(recipe.ticks.height),
    pitch: units(recipe.ticks.pitch),
    length: units(recipe.ticks.length),
  };
  const hazard = {
    inset: units(recipe.hazard.inset),
    height: units(recipe.hazard.height),
    pitch: units(recipe.hazard.pitch),
    length: units(recipe.hazard.length),
  };
  // Markings stay off the caps' outlines and the lines following them.
  const clearOfCaps = outline + 2 * echoGap + echoWidth + units(0.04);

  /* ---- The corners, dealt top to bottom round each die in turn, so the
     same corner always gets the same cap. ---- */

  const corners = dieCorners(faces)
    .sort(
      (a, b) =>
        a.die.localeCompare(b.die) ||
        b.out[1] - a.out[1] ||
        a.out[0] - b.out[0] ||
        a.out[2] - b.out[2],
    )
    .map((corner, index) => {
      const across = Math.abs(corner.out[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];

      return {
        ...corner,
        kind: recipe.corners[index % recipe.corners.length],
        offset: cutOffset(
          corner,
          (recipe.crowded[corner.die] ?? recipe.cap) *
            (1 - recipe.spread * hash(index, 1, 263)),
        ),
        echoes: Math.floor(hash(index, 2, 263) * 3),
        stripes: normalise(
          cross(corner.out, across).map(
            (value, k) => value + 0.6 * corner.out[k],
          ),
        ),
      };
    });

  /* ---- The edges, each with the stretch its caps leave clear. ---- */

  const edges = dieEdges(corners).map((edge, index) => {
    const { from, to, direction } = edge;
    const fromCap =
      (from.offset - dot(from.apex, from.out)) / dot(direction, from.out);
    const toCap = (to.offset - dot(to.apex, to.out)) / -dot(direction, to.out);

    return {
      ...edge,
      start: fromCap + clearOfCaps,
      end: edge.length - toCap - clearOfCaps,
      kind: weighted(recipe.edges, hash(index, 3, 269)),
      side: edge.faces[hash(index, 4, 269) < 0.5 ? 0 : 1],
      salt: index,
    };
  });

  // How fast each cut's plane climbs across each face: a distance along the
  // face is the plane's own distance divided by it.
  const facing = normals.map((normal, face) =>
    corners
      .filter((corner) => corner.die === dice[face])
      .map((corner) => ({
        corner,
        slope: Math.sqrt(1 - Math.min(1, dot(corner.out, normal) ** 2)),
      }))
      .filter(({ slope }) => slope > 0.1),
  );
  const bordering = normals.map((_, face) =>
    edges.filter(
      (edge) =>
        edge.kind !== "none" &&
        edge.faces.includes(face) &&
        edge.end - edge.start > units(0.25),
    ),
  );

  /* ---- Which cap each pixel is nearest, and how far inside it. ---- */

  const into = new Float32Array(SIZE * SIZE).fill(-Infinity);
  const nearest = new Int16Array(SIZE * SIZE).fill(-1);
  const cornerIndex = new Map(corners.map((corner, index) => [corner, index]));

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const point = position.subarray(pixel * 3, pixel * 3 + 3);

    for (const { corner, slope } of facing[face]) {
      const reach = (dot(point, corner.out) - corner.offset) / slope;

      if (reach > into[pixel]) {
        into[pixel] = reach;
        nearest[pixel] = cornerIndex.get(corner);
      }
    }
  }

  const glyphs = neighbourhood(
    fitNumerals(base, (pixel) => -into[pixel] >= margin),
    recipe.weight,
    true,
  );
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(neighbourhood(glyphs, recipe.clearance, true), 1);

  const white = hex(colours.white);
  const black = hex(colours.black);
  const line = hex(colours.line);
  const rimColour = hex(colours.rim);
  const numerals = hex(colours.numerals);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const flat = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      colour.set([...white, 255], pixel * 4);
      writeSurface(surface, pixel, {
        occlusion: 1,
        roughness: finish.white,
        metalness: 0,
      });
      continue;
    }

    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const soft = 0.75 / density[pixel];
    const inside = (value) => smoothstep(-soft, soft, value);
    const band = (value, from, to) => inside(value - from) - inside(value - to);

    /* ---- The cap. ---- */

    const corner = corners[nearest[pixel]];
    const depthIn = into[pixel];
    const outside = -depthIn;
    const capped = inside(depthIn);

    let accent = 0;
    let filled = 0;
    let rim = 0;
    let lines = band(outside, 0, outline);

    switch (corner?.kind) {
      case "accent":
        accent = capped;
        break;
      case "black":
        filled = capped;
        rim = band(depthIn, rimInset, rimInset + rimWidth);
        break;
      case "plain":
        lines = Math.max(lines, band(depthIn, rimInset, rimInset + rimWidth));
        break;
      case "split":
        accent = inside(depthIn - split);
        filled = capped - accent;
        break;
      case "banded":
        filled = inside(depthIn - split);
        accent = capped - filled;
        break;
      case "chevron":
        accent = band(depthIn, chevronFrom, chevronTo);
        break;
      case "hazard": {
        const phase = dot(point, corner.stripes) / stripePitch;
        const offCentre =
          Math.abs(phase - Math.floor(phase) - 0.5) * stripePitch;

        accent = capped * inside(stripePitch / 4 - offCentre);
        filled = capped - accent;
        break;
      }
    }

    for (
      let echo = 0;
      echo < (corner?.kind === "plain" ? 0 : (corner?.echoes ?? 0));
      echo++
    ) {
      const from = outline + echoGap * (1 + echo);

      lines = Math.max(lines, band(outside, from, from + echoWidth));
    }

    /* ---- The edges' markings, measured from each edge. ---- */

    let marked = 0;
    let markedLines = 0;

    for (const edge of bordering[face]) {
      const relative = sub(point, edge.from.apex);
      const t = dot(relative, edge.direction);
      const s = length(
        relative.map((value, k) => value - edge.direction[k] * t),
      );
      const { start, end } = edge;
      const middle = (start + end) / 2;

      if (s > units(0.5) || t < start - units(0.2) || t > end + units(0.2)) {
        continue;
      }

      switch (edge.kind) {
        case "rail": {
          const bend = Math.min(rail.inset, (end - start) / 3);
          const off = Math.min(
            segmentDistance(t, s, start, 0, start + bend, rail.inset),
            segmentDistance(
              t,
              s,
              start + bend,
              rail.inset,
              end - bend,
              rail.inset,
            ),
            segmentDistance(t, s, end - bend, rail.inset, end, 0),
          );

          markedLines = Math.max(markedLines, inside(rail.half - off));
          break;
        }
        case "bar": {
          const half = ((end - start) * recipe.bar.share) / 2;
          const along = inside(half - Math.abs(t - middle));

          marked = Math.max(marked, along * inside(bar.depth - s));
          markedLines = Math.max(
            markedLines,
            inside(half + bar.gap - Math.abs(t - middle)) *
              band(s, bar.depth + bar.gap, bar.depth + bar.gap + bar.width),
          );
          break;
        }
        case "ticks": {
          if (face !== edge.side) {
            break;
          }

          const first = Math.max(start, middle - ticks.length / 2);
          const last = Math.min(end, middle + ticks.length / 2);
          const step = (t - first) / ticks.pitch;
          const tick = Math.floor(step);
          const wide = 0.25 + 0.5 * hash(tick, edge.salt, 271);
          const within = (step - tick) * ticks.pitch;
          const on =
            inside(within) *
            inside(wide * ticks.pitch - within) *
            inside(t - first) *
            inside(last - t) *
            band(s, ticks.inset, ticks.inset + ticks.height);

          markedLines = Math.max(markedLines, on);
          break;
        }
        case "hazard": {
          if (face !== edge.side) {
            break;
          }

          const half = Math.min(hazard.length, end - start) / 2;
          const phase = (t + s) / hazard.pitch;
          const offCentre =
            Math.abs(phase - Math.floor(phase) - 0.5) * hazard.pitch;
          const box =
            inside(half - Math.abs(t - middle)) *
            band(s, hazard.inset, hazard.inset + hazard.height);

          marked = Math.max(marked, box * inside(hazard.pitch / 4 - offCentre));
          markedLines = Math.max(
            markedLines,
            inside(half - Math.abs(t - middle)) *
              band(
                s,
                hazard.inset + hazard.height + bar.gap,
                hazard.inset + hazard.height + bar.gap + bar.width,
              ),
          );
          break;
        }
      }
    }

    const keep =
      smoothstep(clearOfCaps - units(0.04), clearOfCaps, outside) *
      (1 - halo[pixel]);

    accent = Math.max(accent, marked * keep);
    lines = Math.max(lines, markedLines * keep);

    /* ---- Colour, bottom to top. ---- */

    const paint = layers();

    paint.over(white, 1 - accent);
    paint.over(black, filled);
    paint.over(line, lines);
    paint.over(rimColour, rim);
    paint.over(numerals, glyphs[pixel]);
    paint.write(colour, pixel);

    /* ---- Surface: matte white and colour, satin black, the lines and
       numerals as matte as the white they are printed on. ---- */

    const bed =
      finish.white +
      (finish.accent - finish.white) * accent +
      (finish.black - finish.white) * filled;

    writeSurface(surface, pixel, {
      occlusion: 1 - 0.3 * lines,
      roughness: bed + (finish.numerals - bed) * glyphs[pixel],
      metalness: 0,
    });

    height[pixel] = -depth * filled - groove * lines - engrave * relief[pixel];
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/**
 * Carved from one block of striped hardwood and numbered with a hot iron —
 * the one skin the player's colour never reaches: every pixel is opaque, the
 * gutters included, so nothing of the body shows anywhere.
 *
 *   grain     stripes where the growth rings meet the surface, from noise
 *             THROUGH THE DIE so they run on from face to face as they would
 *             in a carved block — bent by a slow warp, uneven in width and
 *             depth of colour — over broad darker patches drawn out down
 *             the grain, with fine fibres along it and pores pricked across it
 *   numerals  the stock glyphs burnt in: charred, sunk, and scorched round
 *             their edges
 *   bevels    the faces' wood, carried over the gutters
 */
function paintWood(recipe, base) {
  const { ink, reference, owner, position } = base;
  const { grain, colours, finish } = recipe;

  const along = normalise(grain.along);
  const across = normalise(cross(along, [0, 0, 1]));
  const depthwise = cross(along, across);

  const period = grain.period * reference;
  const warp = grain.warp * reference;
  const bend = grain.bend * reference;
  const fibre = grain.fibre * reference;
  const run = grain.run * reference;
  const engrave = recipe.engrave * reference;
  const texture = grain.texture * reference;
  const patchAlong = grain.patch.along * reference;
  const patchAcross = grain.patch.across * reference;

  const glyphs = recipe.weight ? neighbourhood(ink, recipe.weight, true) : ink;
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 2);

  const light = hex(colours.light);
  const mid = hex(colours.mid);
  const dark = hex(colours.dark);
  const deep = hex(colours.deep);
  const char = hex(colours.char);
  const ember = hex(colours.scorch);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const flat = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        colour.set([...mid, 255], pixel * 4);
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.wood,
          metalness: 0,
        });
        continue;
      }

      const point = position.subarray(pixel * 3, pixel * 3 + 3);
      const a = dot(point, along);
      const u = dot(point, across);
      const v = dot(point, depthwise);

      /* ---- The rings: how far across them this point sits, bent. ---- */

      const bent =
        u +
        (valueNoise3(a / (4 * bend), u / bend, v / bend, 223) - 0.5) * 2 * warp;
      // Each ring its own width and darkness, darkening slowly through the
      // year's growth and ending sharply where the next one starts; fading
      // in and out along its length.
      const fibres = valueNoise3(bent / fibre, a / run, v / fibre, 233);
      const phase = bent / period + (fibres - 0.5) * grain.feather;
      const year = Math.floor(phase);
      const within = phase - year;
      const width =
        grain.width[0] + (grain.width[1] - grain.width[0]) * hash(year, 1, 227);
      const fade = valueNoise3(a / (5 * period), v / (2 * period), year, 229);
      const stripe =
        (0.65 + 0.35 * hash(year, 2, 227)) *
        (0.7 + 0.3 * fade) *
        smoothstep(0, width * 0.25, within) *
        (1 - smoothstep(width - grain.edge, width, within));
      const tone = valueNoise3(
        a / (6 * period),
        u / (2 * period),
        v / (2 * period),
        231,
      );
      // Broad darker patches, long down the grain, under the stripes.
      const patchNoise =
        0.65 *
          valueNoise3(a / patchAlong, u / patchAcross, v / patchAcross, 243) +
        0.35 *
          valueNoise3(
            (2 * a) / patchAlong,
            (2 * u) / patchAcross,
            (2 * v) / patchAcross,
            247,
          );
      const patch =
        grain.patch.strength *
        smoothstep(grain.patch.from, grain.patch.to, patchNoise);
      const pore =
        glyphs[pixel] < 0.5 && hash(x, y, 239) < grain.pores
          ? 0.15 + 0.2 * hash(x, y, 241)
          : 0;

      /* ---- Colour: the wood, its stripes, then the burn. ---- */

      const wood = mix(
        mix(mix(light, mid, tone), deep, patch),
        dark,
        stripe,
      ).map((value) => value * (0.86 + 0.28 * fibres) * (1 - pore));

      const scorched = clamp(halo[pixel] - glyphs[pixel]) * 0.5;
      const burnt = mix(char, ember, valueNoise(x, y, 2, 251) * 0.6);
      const painted = mix(mix(wood, ember, scorched), burnt, glyphs[pixel]);

      colour.set(
        [...painted.map((value) => Math.round(clamp(value, 0, 255))), 255],
        pixel * 4,
      );

      /* ---- Surface: oiled wood, a touch smoother down the dense dark
         stripes, the burn dry and rough. ---- */

      const bed = finish.wood + (finish.stripe - finish.wood) * stripe;

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.45 * relief[pixel] - 0.4 * pore,
        roughness: bed + (finish.numerals - bed) * glyphs[pixel],
        metalness: 0,
      });

      height[pixel] =
        texture * fibres - 0.3 * texture * pore - engrave * relief[pixel];
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/**
 * Atlas pixel (x, y) on the die, by the face's triangle that holds it — a
 * face may be laid out in more than one island, each placed on its own.
 */
function atlasToDie({ triangles }, x, y) {
  let best = { inside: -Infinity };

  for (const { points, uvs } of triangles) {
    const [p0, p1, p2] = uvs.map(([u, v]) => [
      u * SIZE - 0.5,
      (1 - v) * SIZE - 0.5,
    ]);
    const span =
      (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (p1[1] - p0[1]);

    if (span === 0) {
      continue;
    }

    const w1 =
      ((x - p0[0]) * (p2[1] - p0[1]) - (p2[0] - p0[0]) * (y - p0[1])) / span;
    const w2 =
      ((p1[0] - p0[0]) * (y - p0[1]) - (x - p0[0]) * (p1[1] - p0[1])) / span;
    const weights = [1 - w1 - w2, w1, w2];
    const inside = Math.min(...weights);

    if (inside > best.inside) {
      best = { inside, points, weights };
    }
  }

  return [0, 1, 2].map((k) =>
    best.points.reduce(
      (sum, point, corner) => sum + point[k] * best.weights[corner],
      0,
    ),
  );
}

/**
 * Where on the atlas a point on a face lies, by the face's triangle that
 * holds it — `atlasToDie` the other way round.
 */
function dieToAtlas({ triangles, normal }, point) {
  let best = { inside: -Infinity };

  for (const { points, uvs } of triangles) {
    const [a, b, c] = points;
    const whole = dot(cross(sub(b, a), sub(c, a)), normal);
    const weights = [
      dot(cross(sub(b, point), sub(c, point)), normal) / whole,
      dot(cross(sub(c, point), sub(a, point)), normal) / whole,
      dot(cross(sub(a, point), sub(b, point)), normal) / whole,
    ];
    const inside = Math.min(...weights);

    if (inside > best.inside) {
      best = { inside, uvs, weights };
    }
  }

  const [u, v] = [0, 1].map((k) =>
    best.uvs.reduce((sum, uv, corner) => sum + uv[k] * best.weights[corner], 0),
  );

  return [u * SIZE - 0.5, (1 - v) * SIZE - 0.5];
}

/**
 * Pixels joined to `start` through `member`, four ways round — returned as
 * a fresh array, `label`led with `index` as they are found.
 */
function floodFrom(start, member, label, index, queue) {
  let head = 0;
  let tail = 0;

  queue[tail++] = start;
  label[start] = index;

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % SIZE;

    for (const next of [
      x > 0 ? pixel - 1 : -1,
      x < SIZE - 1 ? pixel + 1 : -1,
      pixel - SIZE,
      pixel + SIZE,
    ]) {
      if (next >= 0 && next < SIZE * SIZE && label[next] < 0 && member(next)) {
        label[next] = index;
        queue[tail++] = next;
      }
    }
  }

  return Array.from(queue.subarray(0, tail));
}

/**
 * The numerals as separate marks: each face's ink thickened by `join` pixels
 * so a number's digits hold together, then split wherever it still falls
 * apart — one mark on most faces, three on a d4's. Each knows its face, its
 * middle in the atlas and on the die, and how far its ink reaches from there.
 */
function numeralMarks({ ink, owner, position, faces }, join) {
  const joined = neighbourhood(ink, join, true);
  const label = new Int32Array(SIZE * SIZE).fill(-1);
  const queue = new Int32Array(SIZE * SIZE);
  const marks = [];

  for (let start = 0; start < SIZE * SIZE; start++) {
    const face = owner[start];

    if (label[start] >= 0 || face < 0 || joined[start] < 0.5) {
      continue;
    }

    const pixels = floodFrom(
      start,
      (next) => owner[next] === face && joined[next] >= 0.5,
      label,
      marks.length,
      queue,
    ).filter((pixel) => ink[pixel] > 0.5);

    if (pixels.length === 0) {
      continue;
    }

    const xs = pixels.map((pixel) => pixel % SIZE);
    const ys = pixels.map((pixel) => Math.floor(pixel / SIZE));
    const x = (Math.min(...xs) + Math.max(...xs)) / 2;
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const middle = atlasToDie(faces[face], x, y);

    marks.push({
      face,
      pixels,
      x,
      y,
      middle,
      reach: Math.max(
        ...pixels.map((pixel) =>
          length(sub(position.subarray(pixel * 3, pixel * 3 + 3), middle)),
        ),
      ),
    });
  }

  return marks;
}

/**
 * The face a die reads as `value` when it lands on top, off the collider
 * dice-box reads its results from.
 */
function faceOfValue(scene, faces, die, value) {
  const collider = scene.meshes.find((mesh) => mesh.name === `${die}_collider`);
  const [index] = Object.entries(scene.colliderFaceMap[die]).find(
    ([, reads]) => reads === value,
  );
  const point = (corner) => {
    const at = collider.indices[index * 3 + corner] * 3;

    return collider.positions.slice(at, at + 3);
  };
  const [a, b, c] = [0, 1, 2].map(point);
  let up = normalise(cross(sub(b, a), sub(c, a)));

  if (dot(up, a) < 0) {
    up = up.map((value) => -value);
  }

  // By where each face sits, not its normal: the meshes wind either way.
  const facing = (face) => dot(normalise(face.centre), up);

  return faces.reduce(
    (best, face, at) =>
      face.die === die && (best < 0 || facing(face) > facing(faces[best]))
        ? at
        : best,
    -1,
  );
}

/**
 * Which way is up for a two-digit mark, in atlas pixels: across from the
 * first digit to the second — told apart because only a 0 has a hole — and
 * turned a quarter back.
 */
function markUp({ pixels }) {
  const inked = new Set(pixels);
  const label = new Int32Array(SIZE * SIZE).fill(-1);
  const queue = new Int32Array(SIZE * SIZE);
  const digits = [];

  for (const start of pixels) {
    if (label[start] < 0) {
      digits.push(
        floodFrom(
          start,
          (next) => inked.has(next),
          label,
          digits.length,
          queue,
        ),
      );
    }
  }

  const [first, second] = digits.sort((a, b) => b.length - a.length);
  const holed = (digit) => {
    const own = new Set(digit);
    const xs = digit.map((pixel) => pixel % SIZE);
    const ys = digit.map((pixel) => Math.floor(pixel / SIZE));
    const [left, right] = [Math.min(...xs) - 1, Math.max(...xs) + 1];
    const [top, bottom] = [Math.min(...ys) - 1, Math.max(...ys) + 1];
    const outside = new Int32Array(SIZE * SIZE).fill(-1);
    const within = (pixel) => {
      const x = pixel % SIZE;
      const y = Math.floor(pixel / SIZE);

      return x >= left && x <= right && y >= top && y <= bottom;
    };
    const reached = floodFrom(
      top * SIZE + left,
      (next) => within(next) && !own.has(next),
      outside,
      0,
      queue,
    ).length;

    return (right - left + 1) * (bottom - top + 1) - own.size - reached > 4;
  };
  const middle = (digit) => [
    digit.reduce((sum, pixel) => sum + (pixel % SIZE), 0) / digit.length,
    digit.reduce((sum, pixel) => sum + Math.floor(pixel / SIZE), 0) /
      digit.length,
  ];

  if (!second || holed(first) === holed(second)) {
    throw new Error(
      "Expected a two-digit numeral with one 0 in it: the dice atlas has changed.",
    );
  }

  const [from, to] = holed(first) ? [second, first] : [first, second];
  const [ax, ay] = middle(from);
  const [bx, by] = middle(to);
  const span = Math.hypot(bx - ax, by - ay);

  return [(by - ay) / span, -(bx - ax) / span];
}

/**
 * How much of a pixel a heart covers: one `size` pixels tall, standing on
 * `up`, centred on (cx, cy). Sampled four by four across the pixel.
 */
function heartAt(x, y, { cx, cy, up, size }) {
  let covered = 0;

  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const dx = x + (sx + 0.5) / 4 - 0.5 - cx;
      const dy = y + (sy + 0.5) / 4 - 0.5 - cy;
      const across = (dx * -up[1] + dy * up[0]) / (size / 2.25);
      const along = (dx * up[0] + dy * up[1]) / (size / 2.25) + 0.12;
      const ring = across * across + along * along - 1;

      covered += ring * ring * ring - across * across * along ** 3 <= 0 ? 1 : 0;
    }
  }

  return covered / 16;
}

/** Where a point lies against a die's edge: how far along it, and how far off it. */
function offEdge(point, { from, direction }) {
  const relative = sub(point, from.apex);
  const along = dot(relative, direction);

  return {
    along,
    across: length(relative.map((value, k) => value - direction[k] * along)),
  };
}

/**
 * Every face's edges, each with its middle, and each die's own unit: the
 * median distance from a face's middle to its edges. Measured off the edges
 * themselves rather than a face's outline, which on two of the d20's faces
 * runs through the middle of the face.
 */
function faceFrames(faces) {
  const edges = dieEdges(dieCorners(faces)).map((edge) => ({
    ...edge,
    middle: edge.from.apex.map(
      (value, k) => value + edge.direction[k] * (edge.length / 2),
    ),
  }));
  const bordering = faces.map((_, face) =>
    edges.filter((edge) => edge.faces.includes(face)),
  );
  const inradius = faces.map(({ centre }, face) =>
    Math.min(...bordering[face].map((edge) => offEdge(centre, edge).across)),
  );
  const unit = Object.fromEntries(
    [...new Set(faces.map(({ die }) => die))].map((die) => {
      const own = inradius
        .filter((_, face) => faces[face].die === die)
        .sort((a, b) => a - b);

      return [die, own[own.length >> 1]];
    }),
  );

  return { bordering, unit };
}

/**
 * A die after the companion of a certain testing facility: slate panels held
 * by chunky white plastic, with light in the PLAYER'S colour running through
 * channels between them.
 *
 *   corners   a white piece on every corner, an arm down each edge meeting
 *             there — a three-armed corner on a d6, a five-pointed star on a
 *             d20 — straddling the edge so it wraps onto both faces and over
 *             the bevel, raised on a chamfer
 *   bars      a ribbed white bar across the middle of every edge
 *   discs     a raised cream disc where each face's numeral sits, and the
 *             numeral shrunk to fit it — a d4's three each get their own,
 *             and a blank one marks the middle of the face
 *   channels  sunk lines from each face's middle to the middle of each of its
 *             edges, so they run on under the bars to the next face's disc,
 *             and a ring round every disc — left TRANSPARENT, with the
 *             numerals, so the body colour fills them
 *   heart     in place of the 20 on the d20, in the same colour
 *
 * Sizes across a face are fractions of that die's face inradius, so every
 * die is built to the same proportions; lengths along an edge are shares of
 * it.
 */
function paintCompanion(recipe, base, scene) {
  const { ink, owner, density, position, faces, dice } = base;
  const { relief, colours, finish } = recipe;
  // Each die's arms, bars and discs: the recipe's, as that die overrides them.
  const cut = Object.fromEntries(
    [...new Set(dice)].map((die) => [
      die,
      Object.fromEntries(
        ["arm", "bar", "disc"].map((part) => [
          part,
          { ...recipe[part], ...recipe.dice[die]?.[part] },
        ]),
      ),
    ]),
  );

  const { bordering, unit } = faceFrames(faces);

  /* ---- The discs: one per numeral, and one in the middle of any face whose
     numerals sit elsewhere. ---- */

  const hearted = faceOfValue(scene, faces, "d20", 20);
  const marks = numeralMarks(base, recipe.join);
  const discs = faces.map(() => []);
  const count = faces.map(
    (_, face) => marks.filter((mark) => mark.face === face).length,
  );

  for (const mark of marks) {
    const size = unit[dice[mark.face]];
    const { disc } = cut[dice[mark.face]];
    // A face's only numeral is its middle's, wherever the stock dice put
    // it: the disc goes to the middle, and the numeral is moved into it.
    const alone = count[mark.face] === 1;
    const central =
      alone ||
      length(sub(mark.middle, faces[mark.face].centre)) < disc.central * size;
    const centre = alone ? faces[mark.face].centre : mark.middle;
    const [tx, ty] = alone
      ? dieToAtlas(faces[mark.face], centre)
      : [mark.x, mark.y];

    discs[mark.face].push({
      ...mark,
      centre,
      tx,
      ty,
      radius: (central ? disc.radius : disc.corner) * size,
      heart: mark.face === hearted && {
        cx: tx,
        cy: ty,
        up: markUp(mark),
      },
    });
  }

  faces.forEach(({ centre, die }, face) => {
    const { disc } = cut[die];

    if (
      !discs[face].some(
        (one) => length(sub(one.centre, centre)) < disc.central * unit[die],
      )
    ) {
      discs[face].push({ centre, radius: disc.hub * unit[die] });
    }
  });

  // Every numeral of a die shrunk alike, to the tightest disc it has to fit.
  const scale = Object.fromEntries(
    Object.keys(unit).map((die) => [
      die,
      Math.min(
        1,
        ...faces.flatMap((face, at) =>
          face.die !== die
            ? []
            : discs[at]
                .filter((one) => one.pixels && !one.heart)
                .map(
                  (one) =>
                    (one.radius - cut[die].disc.margin * unit[die]) / one.reach,
                ),
        ),
      ),
    ]),
  );

  /* ---- Per pixel: what covers it, and how deep inside that it is. ---- */

  const piece = new Float32Array(SIZE * SIZE);
  const plate = new Float32Array(SIZE * SIZE);
  const channel = new Float32Array(SIZE * SIZE);
  const fitted = new Float32Array(SIZE * SIZE);
  const heart = new Float32Array(SIZE * SIZE);
  const height = new Float32Array(SIZE * SIZE);
  const wall = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const die = dice[face];
    const size = unit[die];
    const { arm, bar, disc } = cut[die];
    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const soft = 0.75 / density[pixel];
    const inside = (value) => smoothstep(-soft, soft, value);
    const x = pixel % SIZE;
    const y = Math.floor(pixel / SIZE);

    const armWidth = arm.width * size;
    const barWidth = bar.width * size;
    const lineHalf = recipe.line * size;
    const ring = disc.ring * size;
    const gap = disc.gap * size;

    let pieceDepth = -Infinity;
    let barDepth = -Infinity;
    let barAcross = 0;
    let armRise = 0;
    let channelDepth = -Infinity;

    for (const edge of bordering[face]) {
      const { along, across } = offEdge(point, edge);
      const reach = arm.reach * edge.length;

      for (const fromCorner of [along, edge.length - along]) {
        const width = armWidth * (1 - arm.taper * clamp(fromCorner / reach));
        const onArm = Math.min(width - across, reach - fromCorner);

        if (onArm > pieceDepth) {
          pieceDepth = onArm;
          armRise = width - across;
        }
      }

      const onBar = Math.min(
        barWidth - across,
        (bar.reach * edge.length) / 2 - Math.abs(along - edge.length / 2),
      );

      if (onBar > barDepth) {
        barDepth = onBar;
        barAcross = across;
      }

      // The channel from the face's middle to this edge's.
      const run = sub(edge.middle, faces[face].centre);
      const t = clamp(dot(sub(point, faces[face].centre), run) / dot(run, run));
      const off = length(
        sub(
          point,
          faces[face].centre.map((value, k) => value + run[k] * t),
        ),
      );

      channelDepth = Math.max(channelDepth, lineHalf - off);
    }

    const onBar = barDepth > pieceDepth;

    pieceDepth = Math.max(pieceDepth, barDepth);

    let plateDepth = -Infinity;
    let own = null;

    for (const one of discs[face]) {
      const r = length(sub(point, one.centre));

      if (one.radius - r > plateDepth) {
        plateDepth = one.radius - r;
        own = one;
      }

      pieceDepth = Math.min(pieceDepth, r - one.radius - gap);
      channelDepth = Math.max(
        channelDepth,
        ring / 2 - Math.abs(r - one.radius - ring / 2),
      );
    }

    piece[pixel] = inside(pieceDepth);
    plate[pixel] = inside(plateDepth);
    channel[pixel] = inside(channelDepth);
    wall[pixel] =
      channel[pixel] *
      (1 - plate[pixel]) *
      (1 - smoothstep(0, relief.wall * size, channelDepth));

    /* ---- What is on the disc: the numeral, shrunk, or the heart — in the
       island of the atlas the numeral was laid out in, and no other. ---- */

    const marked =
      own?.pixels &&
      plateDepth > -soft &&
      Math.hypot(x - own.tx, y - own.ty) <=
        1.1 * (own.radius + soft) * density[pixel];

    if (marked && own.heart) {
      heart[pixel] = heartAt(x, y, {
        ...own.heart,
        size: 2 * recipe.heart * own.radius * density[pixel],
      });
    } else if (marked) {
      const from = scale[die];
      const sx = own.x + (x - own.tx) / from;
      const sy = own.y + (y - own.ty) / from;
      const landing =
        clamp(Math.round(sy), 0, SIZE - 1) * SIZE +
        clamp(Math.round(sx), 0, SIZE - 1);

      fitted[pixel] = owner[landing] === face ? sample(ink, sx, sy) : 0;
    }

    /* ---- Relief: chamfered pieces, ribbed bars, the disc, the channels. ---- */

    const bevel = relief.bevel * size;
    const top = smoothstep(0, bevel, pieceDepth);
    let raised = relief.piece * size * top;

    if (onBar) {
      // Grooves along the bar, left out where they would be finer than the atlas.
      const pitch = (barWidth - bevel) / (bar.ribs + 0.5);
      const rib = barAcross / pitch;
      const nearest = Math.round(rib);

      raised -=
        relief.rib *
        size *
        top *
        (nearest >= 1 && nearest <= bar.ribs ? 1 : 0) *
        (1 - smoothstep(0.12, 0.32, Math.abs(rib - nearest))) *
        smoothstep(2, 4, pitch * density[pixel]);
    } else {
      // An arm rises to the edge it runs along, so a corner reads as a peak.
      raised += relief.ridge * armRise * top;
    }

    const sunk =
      -relief.channel * size * smoothstep(0, relief.wall * size, channelDepth);
    const disced =
      relief.disc * size * smoothstep(0, relief.wall * size, plateDepth);

    height[pixel] =
      sunk +
      (disced - sunk) * plate[pixel] +
      (raised - (sunk + (disced - sunk) * plate[pixel])) * piece[pixel];
  }

  const glyphs = neighbourhood(fitted, recipe.weight, true);
  const lift = piece.map((p, pixel) => p + 0.4 * plate[pixel] * (1 - p));
  const cast = neighbourhood(lift, recipe.shadow);

  const white = hex(colours.white);
  const slate = hex(colours.slate);
  const cream = hex(colours.disc);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0) {
      continue;
    }

    const x = pixel % SIZE;
    const y = Math.floor(pixel / SIZE);
    const p = piece[pixel];
    const d = plate[pixel];
    const mark = Math.max(glyphs[pixel], heart[pixel]);
    const shade = clamp(cast[pixel] - lift[pixel]);
    const tone = 0.985 + 0.03 * valueNoise(x, y, 24, 277);

    const wWhite = p;
    const wCream = (1 - p) * d * (1 - mark);
    const wSlate = (1 - p) * (1 - d) * (1 - channel[pixel]);
    const show = 1 - wWhite - wCream - wSlate;
    const alpha = 1 - show;

    for (let k = 0; k < 3; k++) {
      const premultiplied =
        white[k] * tone * wWhite +
        cream[k] * tone * wCream +
        slate[k] * tone * (1 - 0.6 * shade) * wSlate;

      colour[pixel * 4 + k] =
        alpha > 0 ? Math.round(clamp(premultiplied / alpha, 0, 255)) : 0;
    }

    colour[pixel * 4 + 3] = Math.round(255 * alpha);

    writeSurface(surface, pixel, {
      occlusion: 1 - 0.7 * shade * (1 - p) - 0.45 * wall[pixel] * (1 - p),
      roughness:
        finish.white * wWhite +
        finish.disc * wCream +
        finish.slate * wSlate +
        finish.glow * show,
      metalness: 0,
    });
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      // The pieces stand right up to a face's edge: carried over the gutter,
      // their height ends there rather than dropping off a cliff into it.
      { data: height, channels: 1 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  const flat = new Float32Array(SIZE * SIZE);

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals(
      { height, tiltX: flat, tiltY: flat },
      base,
      Boolean(recipe.parallax),
    ),
  };
}

/**
 * The cuts that chip a crystal's corners. Every corner is cut back to a small
 * uneven pyramid: a point on each edge leaving it, a random way along, and
 * the tip sunk into the die; each face meeting there loses the triangle
 * between its two points and the corner, re-cut as a plane through those
 * points and the sunk tip. Neighbouring faces share the point on the edge
 * between them, so their facets meet in a ridge, as they would on a stone.
 */
function chipPlanes(faces, { run, sink, keep }) {
  const corners = dieCorners(faces);
  const edges = dieEdges(corners);
  const outward = faces.map(({ normal, centre }) =>
    dot(normal, centre) < 0 ? normal.map((value) => -value) : normal,
  );
  const spread = ([low, high], roll) => low + (high - low) * roll;
  const planes = [];

  corners.forEach((corner, at) => {
    if (hash(at, 1, 307) > keep) {
      return;
    }

    const leaving = edges.filter(
      (edge) => edge.from === corner || edge.to === corner,
    );
    const reach = new Map(
      leaving.map((edge) => {
        const away =
          edge.from === corner
            ? edge.direction
            : edge.direction.map((value) => -value);
        const along =
          edge.length * spread(run, hash(at, edges.indexOf(edge), 311));

        return [
          edge,
          {
            along,
            point: corner.apex.map((value, k) => value + away[k] * along),
          },
        ];
      }),
    );
    const mean =
      [...reach.values()].reduce((sum, { along }) => sum + along, 0) /
      reach.size;
    const tip = corner.apex.map(
      (value, k) =>
        value - corner.out[k] * mean * spread(sink, hash(at, 2, 307)),
    );

    for (const face of corner.faces) {
      const [first, second] = leaving
        .filter((edge) => edge.faces.includes(face))
        .map((edge) => reach.get(edge).point);

      if (!second) {
        continue;
      }

      let normal = normalise(cross(sub(first, tip), sub(second, tip)));

      if (dot(normal, outward[face]) < 0) {
        normal = normal.map((value) => -value);
      }

      planes.push({
        face,
        normal,
        offset: dot(normal, first),
        shade: 2 * hash(at, face, 331) - 1,
      });
    }
  });

  return { planes, outward };
}

/**
 * A die cut from a polished crystal in the PLAYER'S colour — opaque, glassy
 * and lettered in gold leaf.
 *
 *   surface   mirror-smooth under a clear coat, reflecting the room more
 *             strongly than any other skin (`environment` in the recipe), so
 *             what makes it crystal is what it reflects
 *   chips     every face knapped into flat facets of its own, leaning out
 *             a little and every way at random, and every corner cut back
 *             to an uneven pyramid on top — see `chipPlanes` — all carved
 *             into the normal map at full strength,
 *             so each facet catches the light as a plane of its own, with a
 *             touch of tone apiece so they show where nothing lights them
 *   depth     the colour taken a little darker, most towards each face's
 *             edge, so it sits in the stone rather than on it
 *   numerals  engraved and filled with gold leaf, on a dark foot
 */
function paintCrystal(recipe, base) {
  const { ink, reference, owner, position, faces, tangents } = base;
  const { finish, knap } = recipe;

  const { planes, outward } = chipPlanes(faces, recipe.chips);
  // Each face is cut by its own corners' facets alone.
  const cutting = faces.map((_, face) =>
    planes.flatMap((plane, index) => (plane.face === face ? [index] : [])),
  );
  const across = faces.map((_, face) => cross(outward[face], tangents[face]));

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 2);

  const gold = hex(recipe.metal);
  const engrave = recipe.engrave * reference;

  // How far each face reaches from its middle: what its chips are sized by.
  const reach = new Float32Array(faces.length);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face >= 0) {
      reach[face] = Math.max(
        reach[face],
        length(
          sub(position.subarray(pixel * 3, pixel * 3 + 3), faces[face].centre),
        ),
      );
    }
  }

  const height = new Float32Array(SIZE * SIZE);
  const tone = new Float32Array(SIZE * SIZE);

  /* ---- The chipped surface: every face knapped into flat facets, the
     corners cut back on top. ---- */

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const up = outward[face];
    const relative = sub(point, faces[face].centre);
    const along = dot(relative, tangents[face]);
    const beside = dot(relative, across[face]);

    // Facets tangent to a shallow dome over the face, each one a seed's own
    // plane turned a little at random: the lowest of them is the surface, so
    // the face breaks into flat chips round the seeds, leaning outward. The
    // seeds' grid is turned its own way on every face, so no two line up.
    const cell = knap.cell * reach[face];
    const curve = knap.dome / (2 * reach[face]);
    const salt = face * 7919;
    const turn = hash(face, 0, salt) * Math.PI;
    const u = along * Math.cos(turn) + beside * Math.sin(turn);
    const v = beside * Math.cos(turn) - along * Math.sin(turn);
    const column = Math.floor(u / cell);
    const row = Math.floor(v / cell);
    let surface = Infinity;
    let shade = 0;

    for (let i = column - 2; i <= column + 2; i++) {
      for (let j = row - 2; j <= row + 2; j++) {
        const su = (i + hash(i, j, salt + 1)) * cell;
        const sv = (j + hash(i, j, salt + 2)) * cell;
        const gu =
          -2 * curve * su + (hash(i, j, salt + 3) - 0.5) * 2 * knap.tilt;
        const gv =
          -2 * curve * sv + (hash(i, j, salt + 4) - 0.5) * 2 * knap.tilt;
        const lift =
          (hash(i, j, salt + 5) - 0.5) * knap.lift * cell * knap.tilt;
        const plane =
          -curve * (su * su + sv * sv) + gu * (u - su) + gv * (v - sv) + lift;

        if (plane < surface) {
          surface = plane;
          shade = 2 * hash(i, j, salt + 6) - 1;
        }
      }
    }

    // A corner's cut taken off whatever facet it lands on: still flat.
    let deepest = 0;

    for (const index of cutting[face]) {
      const { normal, offset } = planes[index];
      const facing = dot(normal, up);

      if (facing > 0.1) {
        const cut = (dot(normal, point) - offset) / facing;

        if (cut > deepest) {
          deepest = cut;
          shade = planes[index].shade;
        }
      }
    }

    height[pixel] = surface - deepest - engrave * relief[pixel];
    tone[pixel] = shade;
  }

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.glass,
          metalness: 0,
        });
        continue;
      }

      const face = owner[pixel];
      const shade = tone[pixel];
      // A stone's colour is deepest where the light has furthest to go.
      const out =
        length(
          sub(position.subarray(pixel * 3, pixel * 3 + 3), faces[face].centre),
        ) / reach[face];

      const paint = layers();
      const over = paint.over;

      over(
        [0, 0, 0],
        recipe.depth.body + recipe.depth.edge * smoothstep(0.25, 1, out),
      );
      over(
        shade > 0 ? [255, 255, 255] : [0, 0, 0],
        Math.abs(shade) * recipe.facets,
      );
      over([0, 0, 0], clamp(halo[pixel] - glyphs[pixel]) * 0.5);

      const leaf = 0.82 + 0.3 * valueNoise(x, y, 2, 287);

      over(
        gold.map((c) => clamp(c * leaf, 0, 255)),
        glyphs[pixel],
      );
      paint.write(colour, pixel);

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.4 * clamp(halo[pixel] - glyphs[pixel]),
        roughness:
          finish.glass +
          (finish.numerals + 0.2 * (leaf - 0.82) - finish.glass) *
            glyphs[pixel],
        // Gold leaf only part metal, so it stays gold in a dark room.
        metalness: recipe.gilt * glyphs[pixel],
      });
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      // The cuts run right over a face's edge: carried over the gutter, they
      // end there rather than at a cliff.
      { data: height, channels: 1 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  const flat = new Float32Array(SIZE * SIZE);

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/** `valueNoise3` summed over octaves, each twice as fine and half as strong. */
function fbm3(x, y, z, octaves, salt) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let weight = 0;

  for (let octave = 0; octave < octaves; octave++) {
    total +=
      amplitude *
      valueNoise3(
        x * frequency,
        y * frequency,
        z * frequency,
        salt + 17 * octave,
      );
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }

  return total / weight;
}

/**
 * A field over the faces, in [0, 1), read as SHARES of the dice by area: what
 * share of every face lies below each value. A ramp laid over shares covers
 * the dice in the proportions it names, whatever the noise happens to do.
 */
function areaShares(field, { owner, density }) {
  const BINS = 4096;
  const histogram = new Float64Array(BINS);
  let area = 0;

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0) {
      continue;
    }

    const weight = 1 / density[pixel] ** 2;

    histogram[Math.floor(field[pixel] * BINS)] += weight;
    area += weight;
  }

  const below = new Float64Array(BINS);

  for (let bin = 1; bin < BINS; bin++) {
    below[bin] = below[bin - 1] + histogram[bin - 1];
  }

  return (value) => {
    const bin = Math.floor(value * BINS);

    return (below[bin] + histogram[bin] * (value * BINS - bin)) / area;
  };
}

/** A colour for each share, eased between `stops` — `[share, rgb]`, in order. */
function rampThrough(stops) {
  return (share) => {
    let at = 1;

    while (at < stops.length - 1 && share > stops[at][0]) {
      at++;
    }

    const [from, low] = stops[at - 1];
    const [to, high] = stops[at];

    return mix(low, high, smoothstep(from, to, share));
  };
}

/** A direction of its own for each die, and the die's reach from its middle. */
function dieAxes(faces, salt) {
  const names = [...new Set(faces.map(({ die }) => die))];
  const corners = dieCorners(faces);

  return Object.fromEntries(
    names.map((die, index) => {
      const axis = normalise([1, 2, 3].map((k) => hash(index, k, salt) - 0.5));
      const side = normalise(
        cross(axis, Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]),
      );

      return [
        die,
        {
          axis,
          side,
          up: cross(axis, side),
          radius: Math.max(
            ...corners
              .filter((corner) => corner.die === die)
              .map(({ apex }) => length(apex)),
          ),
        },
      ];
    }),
  );
}

/** Smooth vortices fold pigment into long ribbons through the die. */
function pearlFlow(u, v, w, flow) {
  for (const { centre, radius, turns } of flow.vortices) {
    const cx = centre[0] + Math.sin(w * 0.8) * 0.3;
    const cy = centre[1] + Math.cos(w * 0.6) * 0.3;
    const dx = u - cx;
    const dy = v - cy;
    const angle = turns * Math.exp(-(dx * dx + dy * dy) / (radius * radius));
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    u = cx + dx * c - dy * s;
    v = cy + dx * s + dy * c;
  }

  const warped =
    u +
    w * flow.drift +
    (fbm3(u * 0.7, v * 0.7, w * 0.7, 2, 733) - 0.5) * flow.warp;
  const phase = fbm3(
    warped * flow.frequency * 1.8,
    v * flow.frequency * 0.4,
    w * flow.frequency * 0.7,
    3,
    757,
  );

  return { phase, u, v, w };
}

function paintPearl(recipe, base) {
  const { ink, reference, owner, position, faces, dice } = base;
  const { flow, ribbon, finish } = recipe;
  const axes = dieAxes(faces, 739);
  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const numerals = hex(recipe.numerals);
  const scale = flow.scale * reference;
  const engrave = recipe.engrave * reference;
  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const lean = new Float32Array(SIZE * SIZE * 3);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const { side, up, axis } = axes[dice[face]];
    const qx = dot(point, side) / scale;
    const qy = dot(point, up) / scale;
    const qz = dot(point, axis) / scale;
    const { phase, u, v, w } = pearlFlow(qx, qy, qz, flow);
    const fold = smoothstep(0.25, 0.75, phase);
    const pearl = smoothstep(0.1, 0.85, fold);
    const shoulder =
      Math.exp(-(((fold - 0.65) / 0.22) ** 2)) *
      (0.6 + 0.4 * valueNoise3(u * 0.6, v * 0.6, w * 0.6, 743));
    const silk = valueNoise3(phase * 40, v * 0.65, w * 0.65, 751);
    const light =
      pearl * ribbon.light +
      shoulder * ribbon.sheen +
      pearl * silk * ribbon.silk;
    const paint = layers();

    paint.over([0, 0, 0], ribbon.shadow * (1 - fold) ** 1.5);
    paint.over([255, 255, 255], light);
    paint.over(numerals, glyphs[pixel]);
    paint.write(colour, pixel);

    const roughness = finish.resin + (finish.pearl - finish.resin) * pearl;

    writeSurface(surface, pixel, {
      occlusion: 1,
      roughness: roughness + (finish.numerals - roughness) * glyphs[pixel],
      metalness: pearl * finish.metal * (1 - glyphs[pixel]),
    });

    height[pixel] = -engrave * relief[pixel];

    const tilt = ribbon.tilt * (2 * fold - 1) * pearl * (1 - glyphs[pixel]);

    for (let k = 0; k < 3; k++) {
      lean[pixel * 3 + k] =
        (side[k] * Math.cos(phase * Math.PI * 2) + up[k] * Math.sin(u)) * tilt;
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, ...leanToTilt(lean, base) }, base),
  };
}

/**
 * Acrylic swirled from the PLAYER'S colour into a darker shade of it, the way
 * cheap pearlescent dice are poured, with gold-inked numerals.
 *
 *   fade      the darker shade taken over each die from one side to the
 *             other, along a direction of its own, but not evenly: the line
 *             between the two is pushed about by warped noise THROUGH THE
 *             DIE, so it runs on round the edges, and frayed by finer noise
 *             so it breaks into specks either side
 *   sheen     pale streaks of mica along the swirl
 *   glitter   a fine dust of flecks, each tilted to flash on its own
 *   numerals  engraved and inked in gold
 */
function paintFade(recipe, base) {
  const { ink, reference, owner, position } = base;
  const { swirl, fade, sheen, fleck, finish } = recipe;

  const axes = dieAxes(base.faces, 337);
  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const gold = hex(recipe.metal);
  const glitter = fleck.colors.map(hex);
  const scale = swirl.scale * reference;
  const grain = fade.grain * reference;
  const engrave = recipe.engrave * reference;

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      const face = owner[pixel];

      if (face < 0) {
        continue;
      }

      const [px, py, pz] = position.subarray(pixel * 3, pixel * 3 + 3);
      const { axis, radius } = axes[base.dice[face]];
      const qx = px / scale;
      const qy = py / scale;
      const qz = pz / scale;

      /* ---- Where the dark half reaches. ---- */

      const wx = qx + (fbm3(qx, qy, qz, 3, 341) - 0.5) * 2 * swirl.warp;
      const wy = qy + (fbm3(qx + 5.2, qy, qz, 3, 347) - 0.5) * 2 * swirl.warp;
      const wz = qz + (fbm3(qx, qy + 9.1, qz, 3, 349) - 0.5) * 2 * swirl.warp;
      const swirled = fbm3(wx, wy, wz, 4, 353);
      const across = (px * axis[0] + py * axis[1] + pz * axis[2]) / radius;
      const frayed =
        across * fade.slope +
        (swirled - 0.5) * fade.noise +
        (valueNoise3(px / grain, py / grain, pz / grain, 359) - 0.5) *
          fade.fray;
      const dark = smoothstep(-fade.edge, fade.edge, frayed);
      const streak =
        1 -
        smoothstep(
          0,
          sheen.width,
          Math.abs(fbm3(wx * 1.7, wy * 1.7, wz * 1.7, 3, 367) - 0.5),
        );

      /* ---- Colour, bottom to top. ---- */

      const paint = layers();

      paint.over([0, 0, 0], dark * fade.depth);
      paint.over([255, 255, 255], streak * sheen.strength);

      const fleckHere = fleckAt(x, y, fleck.density) && glyphs[pixel] < 0.5;

      if (fleckHere) {
        paint.over(
          glitter[Math.floor(hash(x >> 1, y >> 1, 181) * glitter.length)],
          0.25 + 0.35 * hash(x >> 1, y >> 1, 13),
        );
      }

      paint.over(gold, glyphs[pixel]);
      paint.write(colour, pixel);

      /* ---- Surface: glossy acrylic, foil glitter, satin gold. ---- */

      const bed = fleckHere
        ? { roughness: finish.fleck, metalness: 1 }
        : { roughness: finish.acrylic, metalness: 0 };

      writeSurface(surface, pixel, {
        occlusion: 1,
        roughness:
          bed.roughness + (finish.numerals - bed.roughness) * glyphs[pixel],
        metalness:
          bed.metalness + (recipe.gilt - bed.metalness) * glyphs[pixel],
      });

      height[pixel] = -engrave * relief[pixel];

      if (fleckHere) {
        tiltX[pixel] = (hash(x >> 1, y >> 1, 19) - 0.5) * 1.1;
        tiltY[pixel] = (hash(x >> 1, y >> 1, 23) - 0.5) * 1.1;
      }
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * A spiral galaxy cast in resin, in the PLAYER'S colour, lettered in copper.
 *
 * Each die holds one galaxy, a disc tilted its own way through its middle,
 * and every face shows it as seen THROUGH that face: a ray goes in from each
 * pixel and gathers the light of everything it passes — the spiral's arms
 * wound round a bright core, clouds of dust through them and a faint haze
 * beyond. A face looking down on the disc shows the spiral; one beside it, a
 * bright band. What it gathers decides the paint:
 *
 *   space     the body colour taken nearly to black where little is seen
 *   nebula    the colour itself where the arms and clouds are
 *   core      lightening towards white where they are brightest
 *   stars     pinpricks of light, and larger glittering stars that flash
 *   numerals  engraved and filled with copper
 */
function paintGalaxy(recipe, base) {
  const { ink, reference, owner, position, faces } = base;
  const { galaxy, fleck, finish } = recipe;

  const axes = dieAxes(faces, 373);
  const outward = faces.map(({ normal, centre }) =>
    dot(normal, centre) < 0 ? normal.map((value) => -value) : normal,
  );
  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 2);
  const copper = hex(recipe.metal);
  const engrave = recipe.engrave * reference;

  // How much light a point inside a die gives off, in units of its reach.
  const glow = ({ axis, side, up, radius }, point) => {
    const height = dot(point, axis) / radius;
    const u = dot(point, side) / radius;
    const v = dot(point, up) / radius;
    const r = Math.hypot(u, v);
    const angle = Math.atan2(v, u);
    const winding = angle - galaxy.twist * Math.log(r + 0.05);
    const arms =
      0.5 +
      0.5 *
        Math.cos(
          galaxy.arms * winding +
            4 * (fbm3(u * 3, v * 3, height * 3, 2, 379) - 0.5),
        );
    const disc =
      Math.exp(-((height / galaxy.thickness) ** 2)) *
      Math.exp(-((r / galaxy.size) ** 2));
    const dust = fbm3(
      point[0] / (galaxy.cloud * radius),
      point[1] / (galaxy.cloud * radius),
      point[2] / (galaxy.cloud * radius),
      4,
      383,
    );
    const core = Math.exp(
      -((r / galaxy.core) ** 2) - (height / (galaxy.core * 0.8)) ** 2,
    );

    return (
      disc * (0.12 + 0.88 * arms ** 4) * (0.3 + 1.4 * dust) +
      galaxy.haze * dust ** 2 +
      galaxy.bright * core
    );
  };

  /* ---- What every pixel sees of its die's galaxy. ---- */

  const gathered = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const frame = axes[base.dice[face]];
    const step = (2 * frame.radius) / galaxy.steps;
    let clear = 1;

    for (let k = 0; k < galaxy.steps && clear > 0.02; k++) {
      const inside = point.map(
        (value, axis) => value - outward[face][axis] * (k + 0.5) * step,
      );

      if (length(inside) > frame.radius) {
        break;
      }

      const lit = glow(frame, inside) * (step / frame.radius);

      gathered[pixel] += clear * lit;
      clear *= Math.exp(-galaxy.absorb * lit);
    }
  }

  // Each die measured against itself: a d4's faces lie so near its middle
  // that every ray crosses the core, and it would otherwise burn white.
  const typical = Object.fromEntries(
    Object.keys(axes).map((die) => {
      const own = [];

      for (let pixel = 0; pixel < SIZE * SIZE; pixel += 7) {
        if (owner[pixel] >= 0 && base.dice[owner[pixel]] === die) {
          own.push(gathered[pixel]);
        }
      }

      own.sort((p, q) => p - q);

      return [die, own[own.length >> 1] || 1];
    }),
  );

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      const face = owner[pixel];

      if (face < 0) {
        continue;
      }

      const seen =
        1 -
        Math.exp(
          -galaxy.gain *
            (gathered[pixel] / typical[base.dice[face]]) ** galaxy.contrast,
        );

      /* ---- Colour, bottom to top. ---- */

      const paint = layers();

      paint.over(
        [0, 0, 0],
        recipe.space * (1 - smoothstep(0, galaxy.nebula, seen)),
      );
      paint.over(
        [255, 255, 255],
        smoothstep(galaxy.nebula, 1, seen) * recipe.core,
      );

      const dust = glyphs[pixel] < 0.5 && hash(x, y, 389) < recipe.dust;

      if (dust) {
        paint.over([255, 255, 255], 0.25 + 0.4 * hash(x, y, 397));
      }

      const star = fleckAt(x, y, fleck.density) && glyphs[pixel] < 0.5;

      if (star) {
        paint.over([255, 255, 255], 0.6 + 0.4 * hash(x >> 1, y >> 1, 13));
      }

      paint.over([0, 0, 0], clamp(halo[pixel] - glyphs[pixel]) * 0.4);

      const sheen = 0.88 + 0.2 * valueNoise(x, y, 3, 401);

      paint.over(
        copper.map((c) => clamp(c * sheen, 0, 255)),
        glyphs[pixel],
      );
      paint.write(colour, pixel);

      /* ---- Surface: resin, glitter stars, copper. ---- */

      const bed = star
        ? { roughness: finish.fleck, metalness: 1 }
        : { roughness: finish.resin, metalness: 0 };

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.3 * clamp(halo[pixel] - glyphs[pixel]),
        roughness:
          bed.roughness + (finish.numerals - bed.roughness) * glyphs[pixel],
        metalness:
          bed.metalness + (recipe.gilt - bed.metalness) * glyphs[pixel],
      });

      height[pixel] = -engrave * relief[pixel];

      if (star) {
        tiltX[pixel] = (hash(x >> 1, y >> 1, 19) - 0.5) * 1.1;
        tiltY[pixel] = (hash(x >> 1, y >> 1, 23) - 0.5) * 1.1;
      }
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * Black plastic carved in relief, the raised work painted in the PLAYER'S
 * colour — the ornate sets sold as "gothic" or "Victorian".
 *
 *   border    a wide black margin along every edge, the base the rest stands
 *             on
 *   panel     the face inside it raised a little and painted, a black line
 *             cut round its rim
 *   filigree  scrollwork cut through the paint to the black: the contours of
 *             a noise folded round the face's middle, as many times as the
 *             face has sides, so it is symmetrical the way a pattern drawn for
 *             that face would be, and the same on every face of a die
 *   discs     a black disc sunk for each numeral, ringed in paint and a cut
 *             line, the numeral raised in paint on it — shrunk to fit
 */
function paintOrnate(recipe, base) {
  const { ink, owner, density, position, faces, tangents, dice } = base;
  const { panel, filigree, disc, relief, colours, finish } = recipe;

  const { bordering, unit } = faceFrames(faces);
  const outward = faces.map(({ normal, centre }) =>
    dot(normal, centre) < 0 ? normal.map((value) => -value) : normal,
  );

  /* ---- Each face's numeral discs, and how far each die's numerals shrink to
     fit them. ---- */

  const discs = faces.map(() => []);

  for (const mark of numeralMarks(base, recipe.join)) {
    const size = unit[dice[mark.face]];
    const central =
      length(sub(mark.middle, faces[mark.face].centre)) < 0.5 * size;

    discs[mark.face].push({
      ...mark,
      radius: (central ? disc.radius : disc.corner) * size,
    });
  }

  const scale = Object.fromEntries(
    Object.keys(unit).map((die) => [
      die,
      Math.min(
        1,
        ...discs.flatMap((own, face) =>
          dice[face] !== die
            ? []
            : own.map(
                (one) => (one.radius - disc.margin * unit[die]) / one.reach,
              ),
        ),
      ),
    ]),
  );

  // Where each face's symmetry starts: towards its first corner.
  const corners = dieCorners(faces);
  const start = faces.map(({ centre }, face) => {
    const corner = corners.find((one) => one.faces.has(face));
    const toward = sub(corner.apex, centre);
    const across = cross(outward[face], tangents[face]);

    return Math.atan2(dot(toward, across), dot(toward, tangents[face]));
  });

  const raised = new Float32Array(SIZE * SIZE);
  const fitted = new Float32Array(SIZE * SIZE);
  const height = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      continue;
    }

    const die = dice[face];
    const size = unit[die];
    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const soft = 0.75 / density[pixel];
    const inside = (value) => smoothstep(-soft, soft, value);
    const x = pixel % SIZE;
    const y = Math.floor(pixel / SIZE);

    const edge = Math.min(
      ...bordering[face].map((one) => offEdge(point, one).across),
    );
    const margin = panel.border * size;
    const rim = margin + panel.inset * size;

    /* ---- The discs. ---- */

    let own = null;
    let fromDisc = Infinity;

    for (const one of discs[face]) {
      const r = length(sub(point, one.middle)) - one.radius;

      if (r < fromDisc) {
        fromDisc = r;
        own = one;
      }
    }

    /* ---- The filigree, folded round the face's middle. ---- */

    const relative = sub(point, faces[face].centre);
    const across = cross(outward[face], tangents[face]);
    const a = dot(relative, tangents[face]) / size;
    const b = dot(relative, across) / size;
    const sector = (2 * Math.PI) / bordering[face].length;
    let angle = Math.atan2(b, a) - start[face];

    angle -= Math.floor(angle / sector) * sector;
    angle = Math.min(angle, sector - angle);

    const r = Math.hypot(a, b);
    const fold = (fa, fb) =>
      fbm3(
        fa / filigree.scale,
        fb / filigree.scale,
        dice.indexOf(die) * 7.3,
        3,
        409,
      ) * filigree.bands;
    const fa = r * Math.cos(angle);
    const fb = r * Math.sin(angle);
    const contour = fold(fa, fb);
    const step = 0.01;
    const slope =
      Math.hypot(fold(fa + step, fb) - contour, fold(fa, fb + step) - contour) /
      step;
    const offLine =
      (Math.abs(contour - Math.floor(contour) - 0.5) / Math.max(slope, 1e-3)) *
      size;

    /* ---- What stands proud: the panel, less every cut through it. ---- */

    const inPanel = inside(edge - margin);
    const rimLine = 1 - inside(Math.abs(edge - rim) - (panel.line * size) / 2);
    const clearOfRim = inside(
      edge - rim - panel.line * size - filigree.clear * size,
    );
    const clearOfDisc = inside(
      fromDisc - disc.ring * size - filigree.clear * size,
    );
    const scroll =
      (1 - inside(offLine - (filigree.width * size) / 2)) *
      clearOfRim *
      clearOfDisc;
    const ringLine =
      1 -
      inside(Math.abs(fromDisc - disc.ring * size) - (panel.line * size) / 2);
    const sunk = 1 - inside(fromDisc);

    /* ---- The numeral on its disc, shrunk to fit. ---- */

    if (own && fromDisc < soft) {
      const from = scale[die];
      const sx = own.x + (x - own.x) / from;
      const sy = own.y + (y - own.y) / from;
      const landing =
        clamp(Math.round(sy), 0, SIZE - 1) * SIZE +
        clamp(Math.round(sx), 0, SIZE - 1);

      fitted[pixel] = owner[landing] === face ? sample(ink, sx, sy) : 0;
    }

    raised[pixel] = clamp(
      inPanel * (1 - rimLine) * (1 - scroll) * (1 - ringLine) * (1 - sunk),
    );
  }

  const glyphs = neighbourhood(fitted, recipe.weight, true);
  const proud = Float32Array.from(raised, (value, pixel) =>
    Math.max(value, glyphs[pixel]),
  );
  const lifted = neighbourhood(proud, 1);
  const shade = neighbourhood(proud, 2);
  const black = hex(colours.black);
  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0) {
      colour.set([...black, 255], pixel * 4);
      writeSurface(surface, pixel, {
        occlusion: 1,
        roughness: finish.black,
        metalness: 0,
      });
      continue;
    }

    const p = proud[pixel];
    const size = unit[dice[owner[pixel]]];
    // The paint wears thin where it meets the black, as the real ones do.
    const worn = clamp(shade[pixel] - p, 0, 1);
    const paint = layers();

    paint.over(black, 1 - p);
    paint.over([0, 0, 0], p * (1 - lifted[pixel]) * relief.wash);
    paint.write(colour, pixel);

    writeSurface(surface, pixel, {
      occlusion: 1 - 0.5 * worn,
      roughness: finish.black + (finish.paint - finish.black) * p,
      metalness: 0,
    });

    height[pixel] = relief.height * size * lifted[pixel];
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: height, channels: 1 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  const flat = new Float32Array(SIZE * SIZE);

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/**
 * Glass in the PLAYER'S colour: see-through, polished, a little misted and
 * lightly scratched from use, with frosted white numerals.
 *
 * The see-through itself is the material's — `opacity` in the recipe, read by
 * the vendored dice-box — so what is painted here is only what sits ON the
 * glass, and the numerals, which are not glass and stay solid:
 *
 *   mist       a milky fog over all of it, thicker in drifts that come and go
 *              across the die, duller where it lies — enough that the far
 *              side reads as the far side
 *   scratches  hairlines at every angle, some long and some broken short,
 *              pale and rough and cut a fraction into the surface
 *   numerals   frosted white, engraved
 */
function paintGlass(recipe, base) {
  const { ink, reference, owner, density, position } = base;
  const { mist, scratch, finish } = recipe;

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const frost = hex(recipe.numerals);
  const cloud = mist.size * reference;
  const pieces = scratch.length * reference;
  const engrave = recipe.engrave * reference;
  const lines = creasePlanes(scratch.count, 2.5 * reference, 419);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const flat = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    const face = owner[pixel];

    if (face < 0) {
      writeSurface(surface, pixel, {
        occlusion: 1,
        roughness: finish.glass,
        metalness: 0,
      });
      continue;
    }

    const point = position.subarray(pixel * 3, pixel * 3 + 3);
    const [px, py, pz] = point;
    const soft = 0.75 / density[pixel];

    // Milky all over, and more so in drifts.
    const haze =
      mist.base +
      mist.strength *
        smoothstep(
          0.35,
          0.85,
          fbm3(px / cloud, py / cloud, pz / cloud, 4, 421),
        );

    let scored = 0;

    for (const { normal, offset } of lines) {
      const off = Math.abs(dot(point, normal) - offset);

      if (off < 2 * soft) {
        const piece = valueNoise3(
          px / pieces + offset * 131,
          py / pieces,
          pz / pieces,
          431,
        );

        scored = Math.max(
          scored,
          (1 - smoothstep(0, 2 * soft, off)) * smoothstep(0.5, 0.65, piece),
        );
      }
    }

    scored *= 1 - glyphs[pixel];

    const paint = layers();

    paint.over([255, 255, 255], haze);
    paint.over([255, 255, 255], scored * scratch.strength);
    paint.over(frost, glyphs[pixel]);
    paint.write(colour, pixel);

    writeSurface(surface, pixel, {
      occlusion: 1,
      roughness:
        finish.glass +
        (finish.mist - finish.glass) * (haze / (mist.base + mist.strength)) +
        (finish.scratch - finish.glass) * scored +
        (finish.numerals - finish.glass) * glyphs[pixel],
      metalness: 0,
    });

    height[pixel] =
      -engrave * relief[pixel] - scratch.depth * reference * scored;
  }

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/**
 * Case-hardened steel: the mottle quenching leaves in the metal's skin, mostly
 * blue with islands of gold ringed in violet where the two meet. Its own
 * colours whatever the player's — like the wood, every pixel is opaque.
 *
 *   mottle    warped noise THROUGH THE DIE, so the patches run on round its
 *             edges. Read as a SHARE of the steel by area rather than as a
 *             value: the lowest `blue` of it is blue, so the dice come out
 *             that blue whatever the noise happens to do
 *   ramp      deep blue in the hollows, lightening towards a patch's edge,
 *             a violet and magenta fringe, bronze, then gold up to pale straw
 *   breakup   clouds of darker and lighter blue, amber blotches in the gold,
 *             and specks of blue scattered through both
 *   numerals  engraved and filled black
 */
function paintCaseHardened(recipe, base) {
  const { ink, reference, owner, position } = base;
  const { blue, fringe, mottle, cloud, spots, colours, finish } = recipe;

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 3);

  const scale = mottle.scale * reference;
  const cloudScale = cloud.scale * reference;
  const speckScale = spots.scale * reference;
  const engrave = recipe.engrave * reference;
  const grain = recipe.grain * reference;
  const paint = Object.fromEntries(
    Object.entries(colours).map(([name, value]) => [name, hex(value)]),
  );

  /* ---- The mottle everywhere first, and how much steel lies below each
     value of it. ---- */

  const field = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0) {
      continue;
    }

    const qx = position[pixel * 3] / scale;
    const qy = position[pixel * 3 + 1] / scale;
    const qz = position[pixel * 3 + 2] / scale;
    const wx = qx + (fbm3(qx, qy, qz, 3, 401) - 0.5) * 2 * mottle.warp;
    const wy = qy + (fbm3(qx + 5.2, qy, qz, 3, 409) - 0.5) * 2 * mottle.warp;
    const wz = qz + (fbm3(qx, qy + 9.1, qz, 3, 419) - 0.5) * 2 * mottle.warp;

    field[pixel] = clamp(fbm3(wx, wy, wz, mottle.octaves, 421), 0, 1 - 1e-9);
  }

  const shareOf = areaShares(field, base);
  const ramp = rampThrough([
    [0, paint.deep],
    [blue * 0.6, paint.blue],
    [blue - fringe * 1.5, paint.sky],
    [blue - fringe * 0.4, paint.violet],
    [blue + fringe * 0.2, paint.magenta],
    [blue + fringe * 0.8, paint.bronze],
    [blue + fringe * 1.8, paint.gold],
    [1, paint.straw],
  ]);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const flat = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        colour.set([...paint.blue, 255], pixel * 4);
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.steel,
          metalness: recipe.metal,
        });
        continue;
      }

      const [px, py, pz] = position.subarray(pixel * 3, pixel * 3 + 3);
      const share = shareOf(field[pixel]);

      /* ---- The ramp, then what breaks it up. ---- */

      const inBlue = 1 - smoothstep(blue - fringe * 2, blue - fringe, share);
      const inGold = smoothstep(blue + fringe, blue + fringe * 2, share);
      const clouds = fbm3(
        px / cloudScale,
        py / cloudScale,
        pz / cloudScale,
        3,
        431,
      );
      const speck = smoothstep(
        0.66,
        0.76,
        valueNoise3(px / speckScale, py / speckScale, pz / speckScale, 433),
      );

      let steel = ramp(share);

      steel = mix(
        steel,
        paint.deep,
        inBlue * cloud.dark * smoothstep(0.52, 0.72, clouds),
      );
      steel = mix(
        steel,
        paint.sky,
        inBlue * cloud.light * smoothstep(0.52, 0.72, 1 - clouds),
      );
      steel = mix(
        steel,
        paint.amber,
        inGold * 0.7 * smoothstep(0.55, 0.75, clouds),
      );
      steel = mix(
        steel,
        inBlue > 0.5 ? paint.deep : paint.blue,
        speck * spots.strength,
      );

      const sheen = 0.92 + 0.16 * valueNoise(x, y, 3, 439);
      const darkened = clamp(halo[pixel] - glyphs[pixel]) * 0.6;
      const painted = mix(
        mix(
          steel.map((value) => value * sheen),
          [0, 0, 0],
          darkened,
        ),
        paint.numerals,
        glyphs[pixel],
      );

      colour.set(
        [...painted.map((value) => Math.round(clamp(value, 0, 255))), 255],
        pixel * 4,
      );

      /* ---- Surface: hard, satin steel, a little uneven; the black fill
         matte and no metal at all. ---- */

      const rough = finish.steel + 0.1 * (valueNoise(x, y, 5, 443) - 0.5);

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.5 * darkened,
        roughness: rough + (finish.numerals - rough) * glyphs[pixel],
        metalness: recipe.metal * (1 - glyphs[pixel]),
      });

      height[pixel] =
        grain * valueNoise(x, y, 2, 449) - engrave * relief[pixel];
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
  };
}

/**
 * A lean given in die units across each face — how far a surface's normal
 * leans, as a vector in the face's plane — as the tilt `surfaceNormals`
 * takes, in the atlas: each face's own way across, read off the positions
 * either side of each pixel.
 */
function leanToTilt(lean, { owner, position, density }) {
  const tiltX = new Float32Array(SIZE * SIZE);
  const tiltY = new Float32Array(SIZE * SIZE);
  const step = (pixel, back, ahead) => {
    const from = back >= 0 && owner[back] === owner[pixel] ? back : pixel;
    const to = ahead >= 0 && owner[ahead] === owner[pixel] ? ahead : pixel;
    const steps = (from !== pixel) + (to !== pixel);

    return [0, 1, 2].map((k) =>
      steps ? (position[to * 3 + k] - position[from * 3 + k]) / steps : 0,
    );
  };

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;

      if (owner[pixel] < 0) {
        continue;
      }

      const tilt = lean.subarray(pixel * 3, pixel * 3 + 3);
      const right = step(
        pixel,
        x > 0 ? pixel - 1 : -1,
        x < SIZE - 1 ? pixel + 1 : -1,
      );
      const down = step(
        pixel,
        y > 0 ? pixel - SIZE : -1,
        y < SIZE - 1 ? pixel + SIZE : -1,
      );

      tiltX[pixel] = density[pixel] * dot(tilt, right);
      tiltY[pixel] = density[pixel] * dot(tilt, down);
    }
  }

  return { tiltX, tiltY };
}

/**
 * What runs through each die of labradorite: its two sets of lamellae — the
 * thin planes inside it that catch the light — each leaning off one of its
 * faces, never the same face or opposite ones; the directions its hairline
 * cleavages cross it in; and the frame its grain is laid out in, the first
 * cleavage and two ways across it.
 */
function lamellaeOf(faces, outward, { lean }, { count }) {
  const names = [...new Set(faces.map(({ die }) => die))];
  const nudge = (index, salt) =>
    [1, 2, 3].map((k) => 2 * hash(index, k, salt) - 1);

  return Object.fromEntries(
    names.map((die, index) => {
      const own = faces.flatMap((face, at) => (face.die === die ? [at] : []));
      const first = own[Math.floor(hash(index, 0, 461) * own.length)];
      const open = own.filter(
        (at) => Math.abs(dot(outward[at], outward[first])) < 0.9,
      );
      const second = open[Math.floor(hash(index, 1, 461) * open.length)];
      const cleavages = Array.from({ length: count }, (_, k) =>
        normalise(nudge(index, 467 + k)),
      );
      const [along] = cleavages;
      const side = normalise(
        cross(along, Math.abs(along[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]),
      );

      return [
        die,
        {
          sets: [first, second].map((face, k) => {
            const tilt = nudge(index, 463 + k);

            return normalise(
              outward[face].map((value, j) => value + lean * tilt[j]),
            );
          }),
          cleavages,
          grain: [along, side, cross(along, side)],
        },
      ];
    }),
  );
}

/**
 * How much of a hairline crack lies at `point`: planes across the die along
 * `direction`, about `spacing` apart, each `width` wide and softened by `half`
 * more to the atlas, each at a strength of its own and broken off along its
 * length where noise `broken` across says so. Sizes in die units.
 */
function hairlineAt(point, direction, salt, { spacing, width, broken }, half) {
  const across = dot(point, direction) / spacing;
  const cell = Math.floor(across);
  let gap = Infinity;
  let line = cell;

  for (let k = cell - 1; k <= cell + 1; k++) {
    const offset = Math.abs(across - k - 0.15 - 0.7 * hash(k, 1, salt));

    if (offset < gap) {
      gap = offset;
      line = k;
    }
  }

  const drawn = 1 - smoothstep(width / 2, width / 2 + half, gap * spacing);

  if (drawn === 0) {
    return 0;
  }

  const run = valueNoise3(
    point[0] / broken,
    point[1] / broken,
    point[2] / broken + line * 7.31,
    salt + 1,
  );

  return (
    drawn * (0.35 + 0.65 * hash(line, 2, salt)) * smoothstep(0.35, 0.6, run)
  );
}

/**
 * Polished labradorite, in its own colours whatever the player's — every
 * pixel is opaque — lettered in gold leaf.
 *
 *   stone      grey with green in it, clouded lighter and darker, misted pale
 *              here and there, and mottled darker where it is flecked
 *   schiller   the flash, over most of the stone in broad, soft washes,
 *              brightest on a face that looks along the lamellae and never
 *              quite gone from one that does not. The lamellae lean one way in
 *              part of each die and another in the rest — see `lamellaeOf` —
 *              and turn from one to the other gradually, so nothing in the
 *              flash ends at a line
 *   hue        read as a SHARE of the dice, like the case-hardened steel's
 *              mottle, and eased through the colours a thin film gives:
 *              violet, then blue, sky and teal, which are most of it, into
 *              green, gold and orange
 *   silk       a soft grain through the flash, brighter and duller along it
 *   hairlines  fine cleavages crossing every face, a few ways at once, broken
 *              off here and there and cut a little into the surface
 *   numerals   engraved and filled with gold leaf, on a dark foot
 *
 * The flash's normal in the normal map is the LAMELLAE's, leaning off the
 * face's, so it brightens and dims at an angle of its own as the die turns —
 * with a little metal in it, for a sheen in its own colour — while the clear
 * coat over it keeps the face's own normal and stays a polished face.
 */
function paintLabradorite(recipe, base) {
  const { ink, reference, owner, position, density, faces, dice } = base;
  const { lamellae, schiller, silk, hairlines, mottle, hue, stone, finish } =
    recipe;

  const outward = faces.map(({ normal, centre }) =>
    dot(normal, centre) < 0 ? normal.map((value) => -value) : normal,
  );
  const dies = lamellaeOf(faces, outward, lamellae, hairlines);

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 2);

  const gold = hex(recipe.metal);
  const dark = hex(stone.dark);
  const light = hex(stone.light);
  const haze = hex(stone.haze);
  const fleck = hex(mottle.colour);
  const crack = hex(hairlines.colour);
  const engrave = recipe.engrave * reference;
  const lamellaScale = lamellae.scale * reference;
  const patchScale = schiller.scale * reference;
  const hueScale = hue.scale * reference;
  const stoneScale = stone.scale * reference;
  const mottleScale = mottle.scale * reference;
  const speckScale = mottle.specks * reference;
  const cracks = {
    spacing: hairlines.spacing * reference,
    width: hairlines.width * reference,
    broken: hairlines.broken * reference,
  };

  const ramp = rampThrough(
    hue.stops.map(([share, value]) => [share, hex(value)]),
  );

  /* ---- The hue everywhere first, so it can be read as a share. ---- */

  const hues = new Float32Array(SIZE * SIZE);

  for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
    if (owner[pixel] < 0) {
      continue;
    }

    const qx = position[pixel * 3] / hueScale;
    const qy = position[pixel * 3 + 1] / hueScale;
    const qz = position[pixel * 3 + 2] / hueScale;
    const wx = qx + (fbm3(qx, qy, qz, 2, 491) - 0.5) * 2 * hue.warp;
    const wy = qy + (fbm3(qx + 5.2, qy, qz, 2, 499) - 0.5) * 2 * hue.warp;

    hues[pixel] = clamp(fbm3(wx, wy, qz, 3, 503), 0, 1 - 1e-9);
  }

  const shareOf = areaShares(hues, base);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  // How far the lamellae lean off each face, in die units across it.
  const lean = new Float32Array(SIZE * SIZE * 3);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      const face = owner[pixel];

      if (face < 0) {
        colour.set([...mix(dark, light, 0.5), 255], pixel * 4);
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.stone,
          metalness: 0,
        });
        continue;
      }

      const point = position.subarray(pixel * 3, pixel * 3 + 3);
      const [px, py, pz] = point;
      const up = outward[face];
      const { sets, cleavages, grain } = dies[dice[face]];

      /* ---- The lamellae here, turning gradually from one set to the
         other. ---- */

      const lx = px / lamellaScale;
      const ly = py / lamellaScale;
      const lz = pz / lamellaScale;
      const turn = smoothstep(
        lamellae.blend[0],
        lamellae.blend[1],
        fbm3(lx, ly, lz, 3, 509),
      );
      const [first, second] = sets.map((normal) =>
        dot(normal, up) < 0 ? normal.map((value) => -value) : normal,
      );
      const lamella = normalise(
        first.map(
          (value, k) =>
            value +
            (second[k] - value) * turn +
            (fbm3(lx + 3.1 * k, ly, lz + 1.7 * k, 2, 521) - 0.5) *
              2 *
              lamellae.waver,
        ),
      );
      const facing = dot(lamella, up);
      const aligned = smoothstep(schiller.from, schiller.to, facing);

      /* ---- How strongly it flashes. ---- */

      const sx = px / patchScale;
      const sy = py / patchScale;
      const sz = pz / patchScale;
      const patch = smoothstep(
        schiller.patch[0],
        schiller.patch[1],
        fbm3(
          sx + (fbm3(sx, sy, sz, 2, 523) - 0.5) * 2 * schiller.warp,
          sy + (fbm3(sx, sy + 9.1, sz, 2, 541) - 0.5) * 2 * schiller.warp,
          sz,
          4,
          547,
        ),
      );
      const flash = patch * (schiller.floor + (1 - schiller.floor) * aligned);
      const sheen =
        1 +
        silk.strength *
          (2 *
            valueNoise3(
              dot(point, grain[0]) / (silk.across * reference),
              dot(point, grain[1]) / (silk.along * reference),
              dot(point, grain[2]) / (silk.along * reference),
              557,
            ) -
            1);

      /* ---- What the stone holds besides. ---- */

      const mx = px / mottleScale;
      const my = py / mottleScale;
      const mz = pz / mottleScale;
      const mottled =
        mottle.strength *
        smoothstep(mottle.from, mottle.to, fbm3(mx, my, mz, 4, 571));
      const speck =
        mottled *
        smoothstep(
          0.68,
          0.78,
          valueNoise3(px / speckScale, py / speckScale, pz / speckScale, 577),
        );
      const half = 0.75 / density[pixel];
      const crackle = Math.max(
        ...cleavages.map((direction, k) =>
          hairlineAt(point, direction, 601 + 13 * k, cracks, half),
        ),
      );

      /* ---- Colour, bottom to top. ---- */

      const cx = px / stoneScale;
      const cy = py / stoneScale;
      const cz = pz / stoneScale;
      const tint = ramp(shareOf(hues[pixel])).map((value) =>
        clamp(value * sheen, 0, 255),
      );
      const paint = layers();

      paint.over(
        mix(dark, light, smoothstep(0.3, 0.7, fbm3(cx, cy, cz, 4, 563))),
        1,
      );
      paint.over(
        haze,
        stone.mist * smoothstep(0.55, 0.8, fbm3(cx + 4.4, cy, cz, 3, 569)),
      );
      paint.over(tint, schiller.strength * flash);
      // A paler heart where it flashes hardest.
      paint.over(
        mix(tint, [255, 255, 255], 0.3),
        schiller.glow * flash * aligned,
      );
      paint.over(fleck, mottled);
      paint.over([14, 16, 17], 0.85 * speck);
      paint.over(crack, hairlines.strength * crackle);
      paint.over([0, 0, 0], clamp(halo[pixel] - glyphs[pixel]) * 0.4);

      const leaf = 0.82 + 0.3 * valueNoise(x, y, 2, 587);

      paint.over(
        gold.map((c) => clamp(c * leaf, 0, 255)),
        glyphs[pixel],
      );
      paint.write(colour, pixel);

      /* ---- Surface: satin stone, a sheen of metal in the flash, satin
         gold. ---- */

      const shown = flash * (1 - mottled);
      const bed =
        finish.stone +
        (finish.flash - finish.stone) * shown +
        finish.cracks * crackle;

      writeSurface(surface, pixel, {
        occlusion: 1 - 0.4 * clamp(halo[pixel] - glyphs[pixel]),
        roughness:
          bed + (finish.numerals + 0.2 * (leaf - 0.82) - bed) * glyphs[pixel],
        metalness:
          recipe.sheen * shown +
          (recipe.gilt - recipe.sheen * shown) * glyphs[pixel],
      });

      height[pixel] =
        -engrave * relief[pixel] - hairlines.depth * reference * crackle;

      // Only as far as the flash shows: dull stone lies as the face does.
      const reach =
        Math.min(
          schiller.tilt,
          Math.sqrt(Math.max(0, 1 - facing * facing)) / Math.max(facing, 0.05),
        ) *
        patch *
        aligned *
        (1 - glyphs[pixel]);
      const sideways = normalise(
        lamella.map((value, k) => value - facing * up[k]),
      );

      lean.set(
        sideways.map((value) => value * reach),
        pixel * 3,
      );
    }
  }

  const { tiltX, tiltY } = leanToTilt(lean, base);

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * Overlapping scales, the dragon's own, each lacquered in one of TWO colours:
 * the player's, or the accent worked out from it — see lib/dice-accent.mjs.
 * Neither is painted. The colour map only shades the scales, transparent
 * over them so the body shows, and a fourth map, the ACCENT, says which
 * scales take the second colour; the vendored dice-box works that colour out
 * from the first, on the GPU.
 *
 *   scales    pointed, in rows down each face — the way `toward` leans, the
 *             same way on every face — each row offset half a scale and laid
 *             over the row below like tiles on a roof, so what shows of each
 *             is its lower half, tip down. A scale is a lens, two circles'
 *             overlap, `width` by `length`. It rises towards its tip and
 *             along a keel down its middle, and where it overhangs the scale
 *             beneath, that one sinks into its shadow
 *   patches   the accent comes in patches, by noise THROUGH THE DIE at each
 *             scale's middle, so a patch runs on round an edge, with a few
 *             strays
 *   numerals  raised in gold, standing over the scales
 */
function paintScales(recipe, base) {
  const { ink, reference, owner, position, density, faces } = base;
  const { scale, patch, finish } = recipe;

  const width = scale.width * reference;
  const long = scale.length * reference;
  const half = long / 2;
  const depth = scale.depth * reference;
  // The lens: the overlap of two circles, `radius` round, `apart` either side
  // of its middle, which leaves it `width` across and `long` from tip to tip.
  const reach = (long * long) / (2 * width);
  const radius = (width / 2 + reach) / 2;
  const apart = (reach - width / 2) / 2;
  const patchScale = patch.scale * reference;

  const toward = normalise(recipe.toward);
  const frames = faces.map(({ normal, centre }, face) => {
    let down = sub(
      toward,
      normal.map((value) => value * dot(toward, normal)),
    );

    // A face square to `toward` takes its rows from another way across.
    if (length(down) < 0.3) {
      const aside = normalise(cross(toward, [0, 0, 1]));

      down = sub(
        aside,
        normal.map((value) => value * dot(aside, normal)),
      );
    }

    down = normalise(down);

    return {
      centre,
      down,
      across: normalise(cross(normal, down)),
      shift: [hash(face, 1, 701) * width, hash(face, 2, 701) * long],
    };
  });

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  // Wide, so a numeral stands clear of a patch as golden as itself.
  const halo = neighbourhood(glyphs, 3);
  const gold = hex(recipe.metal);

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const accent = new Uint8Array(SIZE * SIZE);
  const height = new Float32Array(SIZE * SIZE);
  // The deepest each candidate row's nearest scale reaches over a pixel.
  const rows = new Float64Array(5);
  const columns = new Int32Array(5);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      const face = owner[pixel];

      if (face < 0) {
        colour.set([0, 0, 0, 160], pixel * 4);
        writeSurface(surface, pixel, {
          occlusion: 0.6,
          roughness: finish.scales,
          metalness: recipe.lacquer,
        });
        continue;
      }

      const { centre, down, across, shift } = frames[face];
      const rx = position[pixel * 3] - centre[0];
      const ry = position[pixel * 3 + 1] - centre[1];
      const rz = position[pixel * 3 + 2] - centre[2];
      const u = rx * across[0] + ry * across[1] + rz * across[2] + shift[0];
      const v = rx * down[0] + ry * down[1] + rz * down[2] + shift[1];

      /* ---- Which scale lies on top: the highest row reaching here. ---- */

      const row = Math.round(v / half);

      for (let k = 0; k < 5; k++) {
        const j = row - 2 + k;
        const offset = (j & 1) * (width / 2);
        const column = Math.round((u - offset) / width);

        rows[k] = -Infinity;

        for (let i = column - 1; i <= column + 1; i++) {
          const lx = u - (i * width + offset);
          const ly = v - j * half;
          const inside =
            radius -
            Math.max(Math.hypot(lx - apart, ly), Math.hypot(lx + apart, ly));

          if (inside > rows[k]) {
            rows[k] = inside;
            columns[k] = i;
          }
        }
      }

      const k = rows.findIndex((inside) => inside > 0);
      const j = row - 2 + Math.max(k, 0);
      const i = columns[Math.max(k, 0)];
      const offset = (j & 1) * (width / 2);
      const lx = u - (i * width + offset);
      const ly = v - j * half;
      const inside = k < 0 ? 0 : rows[k];
      let over = Infinity;

      for (let above = 0; above < k; above++) {
        over = Math.min(over, -rows[above]);
      }

      /* ---- Its shape: rising to the tip and along the keel, and sunk
         under the scale over it. ---- */

      const t = clamp((ly + half) / long);
      const keel = 1 - smoothstep(0, scale.keel * width, Math.abs(lx));
      const rise = smoothstep(0, scale.round * width, inside);
      // Nothing reaching here at all is a gap between scales: deep shadow.
      const shadow = k < 0 ? 1 : 1 - smoothstep(0, scale.shadow * width, over);
      const line = 1 - smoothstep(0, 1.2 / density[pixel], inside);

      height[pixel] = Math.max(
        depth *
          ((0.25 + 0.75 * t) * (0.75 + 0.25 * Math.sqrt(rise)) +
            scale.ridge * keel * t * rise -
            0.4 * shadow),
        depth * scale.numerals * relief[pixel],
      );

      /* ---- Which colour it takes: patches through the die, and strays. ---- */

      const cu = i * width + offset - shift[0];
      const cv = j * half - shift[1];
      const cx = (centre[0] + across[0] * cu + down[0] * cv) / patchScale;
      const cy = (centre[1] + across[1] * cu + down[1] * cv) / patchScale;
      const cz = (centre[2] + across[2] * cu + down[2] * cv) / patchScale;
      const second =
        fbm3(cx, cy, cz, 3, 709) > patch.from ||
        hash(i, j, face * 131 + 7) < patch.stray;

      accent[pixel] = second ? 255 : 0;

      /* ---- The shading over whichever colour it is. ---- */

      const tone = hash(i, j, face * 131 + 11) - 0.5;
      const paint = layers();

      paint.over([0, 0, 0], scale.shade * (1 - t) ** 1.5);
      paint.over(
        tone < 0 ? [0, 0, 0] : [255, 255, 255],
        Math.abs(tone) * scale.tone,
      );
      paint.over([255, 255, 255], scale.sheen * keel * t * t * rise);
      paint.over([0, 0, 0], clamp(0.92 * shadow + 0.7 * line));
      paint.over([0, 0, 0], clamp(2 * (halo[pixel] - glyphs[pixel])) * 0.9);
      paint.over(gold, glyphs[pixel]);
      paint.write(colour, pixel);

      writeSurface(surface, pixel, {
        occlusion:
          (1 - 0.6 * shadow) * (1 - glyphs[pixel]) +
          glyphs[pixel] -
          0.3 * clamp(halo[pixel] - glyphs[pixel]),
        roughness:
          (finish.scales + 0.1 * tone + 0.3 * shadow) * (1 - glyphs[pixel]) +
          finish.numerals * glyphs[pixel],
        metalness:
          recipe.lacquer * (1 - shadow) +
          (recipe.gilt - recipe.lacquer * (1 - shadow)) * glyphs[pixel],
      });
    }
  }

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
      { data: accent, channels: 1 },
    ],
    recipe.bleed,
  );

  const flat = new Float32Array(SIZE * SIZE);

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX: flat, tiltY: flat }, base),
    accent: encodePng(SIZE, SIZE, 1, accent),
  };
}

/**
 * The blood on a BLOODIED die, as blobs whose fields run together where they
 * meet — so a splash is one wet shape, not a cluster of dots. Every blob sits
 * on a face, its centre on the face\x27s plane, and reaches through the die, so
 * one near an edge spills over onto the face beside it.
 *
 *   splashes  where blood hit: a lumpy CORE of `blobs` overlapping, TENDRILS
 *             shot out from it and drawn thin, and DROPS flung further,
 *             radially, each drawn out the further it flew, like a teardrop
 *             along the way it went
 *   drops     single drops, here and there
 *   mist      a fine spray everywhere
 *
 * Counts are per square d20 face inradius of each face, sizes in d20 face
 * inradii. Each blob is its centre, its radius, the way it is drawn out and
 * how far; `near` finds the blobs reaching a point.
 */
function scatterBlood(faces, { splashes, drops, mist }, reference) {
  const blobs = [];
  let draw = 0;
  const roll = () => hash(draw++, 3, 811);
  const between = ([low, high]) => low + (high - low) * roll();
  const count = ([low, high]) => Math.round(between([low, high]));

  const pointOn = ({ triangles, area }) => {
    let pick = roll() * area;
    const { points } =
      triangles.find((triangle) => (pick -= triangle.area) <= 0) ??
      triangles.at(-1);
    const a = Math.sqrt(roll());
    const b = roll();

    return [0, 1, 2].map(
      (k) =>
        points[0][k] * (1 - a) +
        points[1][k] * a * (1 - b) +
        points[2][k] * a * b,
    );
  };
  const flat = (normal, way) =>
    normalise(
      sub(
        way,
        normal.map((value) => value * dot(way, normal)),
      ),
    );
  const aside = (normal) =>
    flat(normal, [roll() - 0.5, roll() - 0.5, roll() - 0.5]);
  const add = (centre, radius, along = [1, 0, 0], stretch = 1) =>
    blobs.push({ centre, radius, along, stretch });
  const many = (density, area) => {
    const expected = (density * area) / reference ** 2;

    return Math.floor(expected) + (roll() < expected % 1 ? 1 : 0);
  };
  const out = (centre, way, far) =>
    centre.map((value, k) => value + way[k] * far);

  for (const face of faces) {
    const area = face.triangles.reduce((sum, { area }) => sum + area, 0);
    const shape = { triangles: face.triangles, area };
    const { normal } = face;

    for (let n = many(splashes.density, area); n > 0; n--) {
      const centre = pointOn(shape);
      const size = between(splashes.radius) * reference;
      // The way the blood was going: most of the spray goes on that way.
      const thrown = aside(normal);

      for (let k = count(splashes.blobs); k > 0; k--) {
        add(
          out(centre, aside(normal), size * 0.55 * roll()),
          size * (0.45 + 0.55 * roll()),
        );
      }

      for (let k = count(splashes.tendrils); k > 0; k--) {
        const way = flat(
          normal,
          thrown.map((value) => value + 1.8 * (roll() - 0.5)),
        );
        const reach = size * between(splashes.length);

        // A tendril is a line of blobs thinning as it goes.
        for (let step = 1; step <= 4; step++) {
          const t = step / 4;

          add(
            out(centre, way, size * 0.6 + reach * t),
            size * 0.32 * (1 - 0.6 * t),
            way,
            1.8,
          );
        }
      }

      for (let k = count(splashes.drops); k > 0; k--) {
        const way = flat(
          normal,
          thrown.map((value) => value + 2.6 * (roll() - 0.5)),
        );
        const far = between(splashes.spread);

        add(
          out(centre, way, size * far),
          between(splashes.small) * reference * (1.2 - 0.25 * far),
          way,
          1 + splashes.stretch * (far / splashes.spread[1]),
        );
      }
    }

    for (let n = many(drops.density, area); n > 0; n--) {
      add(
        pointOn(shape),
        between(drops.radius) * reference,
        aside(normal),
        1 + 0.6 * roll(),
      );
    }

    for (let n = many(mist.density, area); n > 0; n--) {
      add(pointOn(shape), between(mist.radius) * reference);
    }
  }

  // A blob's field is spent by twice its reach.
  const cell = Math.max(
    ...blobs.map(({ radius, stretch }) => 2 * radius * stretch),
  );
  const grid = new Map();
  const key = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);

  blobs.forEach(({ centre, radius, stretch }, index) => {
    const reach = 2 * radius * stretch;
    const [lx, ly, lz] = centre.map((value) =>
      Math.floor((value - reach) / cell),
    );
    const [hx, hy, hz] = centre.map((value) =>
      Math.floor((value + reach) / cell),
    );

    for (let x = lx; x <= hx; x++) {
      for (let y = ly; y <= hy; y++) {
        for (let z = lz; z <= hz; z++) {
          const id = key(x, y, z);

          if (!grid.has(id)) {
            grid.set(id, []);
          }

          grid.get(id).push(index);
        }
      }
    }
  });

  return {
    blobs,
    near: (x, y, z) =>
      grid.get(
        key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell)),
      ) ?? [],
  };
}

/**
 * Battered silver spattered with blood in the PLAYER'S colour, lettered in
 * black enamel.
 *
 *   silver    opaque, a crackled mosaic of hammered facets — cellular noise
 *             THROUGH THE DIE, each facet a tone and a lean of its own in the
 *             normal map, split by dark hairline cracks — dented, scratched
 *             bright and dark, tarnished in patches and polished bright along
 *             the edges, where a die is handled
 *   blood     the blobs of `scatterBlood`, their fields summed so that
 *             where they meet they run together, ragged at the edge, and
 *             TRANSPARENT so the body colour fills them: wet and glossy,
 *             standing thickest where most has pooled, darker at the rim
 *             where it is thinnest over the silver
 *   numerals  engraved and filled with black enamel
 */
function paintBloodied(recipe, base) {
  const { ink, reference, owner, position, density, distance, faces } = base;
  const { facets, dents, scratches, wear, blood, finish } = recipe;

  const silver = hex(recipe.silver);
  const enamel = hex(recipe.numerals);
  const facetScale = facets.scale * reference;
  const crack = facets.crack / facets.scale;
  const dentScale = dents.scale * reference;
  const tarnishScale = wear.scale * reference;
  const edgeWear = wear.edge * reference;
  const pieces = scratches.pieces * reference;
  const engrave = recipe.engrave * reference;

  const glyphs = neighbourhood(ink, recipe.weight, true);
  const relief = neighbourhood(glyphs, 1);
  const halo = neighbourhood(glyphs, 2);
  const planes = creasePlanes(scratches.count, 3 * reference, 821);
  const { blobs, near } = scatterBlood(faces, blood, reference);
  const raggedScale = blood.ragged.scale * reference;

  const colour = new Uint8Array(SIZE * SIZE * 4);
  const surface = new Uint8Array(SIZE * SIZE * 3);
  const height = new Float32Array(SIZE * SIZE);
  const lean = new Float32Array(SIZE * SIZE * 3);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      const face = owner[pixel];

      if (face < 0) {
        colour.set(
          [...silver.map((c) => clamp(c * 1.08, 0, 255)), 255],
          pixel * 4,
        );
        writeSurface(surface, pixel, {
          occlusion: 1,
          roughness: finish.silver - 0.08,
          metalness: recipe.metal,
        });
        continue;
      }

      const point = position.subarray(pixel * 3, pixel * 3 + 3);
      const [px, py, pz] = point;
      const soft = 0.75 / density[pixel];
      const up = faces[face].normal;

      /* ---- The silver: facets, cracks, dents, scratches, wear. ---- */

      const facet = cellAt(px / facetScale, py / facetScale, pz / facetScale);
      const cracked = 1 - smoothstep(0, crack, facet.wall);
      const tilt = [31, 37, 41].map(
        (salt) => (facet.trait(salt) - 0.5) * 2 * facets.tilt,
      );
      const inPlane = sub(
        tilt,
        up.map((value) => value * dot(tilt, up)),
      );

      let scratch = 0;

      for (const { normal, offset, sign } of planes) {
        const off = Math.abs(dot(point, normal) - offset);

        if (off < 2 * soft) {
          const piece = valueNoise3(
            px / pieces + offset * 97,
            py / pieces,
            pz / pieces,
            823,
          );

          scratch +=
            sign *
            (1 - smoothstep(0, 2 * soft, off)) *
            smoothstep(0.55, 0.7, piece);
        }
      }

      const tarnish = smoothstep(
        0.45,
        0.75,
        fbm3(px / tarnishScale, py / tarnishScale, pz / tarnishScale, 3, 827),
      );
      const polish = 1 - smoothstep(0, edgeWear, distance[pixel]);
      const foot = clamp(halo[pixel] - glyphs[pixel]);
      const shine =
        (1 - facets.tone + 2 * facets.tone * facet.trait(43)) *
        (1 - facets.dark * cracked) *
        (1 - wear.tarnish * tarnish) *
        (1 + 0.12 * polish) *
        (1 + 0.25 * clamp(scratch, 0, 1) - 0.3 * clamp(-scratch, 0, 1)) *
        (1 - 0.45 * foot);
      const metal = silver.map((c) => clamp(c * shine, 0, 255));

      /* ---- The blood over it all. ---- */

      let field = 0;

      for (const index of near(px, py, pz)) {
        const { centre, radius, along, stretch } = blobs[index];
        const dx = px - centre[0];
        const dy = py - centre[1];
        const dz = pz - centre[2];
        const ahead = dx * along[0] + dy * along[1] + dz * along[2];
        const side = Math.max(0, dx * dx + dy * dy + dz * dz - ahead * ahead);
        const reach = ((ahead / stretch) ** 2 + side) / (radius * radius);

        if (reach < 4) {
          field += Math.exp(-1.4 * reach);
        }
      }

      field *=
        1 +
        blood.ragged.strength *
          (2 *
            valueNoise3(
              px / raggedScale,
              py / raggedScale,
              pz / raggedScale,
              831,
            ) -
            1);

      const edge = blood.threshold;
      const wet = smoothstep(edge - 0.04, edge + 0.04, field);
      const dome =
        blood.dome * reference * smoothstep(edge, edge + 1.5, field) ** 0.6;
      const rim = wet * (1 - smoothstep(edge, edge + 0.4, field));

      const paint = layers();

      paint.over(mix(metal, enamel, glyphs[pixel]), 1 - wet);
      paint.over([0, 0, 0], wet * blood.rim * rim);
      // The numerals still read through the blood filling them.
      paint.over(enamel, wet * blood.numerals * glyphs[pixel]);
      paint.write(colour, pixel);

      /* ---- Surface: worn silver, glossy enamel, wet blood. ---- */

      const roughSilver =
        finish.silver +
        0.5 * facets.dark * cracked +
        0.08 * (facet.trait(47) - 0.5) +
        0.1 * tarnish -
        0.1 * polish -
        0.1 * clamp(scratch, 0, 1);
      const dry = roughSilver + (finish.numerals - roughSilver) * glyphs[pixel];

      writeSurface(surface, pixel, {
        occlusion: (1 - facets.dark * cracked - 0.4 * foot) * (1 - wet) + wet,
        roughness: dry + (finish.blood - dry) * wet,
        metalness: recipe.metal * (1 - glyphs[pixel]) * (1 - wet),
      });

      height[pixel] =
        dents.depth *
          reference *
          fbm3(px / dentScale, py / dentScale, pz / dentScale, 3, 829) -
        engrave * relief[pixel] -
        0.002 * reference * Math.abs(scratch) +
        dome;

      // Each facet leans its own way; blood and enamel lie flat over it.
      const flat = Math.max(wet, glyphs[pixel]);

      lean.set(
        inPlane.map((value) => value * (1 - flat)),
        pixel * 3,
      );
    }
  }

  const { tiltX, tiltY } = leanToTilt(lean, base);

  bleed(
    owner,
    [
      { data: colour, channels: 4 },
      { data: surface, channels: 3 },
    ],
    recipe.bleed,
  );

  return {
    colour: encodePng(SIZE, SIZE, 4, colour),
    surface: encodePng(SIZE, SIZE, 3, surface),
    normal: surfaceNormals({ height, tiltX, tiltY }, base),
  };
}

/**
 * A normal map from a height field in die units, plus a tilt laid straight on
 * top for detail too fine to be a height. Faces only: bevels and gutters stay
 * flat. The stock atlas's convention, read off its own engraving: red is
 * −∂h/∂x and green −∂h/∂y, both in image space.
 *
 * With `parallax`, the height itself rides along in the alpha — 1 the
 * highest point of any face, 0 the lowest — for the vendored dice-box's
 * parallax occlusion, which looks into it as a die turns.
 */
function surfaceNormals(
  { height, tiltX, tiltY },
  { owner, density },
  parallax = false,
) {
  const channels = parallax ? 4 : 3;
  const normal = new Uint8Array(SIZE * SIZE * channels);
  let low = Infinity;
  let high = -Infinity;

  if (parallax) {
    for (let pixel = 0; pixel < SIZE * SIZE; pixel++) {
      if (owner[pixel] >= 0) {
        low = Math.min(low, height[pixel]);
        high = Math.max(high, height[pixel]);
      }
    }
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = y * SIZE + x;
      let nx = 0;
      let ny = 0;

      if (owner[pixel] >= 0) {
        const perUnit = density[pixel];
        const left = height[y * SIZE + Math.max(0, x - 1)];
        const right = height[y * SIZE + Math.min(SIZE - 1, x + 1)];
        const up = height[Math.max(0, y - 1) * SIZE + x];
        const down = height[Math.min(SIZE - 1, y + 1) * SIZE + x];

        nx = clamp((-(right - left) / 2) * perUnit, -1.5, 1.5) + tiltX[pixel];
        ny = clamp((-(down - up) / 2) * perUnit, -1.5, 1.5) + tiltY[pixel];
      }

      const norm = Math.hypot(nx, ny, 1);

      normal[pixel * channels] = Math.round((nx / norm) * 127.5 + 127.5);
      normal[pixel * channels + 1] = Math.round((ny / norm) * 127.5 + 127.5);
      normal[pixel * channels + 2] = Math.round((1 / norm) * 127.5 + 127.5);

      if (parallax) {
        normal[pixel * channels + 3] = Math.round(
          255 * clamp((height[pixel] - low) / (high - low || 1)),
        );
      }
    }
  }

  return encodePng(SIZE, SIZE, channels, normal);
}

/**
 * Every recipe's three maps — colour, normal, surface — keyed by theme. The
 * atlas is read once, and recipes cut to the same proportions share one
 * relief, so another metal costs only its own colours.
 */
const PAINTERS = {
  epoxy: paintEpoxy,
  paper: paintPaper,
  cracked: paintCracked,
  asiimov: paintAsiimov,
  wood: paintWood,
  companion: paintCompanion,
  crystal: paintCrystal,
  fade: paintFade,
  pearl: paintPearl,
  galaxy: paintGalaxy,
  ornate: paintOrnate,
  glass: paintGlass,
  "case-hardened": paintCaseHardened,
  labradorite: paintLabradorite,
  scales: paintScales,
  bloodied: paintBloodied,
};

/**
 * Skins cut alike in different metals: the carving is done once and painted
 * over per metal, keyed by everything it reads and nothing about the metal.
 */
const CARVED = {
  inlaid: {
    carve: carveInlay,
    paint: paintInlaid,
    cut: (recipe) => [
      recipe.frame,
      recipe.channel,
      recipe.depth,
      recipe.engrave,
      recipe.margin,
      recipe.weight,
      recipe.wear,
      recipe.fleck.density,
    ],
  },
  cornered: {
    carve: carveCornered,
    paint: paintCornered,
    cut: (recipe) => [
      recipe.frame,
      recipe.bevel,
      recipe.depth,
      recipe.bracket,
      recipe.margin,
      recipe.weight,
      recipe.shadow,
      recipe.enamel.scale,
      recipe.enamel.warp,
    ],
  },
};

export function paintSkins(recipes, sources) {
  const base = prepare(sources);
  const shapes = new Map();

  return Object.fromEntries(
    Object.entries(recipes).map(([name, recipe]) => {
      const painter = PAINTERS[recipe.kind];

      if (painter) {
        return [name, painter(recipe, base, sources.meshes)];
      }

      const carved = CARVED[recipe.kind];

      if (carved) {
        const key = JSON.stringify([recipe.kind, ...carved.cut(recipe)]);

        if (!shapes.has(key)) {
          shapes.set(key, carved.carve(recipe, base));
        }

        return [name, carved.paint(recipe, base, shapes.get(key))];
      }

      const key = JSON.stringify([
        recipe.frame,
        recipe.bevel,
        recipe.depth,
        recipe.weight,
        recipe.fleck.density,
      ]);

      if (!shapes.has(key)) {
        shapes.set(key, sculpt(recipe, base));
      }

      const shape = shapes.get(key);

      return [name, { ...paint(recipe, base, shape), normal: shape.normal }];
    }),
  );
}
