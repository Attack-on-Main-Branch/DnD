export const HEXAGON_FRAME = { width: 1200, height: 486 };

export const HEXAGON_RADIUS = 46;
export const HEXAGON_CELL_RADIUS = HEXAGON_RADIUS + 2;
const GLOW_SPEED = 0.4;
const RADIUS = HEXAGON_RADIUS;
const ROW_HEIGHT = Math.sqrt(3) * HEXAGON_CELL_RADIUS;
const COLUMN_WIDTH = HEXAGON_CELL_RADIUS * 1.5;
const corners = Array.from({ length: 6 }, (_, index) => {
  const angle = (index * Math.PI) / 3;
  return [Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS];
});
const pair = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`;
const polygon = (points) => `M${points.map(([x, y]) => pair(x, y)).join("L")}Z`;
const variation = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export const HEXAGON_FACE = polygon(corners);
export const HEXAGON_SIDE = polygon([
  ...corners.slice(0, 4),
  ...corners
    .slice(0, 4)
    .reverse()
    .map(([x, y]) => [x + 3, y + 9]),
]);

const cells = Array.from(
  { length: Math.ceil(HEXAGON_FRAME.width / COLUMN_WIDTH) + 3 },
  (_, column) =>
    Array.from(
      { length: Math.ceil(HEXAGON_FRAME.height / ROW_HEIGHT) + 3 },
      (_, row) => {
        const x = (column - 1) * COLUMN_WIDTH;
        const y = (row - 1 + (column % 2) * 0.5) * ROW_HEIGHT;
        return { id: `${column}-${row}`, x, y, seed: column * 37 + row * 13 };
      },
    ),
).flat();

export const HEXAGON_GRID = cells
  .map(({ x, y }) =>
    polygon(
      corners.map(([dx, dy]) => [
        x + (dx * HEXAGON_CELL_RADIUS) / RADIUS,
        y + (dy * HEXAGON_CELL_RADIUS) / RADIUS,
      ]),
    ),
  )
  .join("");

export const HEXAGON_TILES = cells
  .map(({ seed, ...cell }) => ({
    ...cell,
    seed,
    period: 4.8 + variation(seed + 3) * 4.2,
    phase: -variation(seed + 4) * 12,
    lightPeriod: 2.4 + variation(seed + 5) * 4.5,
    lightPhase: -variation(seed + 6) * 14,
    direction: variation(seed + 7) > 0.5 ? "normal" : "reverse",
  }))
  .sort((a, b) => a.y - b.y || a.x - b.x);

export function hexagonState(tile, time, state = {}) {
  const phase = ((time + tile.phase) / tile.period) * Math.PI * 2;
  state.depth = (1 - Math.cos(phase)) * 0.5;
  state.scale = 0.95 + state.depth * 0.05;
  state.x = tile.x;
  state.y = tile.y;
  const travel = (time * GLOW_SPEED + tile.lightPhase) / tile.lightPeriod;
  const cycle = Math.floor(travel);
  const progress = travel - cycle;
  const duration = 0.42 + variation(tile.seed + cycle * 83 + 231) * 0.2;
  const glowing = variation(tile.seed + cycle * 97 + 101) > 0.45;
  state.light =
    glowing && progress < duration
      ? Math.sin((progress / duration) * Math.PI) ** 2
      : 0;
  const direction = tile.direction === "reverse" ? -1 : 1;
  state.travel = (((travel * direction) % 1) + 1) % 1;
  return state;
}

function trailPath(state) {
  const start = state.travel * corners.length;
  const end = start + corners.length * 0.27;
  const points = [];
  for (let step = start; step <= end;) {
    const index = Math.floor(step);
    const blend = step - index;
    const from = corners[index % corners.length];
    const to = corners[(index + 1) % corners.length];
    points.push([
      state.x + (from[0] + (to[0] - from[0]) * blend) * state.scale,
      state.y + (from[1] + (to[1] - from[1]) * blend) * state.scale,
    ]);
    if (step === end) break;
    step = Math.min(Math.floor(step) + 1, end);
  }
  return `M${points.map(([x, y]) => pair(x, y)).join("L")}`;
}

const still = HEXAGON_TILES.map((tile) => hexagonState(tile, 0));
export const HEXAGON_STILL = {
  faces: still
    .map((state) =>
      polygon(
        corners.map(([x, y]) => [
          state.x + x * state.scale,
          state.y + y * state.scale,
        ]),
      ),
    )
    .join(""),
  lights: still
    .filter(({ light }) => light > 0.25)
    .map(trailPath)
    .join(""),
};
