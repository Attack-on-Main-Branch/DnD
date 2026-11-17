import { hexDistance, hexToPixel, pixelToHex } from "./hex-math.js";
import { FEET_PER_HEX } from "sina/rules/grid";

function usable(point, natural, grid) {
  return (
    Number.isFinite(point?.x) &&
    Number.isFinite(point?.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1 &&
    Number.isFinite(natural?.width) &&
    natural.width > 0 &&
    Number.isFinite(natural?.height) &&
    natural.height > 0 &&
    Number.isFinite(grid?.size) &&
    grid.size > 0
  );
}

function withinMap(pixel, natural, cell = {}) {
  if (
    pixel.x < 0 ||
    pixel.y < 0 ||
    pixel.x > natural.width ||
    pixel.y > natural.height
  )
    return null;
  return {
    x: pixel.x / natural.width,
    y: pixel.y / natural.height,
    q: null,
    r: null,
    ...cell,
  };
}

export function mapDestination(point, natural, grid) {
  if (!usable(point, natural, grid)) return null;
  if (!grid.enabled) return { x: point.x, y: point.y, q: null, r: null };
  const cell = pixelToHex(
    point.x * natural.width,
    point.y * natural.height,
    grid.size,
  );
  return withinMap(hexToPixel(cell.q, cell.r, grid.size), natural, cell);
}

export function mapMovementFeet(from, to, natural, grid) {
  if (!usable(from, natural, grid) || !usable(to, natural, grid)) return 0;
  const start = { x: from.x * natural.width, y: from.y * natural.height };
  const end = { x: to.x * natural.width, y: to.y * natural.height };
  if (grid.enabled) {
    return (
      hexDistance(
        pixelToHex(start.x, start.y, grid.size),
        pixelToHex(end.x, end.y, grid.size),
      ) * FEET_PER_HEX
    );
  }
  return (
    (Math.hypot(end.x - start.x, end.y - start.y) /
      (Math.sqrt(3) * grid.size)) *
    FEET_PER_HEX
  );
}
