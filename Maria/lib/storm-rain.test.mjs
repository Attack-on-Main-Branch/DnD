import assert from "node:assert/strict";
import { test } from "node:test";
import { createStormRain } from "./storm-rain.mjs";

function rain(t, width = 800, height = 320) {
  const frames = new Map();
  let sequence = 0;
  let resize;
  let disconnected = false;
  const context = {
    paints: 0,
    gradients: 0,
    setTransform() {},
    clearRect() {
      this.paints++;
    },
    createLinearGradient() {
      this.gradients++;
      return { addColorStop() {} };
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    drawImage() {},
  };
  const sprite = { getContext: () => context };
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ width, height }),
    getContext: () => context,
  };
  const previous = Object.fromEntries(
    [
      "window",
      "document",
      "ResizeObserver",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].map((key) => [key, globalThis[key]]),
  );
  Object.assign(globalThis, {
    window: { devicePixelRatio: 3 },
    document: { createElement: () => sprite },
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
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  });
  const renderer = createStormRain(canvas, "white");
  t.after(() => {
    renderer.destroy();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  return {
    renderer,
    context,
    sprite,
    canvas,
    frames,
    get disconnected() {
      return disconnected;
    },
    resize: () => resize(),
    frame(now) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
    },
  };
}

test("rain paints at 30fps and releases its frame when paused", (t) => {
  const scene = rain(t);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(true);
  scene.renderer.setPlaying(true);
  assert.equal(scene.frames.size, 1);
  scene.frame(0);
  const paints = scene.context.paints;
  scene.frame(8);
  scene.frame(16);
  assert.equal(scene.context.paints, paints);
  scene.frame(40);
  assert.equal(scene.context.paints, paints + 1);
  scene.renderer.setPlaying(false);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(true);
  scene.frame(100000);
  assert.equal(scene.context.paints, paints + 2);
  assert.equal(scene.context.gradients, 1);
});

test("large rain surfaces stay bounded and cannot restart after disposal", (t) => {
  const scene = rain(t, 7680, 4320);
  assert.ok(scene.canvas.width <= 1600);
  assert.ok(scene.canvas.height <= 800);
  scene.renderer.setPlaying(true);
  scene.renderer.destroy();
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.disconnected, true);
  scene.renderer.setPlaying(true);
  scene.resize();
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.canvas.width, 0);
  assert.equal(scene.canvas.height, 0);
  assert.equal(scene.sprite.width, 0);
});
