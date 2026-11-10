import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";

import { createFlagCloth } from "./flag-cloth.mjs";

function flag(t, width = 800, height = 324) {
  const frames = new Map();
  const events = new Map();
  const attributes = new Set();
  const paints = [];
  const resources = [];
  let load;
  let resize;
  let sequence = 0;
  let disconnected = false;
  const canvas = {
    clientWidth: width,
    clientHeight: height,
    setAttribute: (name) => attributes.add(name),
    removeAttribute: (name) => attributes.delete(name),
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: (name) => events.delete(name),
  };
  const previous = Object.fromEntries(
    [
      "window",
      "getComputedStyle",
      "ResizeObserver",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].map((name) => [name, globalThis[name]]),
  );
  Object.assign(globalThis, {
    window: { devicePixelRatio: 3 },
    getComputedStyle: () => ({ color: "rgb(253, 246, 232)" }),
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
  function tracked(Base) {
    return class extends Base {
      constructor(...args) {
        super(...args);
        this.addEventListener("dispose", () => {
          this.disposed = true;
        });
        resources.push(this);
      }
    };
  }
  const renderer = createFlagCloth(
    {
      ...THREE,
      PlaneGeometry: tracked(THREE.PlaneGeometry),
      RawShaderMaterial: tracked(THREE.RawShaderMaterial),
      WebGLRenderer: class {
        constructor() {
          resources.push(this);
        }
        setSize(width, height) {
          canvas.width = width;
          canvas.height = height;
        }
        render(scene) {
          paints.push(scene.children[0].material.uniforms.time.value);
        }
        dispose() {
          this.disposed = true;
        }
      },
      TextureLoader: class {
        load(source, onLoad) {
          assert.equal(source, "/flag.webp");
          load = onLoad;
          return new (tracked(THREE.Texture))();
        }
      },
    },
    canvas,
    "/flag.webp",
  );
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
    frames,
    events,
    attributes,
    paints,
    resources,
    load: () => load(),
    resize: () => resize(),
    get disconnected() {
      return disconnected;
    },
    frame(now) {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
    },
  };
}

test("flag waits for its texture, paints at 30fps and excludes paused time", (t) => {
  const scene = flag(t);
  scene.renderer.setPlaying(true);
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.attributes.size, 0);
  scene.load();
  assert.equal(scene.frames.size, 1);
  assert.ok(scene.attributes.has("data-flag-ready"));
  scene.renderer.setPlaying(true);
  scene.frame(0);
  scene.frame(8);
  assert.deepEqual(scene.paints, [0, 0]);
  scene.frame(16.67);
  assert.equal(scene.paints.at(-1), 0);
  scene.frame(33.34);
  assert.equal(scene.paints.at(-1), 0.03334);
  scene.renderer.setPlaying(false);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(true);
  scene.frame(100000);
  assert.equal(scene.paints.at(-1), 0.03334);
});

test("flag reuses an unchanged drawing buffer and stops when collapsed", (t) => {
  const scene = flag(t);
  scene.load();
  const paints = scene.paints.length;
  scene.resize();
  assert.equal(scene.paints.length, paints);
  scene.renderer.setPlaying(true);
  Object.assign(scene.canvas, { clientWidth: 0, clientHeight: 0 });
  scene.resize();
  assert.equal(scene.frames.size, 0);
  Object.assign(scene.canvas, { clientWidth: 800, clientHeight: 324 });
  scene.resize();
  assert.equal(scene.frames.size, 1);
});

test("flag waits for layout, bounds drawing buffers and restores a lost context while paused", (t) => {
  const scene = flag(t, 0, 0);
  scene.load();
  assert.equal(scene.attributes.size, 0);
  Object.assign(scene.canvas, { clientWidth: 7680, clientHeight: 4320 });
  scene.resize();
  assert.ok(scene.canvas.width <= 1600);
  assert.ok(scene.canvas.height <= 800);
  assert.ok(scene.attributes.has("data-flag-ready"));
  scene.renderer.setPlaying(true);
  let prevented = false;
  scene.events.get("webglcontextlost")({
    preventDefault() {
      prevented = true;
    },
  });
  assert.ok(prevented);
  assert.equal(scene.attributes.size, 0);
  assert.equal(scene.frames.size, 0);
  scene.renderer.setPlaying(false);
  scene.events.get("webglcontextrestored")();
  assert.ok(scene.attributes.has("data-flag-ready"));
  assert.equal(scene.frames.size, 0);
});

test("flag disposal releases GPU resources and a late texture cannot restart it", (t) => {
  const scene = flag(t);
  scene.renderer.setPlaying(true);
  scene.renderer.destroy();
  scene.load();
  scene.resize();
  scene.renderer.setPlaying(true);
  scene.renderer.destroy();
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.paints.length, 0);
  assert.equal(scene.events.size, 0);
  assert.equal(scene.attributes.size, 0);
  assert.ok(scene.disconnected);
  assert.ok(scene.resources.every(({ disposed }) => disposed));
});

test("unavailable WebGL leaves the flag's static artwork usable", () => {
  assert.equal(
    createFlagCloth(
      {
        WebGLRenderer: class {
          constructor() {
            throw new Error("No WebGL");
          }
        },
      },
      {},
      "/flag.webp",
    ),
    null,
  );
});
