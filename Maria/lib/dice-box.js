/**
 * dice-box as both of the page's rollers load it: the table's
 * (play/dice-engine.js) and the Dice tab's and the Dice Pouch's preview
 * (app/dashboard/preview-roller.js).
 *
 * ONE LOAD, SEEDED, whoever asks first. dice-box builds its physics worker's
 * source into a Blob once, when its module is first evaluated, and starts every
 * world after that from the same Blob. The table can only throw the same roll
 * on every screen from a seeded worker — see `PRELUDE` — so the module is
 * always first evaluated here, with the prelude in front of that source. A
 * preview that loaded it first used to leave the table a worker it could not
 * pin, and no 3D dice until a reload.
 *
 * ONE BUILD AT A TIME, across both rollers. A build stands on `window.Worker`
 * — the table's on `URL.createObjectURL` too — for its whole length, so a
 * second inside the first would wrap the first's wrappers and take its threads.
 */

/** A string only the physics worker's own source contains. */
const PHYSICS_MARK = "btDiscreteDynamicsWorld";

/** What the table sends the physics worker before a throw, and its answer. */
export const SEED_MESSAGE = "__seed";
export const SEEDED_MESSAGE = "__seeded";

/**
 * What the physics worker says as each die comes to rest: its id and the pose
 * it is drawn in, `[x, y, z, qx, qy, qz, qw]` in the world's own units.
 */
export const RESTED_MESSAGE = "__rested";

// Matches the overhead camera in the render worker.
export const DICE_CAMERA_HEIGHT = 36.5;
export const DICE_CAMERA_FOV = 0.25;

/**
 * Prepended to the physics worker's source, where it runs before anything else
 * in that thread.
 *
 * `Math.random` becomes mulberry32; `Date` becomes a tick clock of the physics' own 1/90s step.
 * `Date.now` is left alone — emscripten's `gettimeofday` uses it, and it never
 * reaches the simulation.
 *
 * The clock also stands still until every body of the roll is in the world. A
 * percentile roll is two dice to dice-box, added one after the other across an
 * await, so on one machine the simulation takes a step between them and on
 * another it does not — which showed as d100 agreeing about half the time while
 * every other die always did. The dice arrive on the render worker's port,
 * whose handler is wrapped as it is set.
 *
 * The port's `postMessage` is wrapped too, to READ each step's buffer before it
 * is transferred away: the step a die is put to sleep writes -1 where its x
 * would be, so the pose it had on the step before is where it lies. That
 * is told to the main thread as `RESTED_MESSAGE`. Only the outgoing display
 * buffer is adjusted on phones. Ammo's bodies and seeded simulation stay intact.
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

  var poses = {};
  var displayScale = 1;
  var displayAspect = 1;

  function framePositions(view) {
    if (displayScale === 1) return;
    // A wider-looking die needs more room around its centre at the rail.
    var travel = 0.84 / displayScale;
    for (var i = 0; i < view[0]; i += 1) {
      var at = i * 8 + 1;
      if (view[at + 1] === -1) continue;
      var depth = Math.max(0, ${DICE_CAMERA_HEIGHT} - view[at + 2]);
      var zLimit = depth * Math.tan(${DICE_CAMERA_FOV} / 2) * travel;
      var xLimit = zLimit * displayAspect;
      view[at + 1] = Math.max(-xLimit, Math.min(xLimit, view[at + 1] * travel));
      view[at + 3] = Math.max(-zLimit, Math.min(zLimit, view[at + 3] * travel));
      if (view[at + 1] === -1) view[at + 1] = -1 + 2 ** -24;
    }
  }

  function noteRest(view) {
    var awake = view[0];

    for (var i = 0; i < awake; i += 1) {
      var at = i * 8 + 1;
      var id = view[at];

      if (view[at + 1] === -1) {
        if (poses[id]) {
          self.postMessage({ action: "${RESTED_MESSAGE}", id: id, pose: poses[id] });
        }

        delete poses[id];
        continue;
      }

      poses[id] = [
        view[at + 1], view[at + 2], view[at + 3],
        view[at + 4], view[at + 5], view[at + 6], view[at + 7],
      ];
    }
  }

  function watch(port) {
    var send = port.postMessage;

    port.postMessage = function (message, transfer) {
      if (message && message.action === "updates" && message.diceBuffer) {
        var view = new Float32Array(message.diceBuffer);
        framePositions(view);
        noteRest(view);
      }

      return send.call(port, message, transfer);
    };

    count(port);
  }

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

    if (data.action === "init" && data.displayScale > 1) {
      displayScale = data.displayScale;
      displayAspect = data.width / data.height;
    }

    if (data.action === "connect" && event.ports && event.ports[0]) {
      watch(event.ports[0]);
      return;
    }

    if (data.action !== "${SEED_MESSAGE}") return;

    seed = data.seed | 0;
    poses = {};
    expected = data.bodies > 0 ? data.bodies : 1;
    seen = 0;
    waiting = RealDate.now();
    owed = 0;
    since = RealDate.now();

    event.stopImmediatePropagation();
    self.postMessage({ action: "${SEEDED_MESSAGE}" });
  });
})();
`;

let physicsSource = null;
let loading = null;

/** The library's class, its module evaluated once with the prelude in place. */
export function loadDiceBox() {
  loading ??= (async () => {
    const NativeBlob = window.Blob;

    /* Caught on its way INTO a Blob rather than out of one: the parts are
       still the plain string the library decoded, so the prelude can go in
       front of it with no fetch to wait on. */
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
          physicsSource = this;
          return;
        }

        super(parts, options);
      }
    };

    try {
      const { default: DiceBox } = await import("@3d-dice/dice-box");

      return DiceBox;
    } finally {
      window.Blob = NativeBlob;
    }
  })().catch((error) => {
    loading = null;
    throw error;
  });

  return loading;
}

/** Whether a Blob being turned into a worker's URL is the physics worker's. */
export function isPhysicsSource(object) {
  return physicsSource !== null && object === physicsSource;
}

let queue = Promise.resolve();

const BUILD_WAIT_MS = 15000;
// Ammo removes bodies without freeing their native allocations.
export const DICE_WORLD_ROLL_LIMIT = 64;
export const DICE_WORLD_BODY_LIMIT = 256;

export function awaitDice(promise, ms = BUILD_WAIT_MS) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("The dice operation timed out.")),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

function createRoller(DiceBox, options) {
  const createElement = document.createElement;
  const canvases = [];
  let box;
  document.createElement = function (tag, ...args) {
    const element = createElement.call(document, tag, ...args);
    if (tag === "canvas") canvases.push(element);
    return element;
  };
  try {
    box = new DiceBox(options);
    return box;
  } finally {
    document.createElement = createElement;
    for (const canvas of canvases) {
      if (canvas === box?.canvas) continue;
      const gl =
        canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    }
  }
}

export async function buildDiceBox(config, initialise = async () => {}) {
  const { tray, displayScale, ...options } = config;
  const DiceBox = await awaitDice(loadDiceBox());
  const NativeWorker = window.Worker;
  const createObjectURL = window.URL.createObjectURL;
  const physicsUrls = new Set();
  const removals = [];
  let disposed = false;
  let rejectWorker;

  const failed = new Promise((_, reject) => {
    rejectWorker = reject;
  });
  const built = {
    box: null,
    workers: [],
    physics: null,
    renderer: null,
    fault: failed,
    rolls: 0,
    bodies: 0,
    failed: false,
    busy: false,
    release() {
      disposed = true;
      built.failed = true;
      rejectWorker(new Error("The dice roller was released."));
      for (const remove of removals) {
        try {
          remove();
        } catch {
          continue;
        }
      }
      removals.length = 0;
    },
  };

  const fail = () => {
    built.failed = true;
    rejectWorker(new Error("The dice worker stopped answering."));
  };
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    removals.push(() => target.removeEventListener(event, handler));
  };
  const check = () => {
    if (disposed) throw new Error("The dice build was released.");
  };

  window.URL.createObjectURL = function (object) {
    const url = createObjectURL.call(window.URL, object);
    if (isPhysicsSource(object)) physicsUrls.add(url);
    return url;
  };
  window.Worker = class {
    constructor(url, options) {
      const worker = new NativeWorker(url, options);
      const post = worker.postMessage.bind(worker);
      worker.postMessage = (message, transfer) => {
        worker.postMessage = post;
        if (
          message?.action === "init" &&
          message.options === built.box?.config
        ) {
          built.workers.push(worker);
          listen(worker, "error", fail);
          listen(worker, "messageerror", fail);
          if (physicsUrls.has(url)) {
            built.physics = worker;
            worker.postMessage = (next, buffers) => {
              const sized = ["init", "resize"].includes(next?.action);
              const dimensions = sized && tray ? tray : null;
              const scale = next?.action === "init" && displayScale;
              return post(
                dimensions || scale
                  ? {
                      ...next,
                      ...dimensions,
                      ...(scale ? { displayScale: scale } : null),
                    }
                  : next,
                buffers,
              );
            };
          } else if (message.canvas) {
            built.renderer = worker;
          }
          if (typeof url === "string" && url.startsWith("blob:")) {
            window.URL.revokeObjectURL(url);
          }
          if (disposed) {
            worker.terminate();
            return;
          }
        }
        return worker.postMessage(message, transfer);
      };
      return worker;
    }
  };

  try {
    const box = createRoller(DiceBox, options);
    built.box = box;
    const resizeWorld = box.resizeWorld.bind(box);
    let resized = false;
    box.resizeWorld = () => {
      if (disposed || resized) return;
      resized = true;
      const add = window.addEventListener;
      window.addEventListener = function (event, handler, options) {
        if (event === "resize") {
          removals.push(() =>
            window.removeEventListener(event, handler, options),
          );
        }
        return add.call(window, event, handler, options);
      };
      try {
        resizeWorld();
      } finally {
        window.addEventListener = add;
      }
    };
    listen(box.canvas, "webglcontextlost", fail);
    if (
      box.config.offscreen === false ||
      typeof OffscreenCanvas === "undefined" ||
      !box.canvas.transferControlToOffscreen
    ) {
      const { E: Engine } = await awaitDice(
        import("@3d-dice/dice-box/dist/Dice.js"),
      );
      removals.push(() => {
        for (const engine of [...Engine.Instances]) {
          if (engine.getRenderingCanvas() === box.canvas) engine.dispose();
        }
      });
    }

    await awaitDice(
      Promise.race([
        (async () => {
          await box.init();
          check();
          await box.loadThemeQueue.flush();
          check();
          await initialise(built, tray);
          check();
        })(),
        failed,
      ]),
    );
    return built;
  } catch (error) {
    tearDownDiceBox(built);
    throw error;
  } finally {
    window.Worker = NativeWorker;
    window.URL.createObjectURL = createObjectURL;
  }
}

/** `step`, once every build queued before it has finished. */
export function queueDiceBuild(step) {
  const next = queue.then(step, step);

  queue = next.then(
    () => {},
    () => {},
  );

  return next;
}

/**
 * A built roller taken down whole — its dice, both threads, the GPU context
 * and the canvas — since dice-box has no `dispose()`.
 *
 * `getContext` is tried and allowed to fail: on the offscreen path the canvas
 * has already handed control to the render worker, which took the context with
 * it when it stopped, and asking a transferred canvas for one throws.
 */
export function tearDownDiceBox({ box, workers, release }) {
  box?.canvas?.remove();
  release?.();
  try {
    box?.clear();
  } catch {
    // The worker may already have failed.
  }

  for (const worker of workers) {
    worker.terminate();
  }

  try {
    const gl =
      box?.canvas?.getContext("webgl2") ?? box?.canvas?.getContext("webgl");

    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Transferred to the worker that has just been terminated.
  }
}
