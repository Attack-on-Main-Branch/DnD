"use client";

import { DICE_CORNERS, diceCorner } from "sina/rules/dice";

import {
  DICE_ASSET_PATH,
  DICE_BODY_THEME,
  DICE_LIGHTING,
  DICE_THEMES,
} from "@/lib/dice-themes";

/**
 * The 3D roller's whole lifecycle, kept out of React.
 *
 * `@3d-dice/dice-box` is a megabyte of BabylonJS and ammo.js, so it is
 * `import()`ed rather than shipped with the table. It has no `dispose()`, so
 * one instance exists at a time and `releaseDice` takes it down by hand.
 *
 * Which is why `window.Worker`, `window.Blob` and `URL.createObjectURL` are
 * stood on for the length of a build: the workers are private fields and
 * `terminate()` is the only way to stop the simulation loop, and the Blob is
 * where the physics worker's source can be reached before it becomes a thread.
 *
 * Not reclaimed: the `resize` listener `resizeWorld()` adds inside an async
 * `init()`, which the library keeps no reference to.
 */

/**
 * How many worlds this page keeps, and so how many throws can be in the air at
 * once. Each costs a WebGL context, two threads and a copy of ammo.wasm.
 *
 * A LANE IS NOT PART OF A ROLL: every lane is the same arena built from the
 * same tray, so which one a throw lands in is this browser's own business. What
 * the chairs must agree on is the corner, and that is `diceCorner` on the seed.
 */
export const DICE_LANES = 3;

/**
 * dice-box takes a CSS SELECTOR for its container and refuses an element, so a
 * fixed id is honest — `useId` would give `:r1:`, which is not a selector
 * without escaping every colon in it.
 */
export function diceStageId(lane) {
  return `dice-arena-stage-${lane}`;
}

/** The arena's own world, in dice-box's units. Its walls are built from this. */
const ARENA_SIZE = 9.5;

/** How far into the corner a die starts, as a fraction of the arena's half. */
const CORNER = 0.86;

/**
 * Where the corners are, as the sign of each on x and z. The first is the one
 * every throw used to come from, which keeps `warmWorld` the throw it was.
 */
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

// A corner named in the rules and never placed here would throw from nowhere.
if (CORNERS.length !== DICE_CORNERS) {
  throw new Error(
    `The arena places ${CORNERS.length} of ${DICE_CORNERS} corners.`,
  );
}

/** How long a die that will not lie down is given before it is put down. */
const SETTLE_MS = 4000;

/** The same, for the one throw nobody watches. See `warmWorld`. */
const WARM_SETTLE_MS = 150;

const CONFIG = {
  assetPath: DICE_ASSET_PATH,
  theme: DICE_BODY_THEME,
  preloadThemes: Object.keys(DICE_THEMES),
  themeColor: DICE_THEMES[DICE_BODY_THEME].body,
  size: ARENA_SIZE,
  scale: 7,
  /* Thrown from above the lip and hard, with enough spin to tumble and enough
     bounce to read as bone on wood — but damped, or a d20 skates for seconds
     against the far wall while everybody waits for a number. */
  startingHeight: 9,
  throwForce: 2.2,
  spinForce: 6,
  friction: 0.8,
  restitution: 0.35,
  linearDamping: 0.55,
  angularDamping: 0.32,
  settleTimeout: SETTLE_MS,
  // Shared with the creation sheet's preview roller, so the die a player picks
  // a colour for is lit as the die they will throw.
  ...DICE_LIGHTING,
};

/*
 * ONE ROLL, ON EVERY SCREEN AT THE TABLE
 *
 * dice-box cannot be told what a die should land on, so a shared roll can only
 * be a shared SIMULATION. WebAssembly's arithmetic is specified to the bit and
 * every table loads the same ammo.wasm, so identical inputs give an identical
 * tumble anywhere. Three inputs are not identical by default:
 *
 *   1. THE THROW. `Math.random` in the physics worker decides a body's opening
 *      orientation, velocity and spin — eight draws each. `PRELUDE` seeds it,
 *      and the roller puts the seed on the wire.
 *
 *   2. THE STEP. The worker hands `stepSimulation` real elapsed milliseconds,
 *      so two machines take differently sized steps. `PRELUDE` gives it whole
 *      ticks of the physics' own 1/90s step — Bullet keeps the remainder of a
 *      step it could not use BETWEEN rolls, so a tick that did not divide the
 *      fixed step would let one roll decide where the next one starts.
 *
 *   3. THE ARENA. The walls are built from the canvas' pixel size, so `init`
 *      and `resize` are rewritten to carry the map's intrinsic size instead.
 *
 * A fourth is not an input: the FIRST roll in a new world differs from every
 * roll after it, Bullet's broadphase being cold. See `warmWorld`.
 */

/** A string only the physics worker's own source contains. */
const PHYSICS_MARK = "btDiscreteDynamicsWorld";

const SEED = "__seed";
const SEEDED = "__seeded";

/**
 * Prepended to the physics worker's source, where it runs before anything else
 * in that thread.
 *
 * `Math.random` becomes mulberry32; `Date` becomes the tick clock above.
 * `Date.now` is left alone — emscripten's `gettimeofday` uses it, and it never
 * reaches the simulation.
 *
 * The clock also stands still until every body of the roll is in the world. A
 * percentile roll is two dice to dice-box, added one after the other across an
 * await, so on one machine the simulation takes a step between them and on
 * another it does not — which showed as d100 agreeing about half the time while
 * every other die always did. The dice arrive on the render worker's port,
 * whose handler is wrapped as it is set.
 */
const PRELUDE = `(function () {
  var seed = 1;

  Math.random = function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  var TICK = 1000 / 90;
  var RealDate = Date;
  var since = RealDate.now();
  var owed = 0;
  var ticks = 0;

  var expected = 1;
  var seen = 0;
  var waiting = RealDate.now();

  // A body that never arrives would hold the clock for ever, and a rail that
  // never reopens is worse than a roll one chair saw differently.
  var PATIENCE = 2000;

  function ready() {
    return seen >= expected || RealDate.now() - waiting > PATIENCE;
  }

  function Clock() {
    var now = RealDate.now();

    owed += now - since;
    since = now;

    var whole = 0;

    if (ready()) {
      whole = Math.floor(owed / TICK);

      if (whole > 2) whole = 2;

      owed -= whole * TICK;
    } else {
      // Not banked: the wait is not time the dice have spent falling.
      owed = 0;
    }

    ticks += whole;
    this.at = ticks * TICK;
  }

  Clock.prototype.getTime = function () {
    return this.at;
  };

  Clock.now = RealDate.now;
  Clock.parse = RealDate.parse;
  Clock.UTC = RealDate.UTC;

  self.Date = Clock;

  function count(port) {
    var given = null;

    Object.defineProperty(port, "onmessage", {
      configurable: true,
      get: function () {
        return given;
      },
      set: function (handler) {
        given = handler;

        port.addEventListener("message", function (event) {
          if (event.data && event.data.action === "addDie") {
            seen += 1;
          }

          handler.call(port, event);
        });

        // Assigning onmessage would have started the port; a listener does not.
        port.start();
      },
    });
  }

  // Registered before the library assigns self.onmessage, so it runs first and
  // stopImmediatePropagation keeps our own message out of a switch that would
  // only log that it had never heard of it.
  self.addEventListener("message", function (event) {
    var data = event.data;

    if (!data) return;

    if (data.action === "connect" && event.ports && event.ports[0]) {
      count(event.ports[0]);
      return;
    }

    if (data.action !== "${SEED}") return;

    seed = data.seed | 0;
    expected = data.bodies > 0 ? data.bodies : 1;
    seen = 0;
    waiting = RealDate.now();
    owed = 0;
    since = RealDate.now();

    event.stopImmediatePropagation();
    self.postMessage({ action: "${SEEDED}" });
  });
})();
`;

/**
 * One record per lane: the engine it is holding, the build that will become
 * one, and which arena either belongs to.
 *
 * `arena` is bumped by every release and checked when a build lands: leaving
 * the table while the library is still loading is a couple of seconds wide, and
 * an engine that finishes after its stage has gone is one nothing can hand
 * back.
 */
const lanes = Array.from({ length: DICE_LANES }, () => ({
  pending: null,
  live: null,
  arena: 0,
}));

/**
 * The tray, in the map picture's own pixels — the one measurement every chair
 * agrees on, being a property of the picture rather than of the window it is
 * looked at through.
 */
let tray = null;
let awaitingTray = [];

/**
 * The physics worker's source with the prelude in front of it, kept for the
 * life of the page. dice-box builds that Blob ONCE, at the top level of its own
 * module, so a second engine reuses the same object and would otherwise have no
 * way of recognising the worker it was about to be handed.
 */
let seededBlob = null;

/**
 * The board, announcing the picture it has been laid over.
 *
 * A DIFFERENT PICTURE IS A DIFFERENT ARENA. The physics walls are built from
 * these two numbers once, at build time, and nothing in dice-box moves them
 * afterwards — so a Dungeon Master switching to a map of another shape would
 * leave the dice rolling inside the old one's rectangle, visibly off the board
 * at one edge and stopping short at the other. The world is dropped instead and
 * the next roll builds it again, which costs a second nobody is waiting on: the
 * switch is not a throw.
 */
export function holdTray(width, height) {
  if (tray && (tray.width !== width || tray.height !== height)) {
    for (let lane = 0; lane < DICE_LANES; lane += 1) {
      discardDice(lane);
    }
  }

  tray = { width, height };

  const held = awaitingTray;

  awaitingTray = [];

  for (const resolve of held) {
    resolve(tray);
  }
}

function theTray() {
  return tray
    ? Promise.resolve(tray)
    : new Promise((resolve) => awaitingTray.push(resolve));
}

/**
 * One of the four corners, in world units.
 *
 * WHICH PICTURE CORNER EACH IS depends on how the camera is hung: dice-box
 * looks straight down from (0, 36.5, 0), and `Matrix.LookAtLH` derives its
 * right axis as -x and its up as -z, so `CORNERS[0]` is the picture's TOP-RIGHT
 * and the rest read round the opposite way to the one an eye expects.
 *
 * `newStartPoint: false` on every roll is what stops the library picking a
 * random edge of its own — and keeps the five draws that would spend out of the
 * sequence the seed is counting.
 */
function startCorner(ratio, corner) {
  const half = ARENA_SIZE / 2;
  const [x, z] = CORNERS[corner];

  return [x * half * ratio * CORNER, CONFIG.startingHeight, z * half * CORNER];
}

/**
 * How many bodies a notation puts in the world, which is what the seed's clock
 * waits for. One each, except percentile: dice-box builds every d100 out of a
 * tens die and a units die.
 */
function bodies(notation) {
  const [count, sides] = notation.split("d").map(Number);

  return count * (sides === 100 ? 2 : 1);
}

/** The next throw's numbers, settled in the worker before a die is added. */
function sow(worker, seed, count) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener("message", answer);
      reject(new Error("The dice would not take a seed."));
    }, 4000);

    function answer(event) {
      if (event.data?.action !== SEEDED) {
        return;
      }

      clearTimeout(timer);
      worker.removeEventListener("message", answer);
      resolve();
    }

    worker.addEventListener("message", answer);
    worker.postMessage({ action: SEED, seed, bodies: count });
  });
}

/**
 * One throw nobody watches, so that no table's first real roll is ever a
 * world's first roll. `settleTimeout` is dropped to a blink for it, which is
 * what keeps it from costing the three seconds a watched roll takes. The corner
 * is set here and never resent: it is derived from the tray, the tray does not
 * move, and `updateConfig` rebuilds all six walls every time it is called.
 */
async function warmWorld(box, physics, start) {
  await sow(physics, 0, 1);
  await box.updateConfig({
    startPosition: start,
    settleTimeout: WARM_SETTLE_MS,
  });
  await box.roll("1d20", {
    theme: CONFIG.theme,
    themeColor: CONFIG.themeColor,
    newStartPoint: false,
  });

  box.clear();

  await box.updateConfig({ startPosition: start, settleTimeout: SETTLE_MS });
}

async function build(lane) {
  const { width, height } = await theTray();

  const NativeBlob = window.Blob;
  const NativeWorker = window.Worker;
  const nativeObjectURL = window.URL.createObjectURL;

  const workers = [];
  let seededUrl = null;
  let physics = null;

  /* Caught on its way INTO a Blob rather than out of one: the parts are still
     the plain string the library decoded, so the prelude can go in front of it
     with no fetch to wait on. The render worker's source comes through here
     too, and is left alone. */
  window.Blob = class extends NativeBlob {
    constructor(parts, options) {
      const source =
        Array.isArray(parts) &&
        parts.length === 1 &&
        typeof parts[0] === "string"
          ? parts[0]
          : null;

      if (source?.includes(PHYSICS_MARK)) {
        super([PRELUDE + source], options);
        seededBlob = this;
        return;
      }

      super(parts, options);
    }
  };

  window.URL.createObjectURL = function (object) {
    const url = nativeObjectURL.call(window.URL, object);

    if (object === seededBlob) {
      seededUrl = url;
    }

    return url;
  };

  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      workers.push(this);

      if (typeof url !== "string" || url !== seededUrl) {
        return;
      }

      physics = this;

      /* The tray, in place of the window. `resize` goes through here too: the
         walls are rebuilt from it, and a table whose walls move when somebody
         drags their window is rolling something nobody else is. */
      const post = this.postMessage.bind(this);

      this.postMessage = (message, transfer) => {
        if (message?.action === "init" || message?.action === "resize") {
          post({ ...message, width, height }, transfer);
          return;
        }

        post(message, transfer);
      };
    }
  };

  try {
    const { default: DiceBox } = await import("@3d-dice/dice-box");

    const box = new DiceBox({ ...CONFIG, container: `#${diceStageId(lane)}` });

    await box.init();

    /* No worker, no seed; no seed, and this browser would be showing a roll of
       its own invention beside somebody else's number. Better no picture than
       the wrong one. */
    if (!physics) {
      throw new Error("The dice could not be pinned to the table's own roll.");
    }

    /* `init()` kicks `preloadThemes` off and does not wait for it, and a throw
       that lands in the middle of a mesh being registered finds a renderer with
       nothing to draw — a white board. */
    await box.loadThemeQueue.flush();

    const ratio = width / height;

    await warmWorld(box, physics, startCorner(ratio, 0));

    // The ratio outlives the build: every throw sets its own corner, and the
    // tray is what turns a corner into a place in the world.
    return { box, physics, workers, ratio };
  } finally {
    window.Blob = NativeBlob;
    window.Worker = NativeWorker;
    window.URL.createObjectURL = nativeObjectURL;
  }
}

/**
 * One build at a time. `build` stands on three globals for its own length, so a
 * second starting inside the first would wrap the first's wrappers — and then
 * the first's `workers` would hold the SECOND's threads, and its teardown would
 * terminate an engine somebody is about to roll on. React runs an effect twice
 * on mount in development, which is exactly that shape.
 */
let queue = Promise.resolve();

function queued(step) {
  const next = queue.then(step, step);

  queue = next.then(
    () => {},
    () => {},
  );

  return next;
}

/**
 * Whether the world we are holding still paints onto the board on the page.
 *
 * The canvas is held in module state rather than by React, so React cannot take
 * it away — but it CAN take the stage out from under it, leaving the roller
 * simulating perfectly into a detached box. True only when there IS a stage and
 * this is not in it: a table with no map has no board to miss.
 */
function stranded(built, lane) {
  const stage = document.getElementById(diceStageId(lane));

  return Boolean(stage) && built?.box?.canvas?.parentElement !== stage;
}

/**
 * The roller, built on demand into the stage and reused after that. Rejects the
 * way `import()` does — a caller with no engine falls back to rolling the
 * number itself. The arena is checked INSIDE the queued step, so an engine that
 * has been overtaken is taken down before the next is started rather than
 * during it.
 */
export function diceEngine(lane = 0) {
  const held = lanes[lane];

  if (held.live) {
    if (!stranded(held.live, lane)) {
      return Promise.resolve(held.live);
    }

    // One roll without dice, then it builds again.
    discardDice(lane);
  }

  const mine = held.arena;

  held.pending ??= queued(async () => {
    const built = await build(lane);

    if (mine !== held.arena) {
      tearDown(built);
      throw new Error("The dice arena went away while it was being built.");
    }

    held.live = built;

    return built;
  }).catch((error) => {
    // Only if nothing has moved on: a release has already cleared this, and
    // whatever is being built now is not ours to throw away.
    if (mine === held.arena) {
      held.pending = null;
    }

    throw error;
  });

  return held.pending;
}

/**
 * One die, thrown in from the corner on the table's own seed and in the colour
 * whoever threw it rolls, resolved to the face it settles on. Every chair calling this with the same die and seed
 * watches the same throw and reads the same number off the end of it.
 *
 * The value comes from `getRollResults()` and not from what `roll()` resolves
 * to: that promise hands back the individual DICE, this hands back the GROUP,
 * already totalled — which is the whole answer for a d100, rolled the way a
 * table rolls percentile. Reading the first die alone would report the tens.
 */
export async function throwDie({
  notation,
  theme,
  themeColor,
  seed,
  lane = 0,
}) {
  const { box, physics, ratio } = await diceEngine(lane);

  /* Every throw and not once at build: the corner belongs to the ROLL, and a
     board must make the same calls for a seed whichever world is free. */
  await box.updateConfig({
    startPosition: startCorner(ratio, diceCorner(seed)),
    settleTimeout: SETTLE_MS,
  });

  await sow(physics, seed, bodies(notation));

  await box.roll(notation, {
    theme,
    /* The body, cast per throw rather than per theme: dice-box paints it from
       this string at runtime and takes the lettering from the theme's texture,
       so twelve player colours are twelve arguments to one theme instead of
       twelve theme folders to download. See dice-presentation.js, which is
       where the choice between a character's colour and the house's is made. */
    themeColor,
    newStartPoint: false,
  });

  const [group] = box.getRollResults();

  return group?.value ?? null;
}

/** One lane swept, with its engine left standing for the next roll. */
export function clearDice(lane = 0) {
  lanes[lane].live?.box.clear();
}

/**
 * The world down with the STAGE LEFT WHERE IT IS: the tray is the map's own size
 * and the map has not moved, so clearing it would strand the next build on a
 * `holdTray` that only fires when the picture mounts.
 */
function discardDice(lane) {
  const record = lanes[lane];
  const held = record.live;

  record.arena += 1;
  record.live = null;
  record.pending = null;

  if (held) {
    tearDown(held);
  }
}

/**
 * Everything down: the dice, both threads, the GPU context and the canvas.
 *
 * `getContext` is tried and allowed to fail — on the offscreen path the canvas
 * has already handed control to the render worker, which took the context with
 * it when it stopped, and asking a transferred canvas for one throws.
 */
function tearDown({ box, workers }) {
  box.clear();

  for (const worker of workers) {
    worker.terminate();
  }

  try {
    const gl =
      box.canvas.getContext("webgl2") ?? box.canvas.getContext("webgl");

    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Transferred to the worker that has just been terminated.
  }

  box.canvas.remove();
}

/** Every arena leaving, and everything they were holding — the tray too. */
export function releaseDice() {
  for (let lane = 0; lane < DICE_LANES; lane += 1) {
    discardDice(lane);
  }

  tray = null;
}
