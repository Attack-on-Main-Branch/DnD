import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate as settle } from "node:timers/promises";
import { createTopography } from "./topography.mjs";

async function landscape(t, width = 800, height = 324, visualScaleY = 1) {
  const frames = new Map();
  const events = new Map();
  const attributes = new Map();
  const resources = [];
  const paints = [];
  const passes = [];
  let sequence = 0;
  let resize;
  let material;
  let target = null;
  let disconnected = false;
  let holdReads = false;
  const reads = [];
  const canvas = {
    width: 0,
    height: 0,
    get clientWidth() {
      return width;
    },
    get clientHeight() {
      return height;
    },
    getBoundingClientRect: () => ({ width, height: height * visualScaleY }),
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: (name) => events.delete(name),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
  class Resource {
    constructor() {
      this.disposed = false;
      resources.push(this);
    }
    dispose() {
      this.disposed = true;
    }
  }
  const THREE = {
    WebGLRenderer: class extends Resource {
      readRenderTargetPixelsAsync() {
        return holdReads
          ? new Promise((resolve) => reads.push(resolve))
          : Promise.resolve();
      }
      setRenderTarget(next) {
        target = next;
      }
      setSize(width, height) {
        canvas.width = width;
        canvas.height = height;
      }
      render() {
        passes.push(target);
        if (target) paints.push(material.uniforms.time.value);
      }
    },
    WebGLRenderTarget: class extends Resource {
      texture = {};
      setSize(width, height) {
        this.width = width;
        this.height = height;
      }
    },
    DataTexture: class extends Resource {
      constructor(data) {
        super();
        this.image = { data };
      }
    },
    RawShaderMaterial: class extends Resource {
      constructor(options) {
        super();
        Object.assign(this, options);
        if (options.uniforms.time) material = this;
      }
    },
    BufferGeometry: class extends Resource {
      setAttribute() {}
    },
    Float32BufferAttribute: class {},
    Vector2: class {
      set(x, y) {
        this.x = x;
        this.y = y;
      }
    },
    Color: class {
      convertLinearToSRGB() {
        return this;
      }
    },
    Scene: class {
      add() {}
    },
    Mesh: class {},
    Camera: class {},
  };
  const previous = Object.fromEntries(
    [
      "window",
      "Worker",
      "getComputedStyle",
      "ResizeObserver",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].map((name) => [name, globalThis[name]]),
  );
  Object.assign(globalThis, {
    window: { devicePixelRatio: 3 },
    Worker: class {
      listeners = new Map();
      addEventListener(name, callback) {
        this.listeners.set(name, callback);
      }
      postMessage(message, transfer = []) {
        if (message.dispose) return;
        const data = structuredClone(message, { transfer });
        queueMicrotask(() => this.listeners.get("message")?.({ data }));
      }
      terminate() {
        this.listeners.clear();
      }
    },
    getComputedStyle: () => ({ color: "white", backgroundColor: "black" }),
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
  const renderer = createTopography(THREE, canvas);
  t.after(() => {
    renderer.destroy();
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  await settle();
  return {
    renderer,
    canvas,
    paints,
    passes,
    frames,
    events,
    attributes,
    resources,
    get resolution() {
      return material.uniforms.resolution.value;
    },
    get disconnected() {
      return disconnected;
    },
    holdReads() {
      holdReads = true;
    },
    async finishRead() {
      reads.shift()?.();
      await settle();
    },
    async resize() {
      resize();
      await settle();
    },
    async setSize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      resize();
      await settle();
    },
    async frame(now) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
      await settle();
    },
  };
}

test("terrain evolves at 30fps and resumes without advancing through hidden time", async (t) => {
  const scene = await landscape(t);
  assert.deepEqual(scene.paints, [0]);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(true);
  scene.renderer.setPlaying(true);
  assert.equal(scene.frames.size, 1);
  await scene.frame(0);
  await scene.frame(16);
  assert.deepEqual(scene.paints, [0, 0]);
  await scene.frame(40);
  assert.equal(scene.paints.at(-1), 0.04);
  scene.renderer.setPlaying(false);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(true);
  await scene.frame(100000);
  assert.equal(scene.paints.at(-1), 0.04);
});

test("terrain bounds large buffers and releases all GPU resources and listeners", async (t) => {
  const scene = await landscape(t, 7680, 4320);
  assert.ok(scene.canvas.width <= 1600);
  assert.ok(scene.canvas.height <= 800);
  scene.renderer.setPlaying(true);
  scene.renderer.destroy();
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.disconnected, true);
  assert.equal(scene.events.size, 0);
  assert.equal(scene.attributes.size, 0);
  assert.ok(scene.resources.every(({ disposed }) => disposed));
  const paints = scene.paints.length;
  scene.renderer.setPlaying(true);
  await scene.resize();
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.paints.length, paints);
});

test("each terrain frame filters specks before reaching the visible canvas", async (t) => {
  const scene = await landscape(t);
  const [target, visible] = scene.passes;
  assert.ok(target?.texture);
  assert.equal(target.width, scene.canvas.width);
  assert.equal(target.height, scene.canvas.height);
  assert.equal(visible, null);
  scene.renderer.setPlaying(true);
  await scene.frame(0);
  assert.deepEqual(scene.passes, [target, null, target, null]);
});

test("unfolding the unlock dialog cannot flatten the terrain's drawing buffer", async (t) => {
  const scene = await landscape(t, 512, 207, 0.02);
  assert.equal(scene.canvas.width, 512);
  assert.equal(scene.canvas.height, 207);
  assert.equal(scene.resolution.x, scene.canvas.width);
  assert.equal(scene.resolution.y, scene.canvas.height);
  await scene.resize();
  assert.equal(scene.canvas.height, 207);
  await scene.setSize(320, 130);
  assert.equal(scene.canvas.width, 320);
  assert.equal(scene.canvas.height, 130);
});

test("a hidden preview waits for layout before revealing the canvas", async (t) => {
  const scene = await landscape(t, 0, 0);
  assert.equal(scene.attributes.size, 0);
  assert.equal(scene.paints.length, 0);
  await scene.setSize(512, 207);
  assert.ok(scene.attributes.has("data-topography-ready"));
  assert.equal(scene.canvas.width, 512);
  assert.equal(scene.canvas.height, 207);
});

test("context loss reveals the static artwork and restoration preserves pause state", async (t) => {
  const scene = await landscape(t);
  assert.ok(scene.attributes.has("data-topography-ready"));
  scene.renderer.setPlaying(true);
  let prevented = false;
  scene.events.get("webglcontextlost")({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.attributes.size, 0);
  scene.events.get("webglcontextrestored")();
  await settle();
  assert.equal(scene.frames.size, 1);
  assert.ok(scene.attributes.has("data-topography-ready"));
  scene.events.get("webglcontextlost")({ preventDefault() {} });
  scene.renderer.setPlaying(false);
  scene.events.get("webglcontextrestored")();
  await settle();
  assert.equal(scene.frames.size, 0);
});

test("unavailable WebGL leaves the static banner usable", () => {
  const THREE = {
    WebGLRenderer: class {
      constructor() {
        throw new Error("WebGL unavailable");
      }
    },
  };
  assert.equal(createTopography(THREE, {}), null);
});

test("an asynchronous GPU read cannot present a frame after disposal", async (t) => {
  const scene = await landscape(t);
  scene.holdReads();
  scene.renderer.setPlaying(true);
  await scene.frame(0);
  const passes = scene.passes.length;
  scene.renderer.destroy();
  await scene.finishRead();
  assert.equal(scene.passes.length, passes);
  assert.equal(scene.attributes.size, 0);
  assert.equal(scene.frames.size, 0);
});

test("resizing during a GPU read discards the old frame and filters the new size", async (t) => {
  const scene = await landscape(t);
  scene.holdReads();
  scene.renderer.setPlaying(true);
  await scene.frame(0);
  await scene.setSize(320, 130);
  const passes = scene.passes.length;
  await scene.finishRead();
  assert.equal(scene.passes.length, passes + 1);
  await scene.finishRead();
  assert.equal(scene.passes.at(-1), null);
  assert.equal(scene.canvas.width, 320);
  assert.equal(scene.canvas.height, 130);
});

test("unchanged terrain sizes reuse buffers and collapsed terrain stops scheduling", async (t) => {
  const scene = await landscape(t);
  const resources = scene.resources.length;
  const paints = scene.paints.length;
  await scene.resize();
  assert.equal(scene.resources.length, resources);
  assert.equal(scene.paints.length, paints);
  scene.renderer.setPlaying(true);
  await scene.setSize(0, 0);
  assert.equal(scene.frames.size, 0);
  await scene.setSize(800, 324);
  assert.equal(scene.frames.size, 1);
});

test("terrain waits for an outstanding GPU read instead of polling every display frame", async (t) => {
  const scene = await landscape(t);
  scene.holdReads();
  scene.renderer.setPlaying(true);
  await scene.frame(0);
  assert.equal(scene.frames.size, 0);
  await scene.frame(40);
  assert.equal(scene.paints.length, 2);
  await scene.finishRead();
  assert.equal(scene.frames.size, 1);
});
