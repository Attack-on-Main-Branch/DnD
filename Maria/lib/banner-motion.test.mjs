import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  observeBannerMotion,
  observeBannerRenderer,
} from "./banner-motion.mjs";

const original = {
  window: globalThis.window,
  document: globalThis.document,
  IntersectionObserver: globalThis.IntersectionObserver,
};
let observers;
let visibility;
let changes;
let preference;
let cleanups;

beforeEach(() => {
  observers = [];
  visibility = new Set();
  changes = new Set();
  cleanups = [];
  preference = {
    matches: false,
    addEventListener: (_event, listener) => changes.add(listener),
    removeEventListener: (_event, listener) => changes.delete(listener),
  };
  globalThis.window = { matchMedia: () => preference };
  globalThis.document = {
    hidden: false,
    addEventListener: (_event, listener) => visibility.add(listener),
    removeEventListener: (_event, listener) => visibility.delete(listener),
  };
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) {
      this.targets.add(target);
    }
    unobserve(target) {
      this.targets.delete(target);
    }
    disconnect() {
      this.disconnected = true;
    }
  };
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[name];
    else globalThis[name] = value;
  }
});

function banner(onPlaying, loadRenderer) {
  const values = new Map();
  const surface = {
    style: {
      getPropertyValue: (key) => values.get(key) ?? "",
      setProperty: (key, value) => values.set(key, value),
    },
  };
  const cleanup = loadRenderer
    ? observeBannerRenderer(surface, loadRenderer)
    : observeBannerMotion(surface, onPlaying);
  cleanups.push(cleanup);
  return { surface, values, cleanup };
}

function intersect(surface, ratio) {
  observers
    .at(-1)
    .callback([
      { target: surface, isIntersecting: true, intersectionRatio: ratio },
    ]);
}

test("banners share visibility listeners and release the last observer", () => {
  const first = banner();
  const second = banner();
  assert.equal(observers.length, 1);
  assert.equal(visibility.size, 1);
  assert.equal(changes.size, 1);
  first.cleanup();
  assert.equal(observers[0].disconnected, false);
  second.cleanup();
  assert.equal(observers[0].disconnected, true);
  assert.equal(visibility.size, 0);
  assert.equal(changes.size, 0);
  banner();
  assert.equal(observers.length, 2);
});

test("collapsed and off-screen banners pause and release GPU hints", () => {
  const { surface, values } = banner();
  intersect(surface, 0);
  assert.equal(values.get("--banner-play-state"), "paused");
  intersect(surface, 0.8);
  assert.equal(values.get("--banner-play-state"), "running");
  assert.equal(values.get("--banner-will-change"), "transform");
  intersect(surface, 0);
  assert.equal(values.get("--banner-play-state"), "paused");
  assert.equal(values.get("--banner-will-change"), "auto");
});

test("returning to the page resumes only banners still in view", () => {
  const visible = banner();
  const offscreen = banner();
  intersect(visible.surface, 1);
  document.hidden = true;
  for (const listener of visibility) listener();
  assert.equal(visible.values.get("--banner-play-state"), "paused");
  document.hidden = false;
  for (const listener of visibility) listener();
  assert.equal(visible.values.get("--banner-play-state"), "running");
  assert.equal(offscreen.values.get("--banner-play-state"), "paused");
});

test("motion preferences update mounted banners without restarting observers", () => {
  const { surface, values } = banner();
  intersect(surface, 1);
  preference.matches = true;
  for (const listener of changes) listener();
  assert.equal(values.get("--banner-play-state"), "paused");
  assert.equal(values.get("--banner-will-change"), "auto");
  preference.matches = false;
  for (const listener of changes) listener();
  assert.equal(values.get("--banner-play-state"), "running");
  assert.equal(observers.length, 1);
});

test("imperative animations share motion changes without duplicate starts", () => {
  const states = [];
  const { surface, cleanup } = banner((playing) => states.push(playing));
  intersect(surface, 1);
  intersect(surface, 1);
  document.hidden = true;
  for (const listener of visibility) listener();
  document.hidden = false;
  for (const listener of visibility) listener();
  preference.matches = true;
  for (const listener of changes) listener();
  preference.matches = false;
  for (const listener of changes) listener();
  cleanup();
  assert.deepEqual(states, [false, true, false, true, false, true, false]);
});

test("a reused surface receives its initial pause even with an existing inline style", () => {
  const states = [];
  const { surface, cleanup } = banner();
  cleanup();
  cleanups.push(
    observeBannerMotion(surface, (playing) => states.push(playing)),
  );
  assert.deepEqual(states, [false]);
});

test("renderers load on visibility and wait to allocate if hidden while loading", async () => {
  let finish;
  let loads = 0;
  let creates = 0;
  let destroys = 0;
  const states = [];
  const { surface, cleanup } = banner(null, () => {
    loads++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  assert.equal(loads, 0);
  intersect(surface, 1);
  assert.equal(loads, 1);
  intersect(surface, 0);
  finish(() => {
    creates++;
    return {
      setPlaying: (playing) => states.push(playing),
      destroy: () => destroys++,
    };
  });
  await Promise.resolve();
  assert.equal(creates, 0);
  intersect(surface, 1);
  intersect(surface, 1);
  assert.equal(creates, 1);
  assert.deepEqual(states, [true]);
  intersect(surface, 0);
  assert.deepEqual(states, [true, false]);
  cleanup();
  assert.equal(destroys, 1);
});

test("late renderer imports cannot allocate after unmount", async () => {
  let finish;
  let creates = 0;
  const { surface, cleanup } = banner(
    null,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  intersect(surface, 1);
  cleanup();
  finish(() => {
    creates++;
  });
  await Promise.resolve();
  assert.equal(creates, 0);
});

test("reduced motion never loads an imperative renderer", () => {
  preference.matches = true;
  let loads = 0;
  const { surface } = banner(null, () => {
    loads++;
    return Promise.resolve(() => null);
  });
  intersect(surface, 1);
  assert.equal(loads, 0);
});
