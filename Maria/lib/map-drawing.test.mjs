import assert from "node:assert/strict";
import { test } from "node:test";

import { conePath, drawingGeometry } from "./map-drawing.js";

test("drawing radii use the image's pixels on a nonsquare map", () => {
  const from = { x: 0.5, y: 0.5 };
  const horizontal = drawingGeometry(800, 400, from, { x: 0.75, y: 0.5 });
  const vertical = drawingGeometry(800, 400, from, { x: 0.5, y: 1 });
  assert.equal(horizontal.length, 200);
  assert.equal(vertical.length, 200);
  assert.equal(horizontal.angle, 0);
  assert.equal(vertical.angle, Math.PI / 2);
});

test("empty and invalid drags have no drawable geometry", () => {
  const point = { x: 0.5, y: 0.5 };
  assert.equal(drawingGeometry(800, 400, point, point), null);
  assert.equal(drawingGeometry(0, 400, point, { x: 1, y: 1 }), null);
  assert.equal(drawingGeometry(800, 400, null, point), null);
  assert.equal(drawingGeometry(800, 400, point, { x: Infinity, y: 1 }), null);
});

test("cone edges bound the selected angle while keeping the radius", () => {
  const geometry = drawingGeometry(
    800,
    400,
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.5 },
  );
  for (const degrees of [30, 60, 90]) {
    const path = conePath(geometry, degrees);
    const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
    const [x, y, leftX, leftY, radiusX, radiusY, , , , rightX, rightY] =
      numbers;
    assert.equal(radiusX, geometry.length);
    assert.equal(radiusY, geometry.length);
    assert.ok(
      Math.abs(Math.hypot(leftX - x, leftY - y) - geometry.length) < 1e-9,
    );
    assert.ok(
      Math.abs(Math.hypot(rightX - x, rightY - y) - geometry.length) < 1e-9,
    );
    const angle =
      Math.atan2(rightY - y, rightX - x) - Math.atan2(leftY - y, leftX - x);
    assert.ok(Math.abs(angle - (degrees * Math.PI) / 180) < 1e-9);
  }
});
