/**
 * Pointy-topped hexagons on an axial lattice: `q` east, `r` south-east, with
 * cube's third coordinate always `-q - r`.
 *
 * EVERY LENGTH IS IN THE PICTURE'S OWN PIXELS — the board zooms, so a screen
 * pixel means somewhere else on every chair. `size` is the circumradius.
 */

const SQRT3 = Math.sqrt(3);

function hexWidth(size) {
  return SQRT3 * size;
}

function hexHeight(size) {
  return 1.5 * size;
}

/** The centre of cell `q,r`, in picture pixels. */
export function hexToPixel(q, r, size) {
  return {
    x: hexWidth(size) * (q + r / 2),
    y: hexHeight(size) * r,
  };
}

/** The cell a point falls in. Fractional axial, rounded through cube space. */
export function pixelToHex(x, y, size) {
  const r = (2 / 3) * (y / size);
  const q = (SQRT3 / 3) * (x / size) - r / 2;

  return hexRound(q, r);
}

/**
 * The nearest whole cell, rounded in CUBE space: axial rounding alone lands in
 * the wrong cell along every third boundary, because only cube carries the
 * constraint that the three coordinates sum to zero.
 */
function hexRound(q, r) {
  const s = -q - r;

  let roundedQ = Math.round(q);
  let roundedR = Math.round(r);
  const roundedS = Math.round(s);

  const dq = Math.abs(roundedQ - q);
  const dr = Math.abs(roundedR - r);
  const ds = Math.abs(roundedS - s);

  if (dq > dr && dq > ds) {
    roundedQ = -roundedR - roundedS;
  } else if (dr > ds) {
    roundedR = -roundedQ - roundedS;
  }

  return { q: roundedQ, r: roundedR };
}

/** How many steps apart two cells are — cube distance, in axial's two numbers. */
export function hexDistance(from, to) {
  const dq = to.q - from.q;
  const dr = to.r - from.r;

  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/** The six corners of a cell, as an SVG `points` string. */
export function getHexPolygonPoints(centerX, centerY, size) {
  const corners = [];

  for (let corner = 0; corner < 6; corner++) {
    // Thirty degrees off puts a point at the top rather than a flat edge.
    const angle = (Math.PI / 180) * (60 * corner - 30);

    corners.push(
      `${round(centerX + size * Math.cos(angle))},${round(
        centerY + size * Math.sin(angle),
      )}`,
    );
  }

  return corners.join(" ");
}

/**
 * ONE TILE OF THE LATTICE, for an SVG `<pattern>` to repeat. A polygon per cell
 * is six thousand nodes on a 2560px map at the smallest size, rebuilt on every
 * frame of a slider drag; the lattice repeats, so one tile covers it.
 *
 * The tile carries the ring of cells around it too: a hexagon overflows its own
 * tile on every side, and without them the seams come out as gaps.
 */
export function hexPatternTile(size) {
  const width = hexWidth(size);
  const height = 3 * size;

  const polygons = [];

  // r from -1 to 2 covers every cell whose outline touches the tile.
  for (let r = -1; r <= 2; r++) {
    for (let q = -1; q <= 1; q++) {
      const { x, y } = hexToPixel(q, r, size);

      // An odd row sits half a cell across; wrapping seams the pattern.
      const wrapped = ((x % width) + width) % width;

      polygons.push(getHexPolygonPoints(wrapped, y, size));
      polygons.push(getHexPolygonPoints(wrapped - width, y, size));
    }
  }

  return { width, height, polygons: [...new Set(polygons)] };
}

/**
 * The line colour for a luminance: 0 is pure black, 1 pure white. The alpha is
 * fixed — a grid you could turn up to opaque is a map you can no longer see.
 */
export function gridStroke(luminance) {
  const channel = Math.round(
    Math.min(1, Math.max(0, Number(luminance) || 0)) * 255,
  );

  return `rgba(${channel}, ${channel}, ${channel}, 0.75)`;
}

/** Two decimals: under a thousandth of a cell, and half the path string. */
function round(value) {
  return Math.round(value * 100) / 100;
}

/** Axial steps to the six neighbours, walked in order round a ring. */
const NEIGHBOURS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Past this a board is too crowded to be worth searching further. */
const FURTHEST_RING = 12;

/**
 * Pieces put onto the lattice: each to the centre of the cell it stands in,
 * preserving pieces that share a cell. Only cells
 * whose centre is on the picture are offered, or the point would be clamped
 * to the edge and stand off its own cell.
 *
 * `pieces` are `{ id, x, y }` in picture pixels; the answer maps each id to
 * `{ x, y, q, r }` in the same units.
 */
export function alignToLattice(pieces, size, { width, height }) {
  const inside = ({ q, r }) => {
    const { x, y } = hexToPixel(q, r, size);

    return x >= 0 && y >= 0 && x <= width && y <= height;
  };

  const queue = pieces
    .map((piece) => {
      const cell = pixelToHex(piece.x, piece.y, size);
      const centre = hexToPixel(cell.q, cell.r, size);

      return {
        piece,
        cell,
        slack: Math.hypot(centre.x - piece.x, centre.y - piece.y),
      };
    })
    .sort((one, two) => one.slack - two.slack);

  const answers = new Map();

  for (const { piece, cell } of queue) {
    const home = nearestFree(piece, cell, size, (one) => {
      return inside(one);
    });

    if (!home) {
      continue;
    }

    answers.set(piece.id, { ...hexToPixel(home.q, home.r, size), ...home });
  }

  return answers;
}

function nearestFree(piece, cell, size, free) {
  if (free(cell)) {
    return cell;
  }

  for (let ring = 1; ring <= FURTHEST_RING; ring++) {
    const open = hexRing(cell, ring).filter(free);

    if (open.length > 0) {
      return open
        .map((one) => {
          const { x, y } = hexToPixel(one.q, one.r, size);

          return { one, away: Math.hypot(x - piece.x, y - piece.y) };
        })
        .sort((a, b) => a.away - b.away)[0].one;
    }
  }

  return null;
}

/** The cells exactly `radius` steps from `centre`. */
function hexRing(centre, radius) {
  const cells = [];
  let at = {
    q: centre.q + NEIGHBOURS[4].q * radius,
    r: centre.r + NEIGHBOURS[4].r * radius,
  };

  for (const step of NEIGHBOURS) {
    for (let walked = 0; walked < radius; walked++) {
      cells.push(at);
      at = { q: at.q + step.q, r: at.r + step.r };
    }
  }

  return cells;
}
