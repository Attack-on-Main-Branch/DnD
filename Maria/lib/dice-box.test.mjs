import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { setImmediate as immediate } from "node:timers/promises";

const source = await readFile(
  new URL("./dice-box.js", import.meta.url),
  "utf8",
);
const dataModule = (code) =>
  `data:text/javascript;base64,${Buffer.from(code + "\n//# sourceURL=dice-runtime-test.mjs").toString("base64")}`;
const vendor = dataModule(`
  window.physicsBlob = new window.Blob(["btDiscreteDynamicsWorld"]);
  export default window.MockDiceBox;
`);
const babylon = dataModule("export const E = window.MockEngine;");
let modules = 0;

async function runtime(t, behaviour = "ready") {
  const previous = globalThis.window;
  const previousDocument = globalThis.document;
  const previousOffscreen = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = class {};
  const events = new EventTarget();
  const workers = [];
  const resize = new Set();
  const canvases = [];
  globalThis.document = {
    getElementById() {
      return null;
    },
    createElement() {
      const canvas = new EventTarget();
      canvas.removed = false;
      canvas.lost = false;
      canvas.remove = () => {
        canvas.removed = true;
      };
      canvas.getContext = () => ({
        getExtension: () => ({
          loseContext: () => {
            canvas.lost = true;
          },
        }),
      });
      if (behaviour !== "onscreen")
        canvas.transferControlToOffscreen = () => ({});
      canvases.push(canvas);
      return canvas;
    },
  };
  class Worker extends EventTarget {
    constructor(url) {
      super();
      this.url = url;
      this.messages = [];
      this.terminated = false;
      workers.push(this);
    }
    postMessage(message) {
      this.messages.push(message);
    }
    terminate() {
      this.terminated = true;
    }
  }
  class MockDiceBox {
    constructor(config) {
      this.config = config;
      document.createElement("canvas");
      this.canvas = document.createElement("canvas");
      this.loadThemeQueue = { flush: async () => {} };
    }
    async init() {
      const heartbeat = new window.Worker("blob:heartbeat");
      heartbeat.postMessage({ event: "start", interval: 25000 });
      const physics = new window.Worker(
        window.URL.createObjectURL(window.physicsBlob),
      );
      physics.postMessage({
        action: "init",
        options: this.config,
        width: 20,
        height: 20,
      });
      if (window.behaviour === "onscreen") {
        const engine = {
          getRenderingCanvas: () => this.canvas,
          dispose() {
            window.MockEngine.Instances.splice(
              window.MockEngine.Instances.indexOf(this),
              1,
            );
          },
        };
        window.MockEngine.Instances.push(engine);
      } else {
        const renderer = new window.Worker("blob:renderer");
        renderer.postMessage({
          action: "init",
          options: this.config,
          canvas: this.canvas,
        });
      }
      this.resizeWorld();
      if (window.behaviour === "reject") throw new Error("Broken shader");
      if (window.behaviour === "hang") await new Promise(() => {});
    }
    resizeWorld() {
      window.addEventListener("resize", () => {});
    }
    clear() {}
  }
  const win = {
    Worker,
    MockDiceBox,
    MockEngine: { Instances: [] },
    Blob,
    behaviour,
    URL: { createObjectURL: () => "blob:physics", revokeObjectURL() {} },
    addEventListener(event, handler, options) {
      if (event === "resize") resize.add(handler);
      events.addEventListener(event, handler, options);
    },
    removeEventListener(event, handler, options) {
      resize.delete(handler);
      events.removeEventListener(event, handler, options);
    },
  };
  globalThis.window = win;
  t.after(() => {
    globalThis.window = previous;
    globalThis.document = previousDocument;
    globalThis.OffscreenCanvas = previousOffscreen;
  });
  const api = await import(
    dataModule(
      source
        .replace('"@3d-dice/dice-box/dist/Dice.js"', JSON.stringify(babylon))
        .replace(
          '"@3d-dice/dice-box"',
          JSON.stringify(vendor + `#${++modules}`),
        ),
    )
  );
  return {
    api,
    win,
    workers,
    resize,
    canvases,
    config: { assetPath: "/assets/dice/", tray: { width: 1000, height: 600 } },
  };
}

test("dice teardown never captures or terminates a realtime heartbeat worker", async (t) => {
  const { api, win, workers, resize, canvases, config } = await runtime(t);
  const native = win.Worker;
  const built = await api.buildDiceBox(config);
  assert.equal(built.workers.length, 2);
  assert.equal(canvases[0].lost, true);
  assert.equal(canvases[0].removed, true);
  assert.equal(built.box.canvas.lost, false);
  assert.equal(built.physics.messages[0].width, 1000);
  assert.equal(built.physics.messages[0].height, 600);
  assert.equal(resize.size, 1);
  built.box.resizeWorld();
  assert.equal(resize.size, 1);
  assert.equal(win.Worker, native);
  api.tearDownDiceBox(built);
  assert.equal(resize.size, 0);
  assert.equal(built.box.canvas.removed, true);
  assert.equal(workers[0].terminated, false);
  assert.ok(built.workers.every((worker) => worker.terminated));
});

test("on-screen fallback engines leave Babylon's registry during teardown", async (t) => {
  const { api, win, config } = await runtime(t, "onscreen");
  const built = await api.buildDiceBox(config);
  assert.equal(win.MockEngine.Instances.length, 1);
  api.tearDownDiceBox(built);
  assert.equal(win.MockEngine.Instances.length, 0);
});

test("partial builds release resources and the next queued build succeeds", async (t) => {
  const { api, win, workers, resize, config } = await runtime(t, "reject");
  const native = win.Worker;
  await assert.rejects(
    api.queueDiceBuild(() => api.buildDiceBox(config)),
    /Broken shader/,
  );
  assert.equal(resize.size, 0);
  assert.equal(win.Worker, native);
  assert.ok(workers.slice(1).every((worker) => worker.terminated));
  win.behaviour = "ready";
  const built = await api.queueDiceBuild(() => api.buildDiceBox(config));
  api.tearDownDiceBox(built);
  assert.equal(resize.size, 0);
});

test("a stalled build times out, restores globals and frees the shared build queue", async (t) => {
  const { api, win, workers, resize, config } = await runtime(t, "hang");
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = api.queueDiceBuild(() => api.buildDiceBox(config));
  const failure = assert.rejects(pending, /timed out/);
  await immediate();
  t.mock.timers.tick(15000);
  await failure;
  assert.equal(resize.size, 0);
  assert.ok(workers.slice(1).every((worker) => worker.terminated));
  win.behaviour = "ready";
  const built = await api.queueDiceBuild(() => api.buildDiceBox(config));
  api.tearDownDiceBox(built);
});

test("worker and graphics failures mark a live roller for recovery", async (t) => {
  const { api, config } = await runtime(t);
  const built = await api.buildDiceBox(config);
  assert.equal(built.failed, false);
  built.physics.dispatchEvent(new Event("error"));
  assert.equal(built.failed, true);
  api.tearDownDiceBox(built);
  const next = await api.buildDiceBox(config);
  next.box.canvas.dispatchEvent(new Event("webglcontextlost"));
  assert.equal(next.failed, true);
  api.tearDownDiceBox(next);
});

test("hundreds of rebuilds keep resize listeners and live dice workers bounded", async (t) => {
  const { api, config, resize, workers } = await runtime(t);
  for (let round = 0; round < 250; round++) {
    const built = await api.buildDiceBox(config);
    assert.equal(resize.size, 1);
    api.tearDownDiceBox(built);
    assert.equal(resize.size, 0);
  }
  assert.equal(
    workers.filter(
      (worker) => worker.url !== "blob:heartbeat" && !worker.terminated,
    ).length,
    0,
  );
});

async function manager(t, configure) {
  const environment = await runtime(t);
  const { api } = environment;
  const roller = await readFile(
    new URL(
      "../app/dashboard/campaign/[id]/play/dice-engine.js",
      import.meta.url,
    ),
    "utf8",
  );
  const box = dataModule(
    `export const {buildDiceBox, DICE_WORLD_ROLL_LIMIT, DICE_WORLD_BODY_LIMIT, queueDiceBuild, RESTED_MESSAGE, SEED_MESSAGE, SEEDED_MESSAGE, tearDownDiceBox} = window.testDiceBox; // ${modules}`,
  );
  window.testDiceBox = { ...api };
  configure?.(window.testDiceBox);
  const themes = dataModule(
    "export const DICE_ASSET_PATH='/assets/dice/', DICE_BODY_THEME='obsidian', DICE_LIGHTING={}, DICE_THEMES={obsidian:{body:'black'}};",
  );
  const engine = await import(
    dataModule(
      roller
        .replace('"@/lib/dice-box"', JSON.stringify(box))
        .replace('"@/lib/dice-themes"', JSON.stringify(themes))
        .replace(
          '"sina/rules/dice"',
          JSON.stringify(import.meta.resolve("sina/rules/dice")),
        ),
    )
  );
  t.after(() => engine.releaseDice());
  return { ...environment, engine };
}

test("leaving a table cancels rolls waiting for a map", async (t) => {
  const { engine, workers } = await manager(t);
  const { diceEngine, releaseDice, abandonDice } = engine;
  const first = assert.rejects(diceEngine(0), /before a map arrived/);
  const second = assert.rejects(diceEngine(1), /before a map arrived/);
  releaseDice();
  await Promise.all([first, second]);
  const next = assert.rejects(diceEngine(0), /before a map arrived/);
  abandonDice(0);
  await next;
  assert.equal(workers.length, 0);
});

async function simulatedManager(t) {
  return manager(t, (api) => {
    api.buildDiceBox = async (config, initialise) => {
      const physics = new EventTarget();
      physics.postMessage = (message) => {
        if (message.action !== api.SEED_MESSAGE) return;
        const event = new Event("message");
        event.data = { action: api.SEEDED_MESSAGE };
        physics.dispatchEvent(event);
      };
      const box = {
        clears: 0,
        throws: 0,
        loadThemeQueue: { push: async (load) => load() },
        loadTheme: async () => {},
        updateConfig: async () => {},
        roll: async () => {
          box.throws += 1;
        },
        clear: () => {
          box.clears += 1;
        },
        getRollResults: () => [{ value: 20 }],
      };
      const built = {
        box,
        physics,
        workers: [],
        rolls: 0,
        bodies: 0,
        busy: false,
        failed: false,
        fault: new Promise(() => {}),
      };
      await initialise(built);
      return built;
    };
  });
}

test("renewal waits for the die to be cleared and old cleanup cannot clear its replacement", async (t) => {
  const { engine, api } = await simulatedManager(t);
  engine.holdTray(1000, 600);
  const first = await engine.diceEngine(0);
  const old = engine.diceGeneration(0);
  first.rolls = api.DICE_WORLD_ROLL_LIMIT;
  first.busy = true;
  assert.equal(await engine.diceEngine(0), first);
  engine.clearDice(0, old);
  const next = await engine.diceEngine(0);
  assert.notEqual(next, first);
  const clears = next.box.clears;
  engine.clearDice(0, old);
  engine.abandonDice(0, old);
  assert.equal(next.box.clears, clears);
  assert.equal(await engine.diceEngine(0), next);
});

test("an obsolete throw cannot start after its awaited theme arrives", async (t) => {
  const { engine } = await simulatedManager(t);
  engine.holdTray(1000, 600);
  const built = await engine.diceEngine(0);
  let finishTheme;
  built.box.loadThemeQueue.push = () =>
    new Promise((resolve) => {
      finishTheme = resolve;
    });
  const controller = new AbortController();
  const roll = engine.throwDie({
    notation: "1d20",
    theme: "obsidian",
    seed: 7,
    signal: controller.signal,
  });
  const rejected = assert.rejects(roll, /replaced during the throw/);
  await immediate();
  controller.abort();
  finishTheme();
  await rejected;
  assert.equal(built.box.throws, 1);
});
