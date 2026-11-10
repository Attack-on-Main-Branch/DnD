import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HEXAGON_FRAME,
  HEXAGON_RADIUS,
  HEXAGON_CELL_RADIUS,
  HEXAGON_TILES,
  hexagonState,
} from "./hexagon-art.mjs";
import { createHexagonCanvas } from "./hexagon-canvas.mjs";

function banner(t, width = 800, height = 324) {
  const frames = new Map();
  const layers = [];
  const attributes = new Set();
  let sequence = 0;
  let resize;
  let disconnected = false;
  let readyChanges = 0;

  function context() {
    let shadow = 0;
    return {
      paints: 0,
      shadows: 0,
      blits: [],
      setTransform() {},
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {},
      fill() {},
      stroke() {},
      setLineDash() {},
      clearRect() {
        this.paints++;
        this.blits = [];
      },
      drawImage(_source, ...coordinates) {
        this.blits.push(coordinates);
      },
      get shadowBlur() {
        return shadow;
      },
      set shadowBlur(value) {
        shadow = value;
        this.shadows++;
      },
    };
  }

  const drawing = context();
  const canvas = {
    clientWidth: width,
    clientHeight: height,
    getContext: () => drawing,
    setAttribute(name) {
      attributes.add(name);
      readyChanges++;
    },
    removeAttribute: (name) => attributes.delete(name),
  };
  const previous = Object.fromEntries(
    [
      "window",
      "document",
      "getComputedStyle",
      "Path2D",
      "ResizeObserver",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].map((name) => [name, globalThis[name]]),
  );
  Object.assign(globalThis, {
    window: { devicePixelRatio: 3 },
    document: {
      createElement() {
        const drawing = context();
        const layer = { drawing, getContext: () => drawing };
        layers.push(layer);
        return layer;
      },
    },
    getComputedStyle: () => ({ getPropertyValue: () => "#0f0c08" }),
    Path2D: class {},
    ResizeObserver: class {
      constructor(callback) {
        resize = callback;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
    requestAnimationFrame(callback) {
      frames.set(++sequence, callback);
      return sequence;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  const renderer = createHexagonCanvas(canvas, "#2563eb");
  t.after(() => {
    renderer.destroy();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  return {
    renderer,
    canvas,
    drawing,
    layers,
    frames,
    attributes,
    get readyChanges() {
      return readyChanges;
    },
    get disconnected() {
      return disconnected;
    },
    resize(width, height) {
      Object.assign(canvas, { clientWidth: width, clientHeight: height });
      resize();
    },
    frame(now) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
    },
  };
}

test("hexagon frames reuse their glow atlas without filters, allocation, or DOM writes", (t) => {
  const scene = banner(t);
  const shadows = scene.layers.map(({ drawing }) => drawing.shadows);
  assert.ok(shadows.some((count) => count > 0));
  assert.equal(scene.layers.length, 2);
  scene.resize(800, 324);
  assert.equal(scene.layers.length, 2);
  scene.renderer.setPlaying(true);
  scene.renderer.setPlaying(true);
  assert.equal(scene.frames.size, 1);
  for (let frame = 0; frame < 120; frame++) scene.frame((frame * 1000) / 120);
  assert.ok(scene.drawing.paints >= 30 && scene.drawing.paints <= 32);
  assert.equal(scene.layers.length, 2);
  assert.deepEqual(
    scene.layers.map(({ drawing }) => drawing.shadows),
    shadows,
  );
  assert.equal(scene.drawing.shadows, 0);
  assert.equal(scene.readyChanges, 1);
  assert.equal(scene.frames.size, 1);
});

test("paused hexagons resume at the same pose and light position", (t) => {
  const scene = banner(t);
  scene.renderer.setPlaying(true);
  scene.frame(0);
  scene.frame(40);
  const paused = JSON.stringify(scene.drawing.blits);
  scene.renderer.setPlaying(false);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(true);
  scene.frame(100000);
  assert.equal(JSON.stringify(scene.drawing.blits), paused);
});

test("neighboring hexagons keep their occlusion order as their heights cross", (t) => {
  const scene = banner(t);
  const zoom = scene.canvas.clientWidth / HEXAGON_FRAME.width;
  function order() {
    return scene.drawing.blits
      .filter(
        (coordinates) =>
          coordinates.length === 8 &&
          coordinates[0] === 0 &&
          coordinates[1] === 0,
      )
      .map((coordinates) => {
        const x = (coordinates[4] + coordinates[6] / 2) / zoom;
        const y = (coordinates[5] + coordinates[7] / 2) / zoom;
        let closest;
        let distance = Infinity;
        for (const tile of HEXAGON_TILES) {
          const next = (tile.x - x) ** 2 + (tile.y - y) ** 2;
          if (next < distance) {
            closest = tile.id;
            distance = next;
          }
        }
        return closest;
      });
  }
  const ranks = new Map(order().map((id, rank) => [id, rank]));
  scene.renderer.setPlaying(true);
  scene.frame(0);
  for (let frame = 1; frame <= 40; frame++) {
    scene.frame(frame * 100);
    let previous = -1;
    for (const id of order()) {
      const rank = ranks.get(id);
      if (rank === undefined) continue;
      assert.ok(rank > previous, `Tile ${id} changed its front-to-back order`);
      previous = rank;
    }
  }
});

test("moving faces and their neon outlines remain inside separate honeycomb cells", () => {
  const apothem = HEXAGON_CELL_RADIUS * Math.cos(Math.PI / 6);
  const state = {};
  for (const tile of HEXAGON_TILES) {
    for (let step = 0; step <= 20; step++) {
      hexagonState(tile, step / 2, state);
      for (let corner = 0; corner < 6; corner++) {
        const angle = (corner * Math.PI) / 3;
        const x =
          state.x - tile.x + Math.cos(angle) * HEXAGON_RADIUS * state.scale;
        const y =
          state.y - tile.y + Math.sin(angle) * HEXAGON_RADIUS * state.scale;
        for (let edge = 0; edge < 6; edge++) {
          const normal = ((edge + 0.5) * Math.PI) / 3;
          const extent =
            x * Math.cos(normal) + y * Math.sin(normal) + 1.6 * state.scale;
          assert.ok(
            extent <= apothem,
            `Tile ${tile.id} crossed a shared cell border`,
          );
        }
      }
    }
  }
});

test("collapsed banners wait for layout, bound large buffers and release every cached layer", (t) => {
  const scene = banner(t, 0, 0);
  scene.renderer.setPlaying(true);
  assert.equal(scene.layers.length, 0);
  assert.equal(scene.frames.size, 0);
  scene.resize(800, 324);
  assert.equal(scene.frames.size, 1);
  const previous = [...scene.layers];
  scene.resize(7680, 4320);
  assert.ok(scene.canvas.width <= 1600 && scene.canvas.height <= 800);
  assert.ok(previous.every((layer) => layer.width === 0 && layer.height === 0));
  scene.renderer.destroy();
  scene.renderer.destroy();
  scene.renderer.setPlaying(true);
  scene.resize(320, 130);
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.canvas.width, 0);
  assert.equal(scene.attributes.size, 0);
  assert.ok(scene.disconnected);
  assert.ok(
    scene.layers.every((layer) => layer.width === 0 && layer.height === 0),
  );
});

test("glow timing is independent of whether a hexagon is rising or receding", () => {
  const tile = HEXAGON_TILES.find((tile) => hexagonState(tile, 1).light > 0.9);
  const time = 1;
  for (const progress of [0.1, 0.2, 0.3, 0.4]) {
    const rising = hexagonState(
      { ...tile, phase: tile.period * progress - time },
      time,
    );
    const receding = hexagonState(
      { ...tile, phase: tile.period * (1 - progress) - time },
      time,
    );
    assert.ok(Math.abs(rising.depth - receding.depth) < 1e-12);
    assert.equal(rising.light, receding.light);
    assert.ok(rising.light > 0.9);
    assert.equal(rising.travel, receding.travel);
  }
});

test("glowing cells hand off to different cells after fading completely dark", () => {
  const initial = new Set(
    HEXAGON_TILES.filter((tile) => hexagonState(tile, 0).light > 0.75).map(
      ({ id }) => id,
    ),
  );
  const later = new Set(
    HEXAGON_TILES.filter((tile) => hexagonState(tile, 3).light > 0.75).map(
      ({ id }) => id,
    ),
  );
  assert.ok([...later].some((id) => !initial.has(id)));
  assert.ok(
    HEXAGON_TILES.some(
      (tile) => initial.has(tile.id) && hexagonState(tile, 3).light === 0,
    ),
  );
});

test("every hexagon can reach a vivid pulse and a zero-glow interval", () => {
  const state = {};
  for (const tile of HEXAGON_TILES) {
    let peak = 0;
    let dark = false;
    for (let step = 0; step < 480 && !(peak > 0.9 && dark); step++) {
      const { light } = hexagonState(tile, step / 4, state);
      assert.ok(light >= 0 && light <= 1);
      peak = Math.max(peak, light);
      dark ||= light === 0;
    }
    assert.ok(peak > 0.9, `${tile.id} never glowed brightly`);
    assert.ok(dark, `${tile.id} never went dark`);
  }
});
