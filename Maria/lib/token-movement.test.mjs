import assert from "node:assert/strict";
import { test } from "node:test";

import { hexToPixel, pixelToHex } from "./hex-math.js";
import { mapDestination, mapMovementFeet } from "./token-movement.mjs";

const natural = { width: 1600, height: 900 };
const grid = { enabled: true, size: 40 };
const center = { x: 0.5, y: 0.5 };

test("movement counts hex steps in every direction using five feet per hex", () => {
  const origin = hexToPixel(5, 5, grid.size);
  for (const [q, r] of [
    [6, 5],
    [5, 6],
    [4, 6],
    [4, 5],
    [5, 4],
    [6, 4],
  ]) {
    const end = hexToPixel(q, r, grid.size);
    assert.equal(
      mapMovementFeet(
        { x: origin.x / natural.width, y: origin.y / natural.height },
        { x: end.x / natural.width, y: end.y / natural.height },
        natural,
        grid,
      ),
      5,
    );
  }
});

test("movement measures the path's segments rather than displacement from the start", () => {
  const a = mapDestination({ x: 0.4, y: 0.4 }, natural, grid);
  const b = mapDestination({ x: 0.6, y: 0.4 }, natural, grid);
  assert.ok(
    mapMovementFeet(a, b, natural, grid) +
      mapMovementFeet(b, a, natural, grid) >
      0,
  );
  assert.equal(mapMovementFeet(a, a, natural, grid), 0);
});

test("movement uses the grid's scale when grid lines are hidden", () => {
  const end = {
    x: center.x + (Math.sqrt(3) * grid.size) / natural.width,
    y: center.y,
  };
  assert.ok(
    Math.abs(
      mapMovementFeet(center, end, natural, { ...grid, enabled: false }) - 5,
    ) < 0.00001,
  );
  assert.equal(mapMovementFeet(center, end, null, grid), 0);
});

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
