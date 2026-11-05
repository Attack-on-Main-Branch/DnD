import assert from "node:assert/strict";
import { test } from "node:test";

import { hexToPixel, pixelToHex } from "./hex-math.js";
import { mapDestination } from "./token-movement.mjs";

const natural = { width: 1600, height: 900 };
const grid = { enabled: true, size: 40 };
const center = { x: 0.5, y: 0.5 };

test("map taps snap to the nearest hex center", () => {
  const target = mapDestination(center, natural, grid);
  const cell = pixelToHex(
    center.x * natural.width,
    center.y * natural.height,
    grid.size,
  );
  const pixel = hexToPixel(cell.q, cell.r, grid.size);
  assert.deepEqual(target, {
    x: pixel.x / natural.width,
    y: pixel.y / natural.height,
    ...cell,
  });
});

test("unruled maps keep exact tapped coordinates", () => {
  const unruled = { ...grid, enabled: false };
  assert.deepEqual(mapDestination(center, natural, unruled), {
    ...center,
    q: null,
    r: null,
  });
});

test("movement refuses map edges instead of jumping to a different hex", () => {
  assert.equal(mapDestination({ x: 1.01, y: 0.5 }, natural, grid), null);
  assert.equal(
    mapDestination({ x: 1, y: 0 }, { width: 130, height: 100 }, grid),
    null,
  );
});

test("movement waits for valid map dimensions and grid geometry", () => {
  for (const size of [
    null,
    { width: 0, height: 900 },
    { width: Infinity, height: 900 },
  ]) {
    assert.equal(mapDestination(center, size, grid), null);
  }
  assert.equal(
    mapDestination(center, natural, { enabled: true, size: 0 }),
    null,
  );
});
