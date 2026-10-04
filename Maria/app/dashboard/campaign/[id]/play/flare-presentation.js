/**
 * What each spell flare is drawn from. Geometry lives in a `-50 -50 100 100`
 * box laid over a face at `inset: -46%` (`.flare` in globals.css), which puts
 * the face's rim at a radius of 26. Colours and motion are in globals.css,
 * keyed on `data-flare`, `data-shape` and `data-motion`.
 *
 * A glyph is pinned to the rim and points outward (local −y), or up if it is
 * `upright`; a mote travels from where it starts.
 */

/** One cast, from first light to gone. Handed to the CSS as `--flare-life`. */
export const FLARE_MS = 2600;

const round = (value) => Math.round(value * 100) / 100;

function polar(radius, degrees) {
  const angle = (degrees * Math.PI) / 180;

  return [round(Math.sin(angle) * radius), round(-Math.cos(angle) * radius)];
}

function polygon(points) {
  return `M${points.map((point) => point.join(" ")).join("L")}Z`;
}

function hexagon(radius) {
  return polygon(
    Array.from({ length: 6 }, (_, side) => polar(radius, side * 60)),
  );
}

function rays(count, inner, long, short) {
  return Array.from({ length: count }, (_, ray) => {
    const at = (ray * 360) / count;

    return polygon([
      polar(inner, at - 3.2),
      polar(ray % 2 ? short : long, at),
      polar(inner, at + 3.2),
    ]);
  }).join("");
}

/** A crescent hugging the rim: the outer arc, back along a flatter one. */
function blade(radius, sweep, flatter) {
  const [x1, y1] = polar(radius, -sweep / 2);
  const [x2, y2] = polar(radius, sweep / 2);

  return `M${x1} ${y1}A${radius} ${radius} 0 0 1 ${x2} ${y2}A${flatter} ${flatter} 0 0 0 ${x1} ${y1}Z`;
}

const PATHS = {
  flame: [
    "M0 1C-3.2 1-4-2.4-3-5C-2-7.6-.6-9.4-.4-12C-.2-14.4.8-16.2 1.8-18C2.2-15.6 3.6-12.4 3.6-8.6C3.6-4 2.6 1 0 1Z",
    "M0 1C-3.4 1-3.8-3-3-6C-2.4-8.6-2.6-11-2-13.4C-1.6-15-2-16.6-2.4-17.6C.6-15.6 3.2-12.8 3.4-8.4C3.6-4 2.4 1 0 1Z",
    "M0 1C-3.4 1-4-2.8-3.2-5.6C-2.6-8-3-10.6-2.4-13.6C-1.2-11.6-.2-10.6.4-9.4C.8-11.6 1.6-14 2.2-16.4C3.4-12.6 4-9.4 3.8-6C3.6-2.2 2.2 1 0 1Z",
  ],
  blaze: [
    "M0 1.5C-5 1.5-6.2-3-5-7C-4-10.2-1.8-12.6-1.6-16.4C-1.4-19.4-.2-21.6 1.4-24C2.4-20 5.6-16.6 5.8-11C6-4.6 4 1.5 0 1.5Z",
    "M0 1.5C-5.2 1.5-6-3.6-4.6-8C-3.6-11.4-4-15-3.2-18.6C-2.6-15.6-1-14.2.2-13C.8-16.4 2-19 2.8-21.4C4.6-16.8 6-13 5.8-8.4C5.6-3 3.6 1.5 0 1.5Z",
  ],
  bolt: [
    "M0 0L-2.2-5L1.6-8.4L-1.4-13L2.2-16.6L-.6-21",
    "M0 0L2-4.6L-1.8-8L1.4-12.6L-2-16L.4-20.4",
  ],
  crystal: [
    "M0-5.5V5.5M-4.8-2.75L4.8 2.75M-4.8 2.75L4.8-2.75M-1.5-4.4L0-3L1.5-4.4M-1.5 4.4L0 3L1.5 4.4",
  ],
  spike: ["M-1.3 0L0-12L1.3 0Z"],
  wisp: ["M0-20C6-17 7-10 2.5-5S-1-1 0 0"],
  blade: [blade(33, 80, 50)],
  hex: [hexagon(34)],
  rays: [rays(12, 26, 44, 37)],
  star: ["M0-3.6Q.5-.5 3.6 0Q.5.5 0 3.6Q-.5.5-3.6 0Q-.5-.5 0-3.6Z"],
  drop: ["M0-2.6C1.1-1 1.7 0 1.7.9A1.7 1.7 0 0 1-1.7.9C-1.7 0-1.1-1 0-2.6Z"],
  plus: ["M0-2.6V2.6M-2.6 0H2.6"],
  chunk: ["M-1.6-1.2L1.3-1.7L1.8 1.1L-1 1.7Z"],
};

/** Shapes that are circles, by radius. */
const CIRCLES = {
  ring: 27,
  halo: 31,
  "halo-wide": 37,
  ember: 1.7,
  spark: 1.1,
  mote: 1.5,
  bubble: 1.9,
  puff: 7,
};

/** Filled from the SVG's own gradients rather than a flat colour. */
export const GRADIENT_FILLS = {
  ember: "soft",
  puff: "soft",
  rays: "soft",
  flame: "tongue",
  blaze: "blaze",
};

/** Wisps travel along their own length, so it is normalised. */
export const PATH_LENGTHS = { wisp: 100 };

export function shapeOf(shape, index) {
  if (shape in CIRCLES) {
    return { circle: CIRCLES[shape] };
  }

  const variants = PATHS[shape];

  return { d: variants[index % variants.length] };
}

/**
 * kind     glyph (pinned to the rim) or mote (travels)
 * at       radius it stands at or starts from; 0 for something centred
 * every    ms between one glyph and the next
 * spread   ms the motes' starts are spread across
 * arc      [from, to] degrees the motes start within, 0 being the top
 * spin     the whole layer turns: cw, ccw, cw-slow, cw-fast
 * upright  glyphs stand up instead of pointing out, leaning out at the sides
 *          by up to this many degrees and tallest over the top
 */
export const FLARE_RECIPES = {
  fire: [
    {
      kind: "glyph",
      shape: "blaze",
      count: 15,
      at: 26,
      upright: 22,
      motion: "lick",
      every: 35,
    },
    {
      kind: "glyph",
      shape: "flame",
      count: 11,
      at: 24,
      upright: 16,
      motion: "lick",
      every: 35,
      offset: 16,
    },
    {
      kind: "mote",
      shape: "ember",
      count: 16,
      at: 30,
      motion: "rise",
      spread: 1500,
      arc: [-95, 95],
    },
  ],
  cold: [
    {
      kind: "glyph",
      shape: "crystal",
      count: 6,
      at: 33,
      motion: "bloom",
      every: 110,
      offset: 30,
    },
    {
      kind: "mote",
      shape: "spark",
      count: 14,
      at: 28,
      motion: "drift",
      spread: 1100,
    },
  ],
  lightning: [
    {
      kind: "glyph",
      shape: "bolt",
      count: 8,
      at: 25,
      motion: "strike",
      every: 130,
    },
    {
      kind: "mote",
      shape: "spark",
      count: 10,
      at: 30,
      motion: "burst",
      spread: 1500,
    },
  ],
  thunder: [
    {
      kind: "glyph",
      shape: "ring",
      count: 3,
      at: 0,
      motion: "ripple",
      every: 420,
    },
    {
      kind: "mote",
      shape: "spark",
      count: 12,
      at: 27,
      motion: "burst",
      spread: 900,
    },
  ],
  acid: [
    {
      kind: "mote",
      shape: "bubble",
      count: 10,
      at: 24,
      motion: "rise",
      spread: 1400,
    },
    {
      kind: "mote",
      shape: "drop",
      count: 8,
      at: 26,
      motion: "fall",
      spread: 1500,
      arc: [100, 260],
    },
  ],
  poison: [
    {
      kind: "mote",
      shape: "puff",
      count: 8,
      at: 30,
      motion: "swirl",
      spread: 1100,
    },
    {
      kind: "mote",
      shape: "bubble",
      count: 6,
      at: 25,
      motion: "rise",
      spread: 1400,
      arc: [-100, 100],
    },
  ],
  necrotic: [
    {
      kind: "glyph",
      shape: "wisp",
      count: 6,
      at: 26,
      motion: "drain",
      every: 170,
      spin: "ccw",
    },
    {
      kind: "mote",
      shape: "mote",
      count: 12,
      at: 44,
      motion: "sink",
      spread: 1300,
    },
  ],
  radiant: [
    {
      kind: "glyph",
      shape: "rays",
      count: 1,
      at: 0,
      motion: "glow",
      spin: "cw-slow",
    },
    {
      kind: "mote",
      shape: "star",
      count: 8,
      at: 34,
      motion: "twinkle",
      spread: 1600,
    },
  ],
  force: [
    {
      kind: "glyph",
      shape: "hex",
      count: 1,
      at: 0,
      motion: "ward",
      spin: "cw-slow",
    },
    {
      kind: "glyph",
      shape: "ring",
      count: 2,
      at: 0,
      motion: "ripple",
      every: 600,
      from: 250,
    },
  ],
  psychic: [
    {
      kind: "glyph",
      shape: "halo",
      count: 1,
      at: 0,
      motion: "glow",
      spin: "cw",
    },
    {
      kind: "glyph",
      shape: "halo-wide",
      count: 1,
      at: 0,
      motion: "glow",
      spin: "ccw",
    },
    {
      kind: "mote",
      shape: "spark",
      count: 10,
      at: 33,
      motion: "orbit",
      spread: 1000,
    },
  ],
  slashing: [
    {
      kind: "glyph",
      shape: "blade",
      count: 3,
      at: 0,
      motion: "glow",
      spin: "cw-fast",
    },
    {
      kind: "mote",
      shape: "spark",
      count: 8,
      at: 33,
      motion: "burst",
      spread: 1200,
    },
  ],
  piercing: [
    {
      kind: "glyph",
      shape: "spike",
      count: 8,
      at: 25,
      motion: "thrust",
      every: 140,
    },
    {
      kind: "mote",
      shape: "spark",
      count: 6,
      at: 30,
      motion: "burst",
      spread: 1300,
    },
  ],
  bludgeoning: [
    {
      kind: "glyph",
      shape: "ring",
      count: 2,
      at: 0,
      motion: "ripple",
      every: 350,
    },
    {
      kind: "mote",
      shape: "chunk",
      count: 12,
      at: 27,
      motion: "scatter",
      spread: 700,
    },
  ],
  healing: [
    {
      kind: "mote",
      shape: "plus",
      count: 7,
      at: 24,
      motion: "rise",
      spread: 1500,
      arc: [-120, 120],
    },
    {
      kind: "mote",
      shape: "ember",
      count: 10,
      at: 26,
      motion: "rise",
      spread: 1500,
    },
  ],
  arcane: [
    {
      kind: "glyph",
      shape: "halo",
      count: 1,
      at: 0,
      motion: "glow",
      spin: "cw",
    },
    {
      kind: "mote",
      shape: "star",
      count: 8,
      at: 33,
      motion: "orbit",
      spread: 900,
    },
  ],
};

/** Golden-angle steps, so consecutive starts land far apart. */
const GOLDEN = 0.618034;

function standing(at, angle, lean, index) {
  const [x, y] = polar(at, angle);
  const radians = (angle * Math.PI) / 180;
  const size = 0.85 + Math.cos(radians) * 0.3;
  const reach = size * (1 + (((index * 5) % 3) - 1) * 0.18);

  return `translate(${x} ${y}) rotate(${round(Math.sin(radians) * lean)}) scale(${round(size)} ${round(reach)})`;
}

/** Evenly round the rim, nudged off a perfect wheel; starts shuffled. */
export function glyphPlacements({
  count,
  at,
  every = 0,
  offset = 0,
  from = 0,
  upright,
}) {
  return Array.from({ length: count }, (_, index) => {
    // A centred glyph keeps its exact spacing: blades are a third apart.
    const nudge = at ? (((index * 7) % 5) - 2) * 4 : 0;
    const angle = round(offset + (index * 360) / count + nudge);

    return {
      transform: upright
        ? standing(at, angle, upright, index)
        : `rotate(${angle}) translate(0 ${-at})`,
      delay: from + ((index * 3) % count) * every,
    };
  });
}

export function motePlacements({
  count,
  at,
  spread = 0,
  arc = [0, 360],
  from = 0,
}) {
  const [start, end] = arc;

  return Array.from({ length: count }, (_, index) => {
    const [x, y] = polar(
      at + (((index * 5) % 7) - 3) * 0.8,
      start + ((index * GOLDEN) % 1) * (end - start),
    );

    return {
      x,
      y,
      sway: (((index * 3) % 7) - 3) * 1.6,
      delay: from + Math.round((index / count) * spread),
    };
  });
}
