import { hexToPixel, pixelToHex } from "./hex-math.js";

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
