import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(
  new URL(
    "../app/components/paths-background/animation/renderer.js",
    import.meta.url,
  ),
  "utf8",
);
const dataModule = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const modules = {
  "./paths.js": dataModule(`
    export const BULB_LIFE = 1;
    export class PathField {
      segments=[]; bulbs=[]; time=0; generation=0; dissolveId=0; fadeLevel=1;
      setSize() {}
      step(dt) { this.time += dt; }
    }
  `),
  "./dust.js": dataModule(`
    export class DustField { motes=[]; setSize() {} step() {} }
  `),
  "./sprites.js": dataModule("export const createSprites=()=>({});"),
  "./brush.js": dataModule("export const createBrush=()=>()=>{};"),
  "./palette.js": dataModule(
    "export const HIGHLIGHT=[],mix=()=>[],rgba=()=>'',sampleRamp=()=>[];",
  ),
  "./config.js": dataModule(
    "export const GLOW_SPREAD=1,PATH_BRIGHTNESS=1,SPEED=1;",
  ),
};
const { createRenderer } = await import(
  dataModule(
    source.replace(
      /from "([^"]+)"/g,
      (_, path) => `from ${JSON.stringify(modules[path])}`,
    ),
  )
);

function renderer(t, width = 1000, height = 600) {
  const previous = Object.fromEntries(
    [
      "window",
      "document",
      "ResizeObserver",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].map((key) => [key, globalThis[key]]),
  );
  const frames = new Map();
  const copies = [];
  let sequence = 0;
  let now = 0;
  const canvas = () => {
    const context = {
      clears: 0,
      setTransform() {},
      drawImage() {},
      clearRect() {
        this.clears++;
      },
    };
    return {
      width: 0,
      height: 0,
      style: {},
      context,
      getContext: () => context,
    };
  };
  const document = new EventTarget();
  document.hidden = false;
  document.createElement = () => {
    const copy = canvas();
    copies.push(copy);
    return copy;
  };
  const window = new EventTarget();
  window.devicePixelRatio = 2;
  Object.assign(globalThis, {
    window,
    document,
    ResizeObserver: undefined,
    requestAnimationFrame(callback) {
      frames.set(++sequence, callback);
      return sequence;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  });
  t.mock.method(performance, "now", () => now);
  const host = { clientWidth: width, clientHeight: height, dataset: {} };
  const bloom = canvas();
  const dust = canvas();
  const trails = [canvas(), canvas()];
  const api = createRenderer({ host, bloom, dust, trails });
  t.after(() => {
    api.destroy();
    Object.assign(globalThis, previous);
  });
  api.start();
  return {
    api,
    host,
    bloom,
    dust,
    trails,
    copies,
    frames,
    document,
    window,
    frame(at) {
      now = at;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
    },
    visibility(hidden, at) {
      now = at;
      document.hidden = hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

test("a 120Hz display does not repaint unchanged background frames", (t) => {
  const scene = renderer(t);
  const before = scene.dust.context.clears;
  for (let frame = 1; frame <= 120; frame++) scene.frame((frame * 1000) / 120);
  const draws = scene.dust.context.clears - before;
  assert.ok(draws >= 59 && draws <= 60, `${draws} draws for 120 frames`);
});

test("hidden tabs suspend animation and resume without catching up hidden time", (t) => {
  const scene = renderer(t);
  scene.visibility(true, 0);
  assert.equal(scene.frames.size, 0);
  assert.equal(scene.host.dataset.paused, "true");
  const before = scene.dust.context.clears;
  scene.visibility(false, 60_000);
  scene.frame(60_000);
  assert.equal(scene.dust.context.clears, before);
  scene.frame(60_020);
  assert.equal(scene.dust.context.clears, before + 1);
});

test("4K buffers are bounded and temporary resize snapshots are released", (t) => {
  const scene = renderer(t, 3840, 2160);
  for (const canvas of [...scene.trails, scene.dust]) {
    assert.ok(canvas.width * canvas.height <= 1920 * 1080 * 4);
  }
  scene.host.clientWidth = 3000;
  scene.window.dispatchEvent(new Event("resize"));
  scene.frame(20);
  assert.equal(scene.copies.length, 2);
  assert.ok(
    scene.copies.every((canvas) => canvas.width === 0 && canvas.height === 0),
  );
  scene.api.destroy();
  assert.equal(scene.frames.size, 0);
  assert.ok(
    [...scene.trails, scene.dust, scene.bloom].every(
      (canvas) => canvas.width === 0,
    ),
  );
});
