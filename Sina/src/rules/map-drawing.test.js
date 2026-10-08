import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CONE_ANGLES,
  DEFAULT_CONE_ANGLE,
  readMapDrawing,
} from "./map-drawing.js";

const from = { x: 0.25, y: 0.5, q: 2, r: 3 };
const to = { x: 0.75, y: 1, q: 5, r: 7 };

test("older arrows use the default shape and cone angle", () => {
  assert.deepEqual(readMapDrawing({ from, to }), {
    shape: "arrow",
    angle: DEFAULT_CONE_ANGLE,
    from,
    to,
  });
});

test("shared circles and every supported cone angle retain their geometry", () => {
  for (const shape of ["circle", "cone"]) {
    for (const angle of CONE_ANGLES) {
      assert.deepEqual(readMapDrawing({ shape, angle, from, to }), {
        shape,
        angle,
        from,
        to,
      });
    }
  }
});

test("free drawings do not require grid cells", () => {
  const drawing = readMapDrawing({ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } });
  assert.deepEqual(drawing.from, { x: 0, y: 0, q: null, r: null });
  assert.deepEqual(drawing.to, { x: 1, y: 1, q: null, r: null });
});

test("cell-only endpoints remain usable on ruled maps", () => {
  assert.deepEqual(readMapDrawing({ from: { q: -3, r: 4 }, to }).from, {
    x: null,
    y: null,
    q: -3,
    r: 4,
  });
});

test("unknown shapes, unsupported angles and cancelled drawings are rejected", () => {
  for (const value of [
    null,
    {},
    { from, to: null },
    { from, to, shape: "square" },
    { from, to, angle: 45 },
    { from, to, angle: "60" },
  ]) {
    assert.equal(readMapDrawing(value), null);
  }
});

test("untrusted coordinates cannot introduce nonfinite or out-of-range points", () => {
  for (const endpoint of [
    { x: NaN, y: 0 },
    { x: Infinity, y: 0 },
    { x: -0.1, y: 0 },
    { x: 1.1, y: 0 },
    { x: "0.5", y: 0 },
    { q: 0.5, r: 1 },
    { q: Number.MAX_SAFE_INTEGER + 1, r: 1 },
  ]) {
    assert.equal(readMapDrawing({ from: endpoint, to }), null);
    assert.equal(readMapDrawing({ from, to: endpoint }), null);
  }
});

test("only valid coordinate pairs and expected fields survive the wire", () => {
  assert.deepEqual(
    readMapDrawing({ from: { ...from, x: Infinity, secret: true }, to }).from,
    {
      x: null,
      y: null,
      q: from.q,
      r: from.r,
    },
  );
  assert.deepEqual(readMapDrawing({ from: { ...from, q: 0.5 }, to }).from, {
    x: from.x,
    y: from.y,
    q: null,
    r: null,
  });
});
