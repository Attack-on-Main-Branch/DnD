"use client";

import {
  DICE_ASSET_PATH,
  DICE_BODY_THEME,
  DICE_LIGHTING,
  DICE_THEMES,
} from "@/lib/dice-themes";

/**
 * The d20 on the creation sheet: the real roller, not a drawing of one.
 *
 * A SECOND ROLLER AND NOT THE TABLE'S: play/dice-engine.js exists to make one
 * throw come out identically on six machines, and none of that means anything
 * here. What the two share — meshes, textures, theme, light — is imported.
 * It also must not import out of `play/`, a route folder its parent owns.
 *
 * One instance at a time, because dice-box has no `dispose()`.
 */

/** dice-box takes a CSS SELECTOR, and `useId` gives `:r1:` — not one without
    escaping every colon. One sheet is open at a time, so one id. */
export const PREVIEW_STAGE_ID = "dice-preview-stage";

/** The one die this shows. */
const NOTATION = "1d20";

/**
 * A world barely wider than the die in it. dice-box's camera is FIXED — nine
 * units of floor whatever else is configured — so `size` only places the walls
 * and `scale` alone decides how large the die looks. Hence the two numbers
 * being so far from the table's, and the walls so close: a die that stopped
 * half out of frame would be showing a colour you cannot see.
 */
const ARENA = 7;

const CONFIG = {
  assetPath: DICE_ASSET_PATH,
  theme: DICE_BODY_THEME,
  themeColor: DICE_THEMES[DICE_BODY_THEME].body,
  size: ARENA,
  scale: 30,

  /* Dropped down the middle. `startPosition` is only honoured with
     `newStartPoint: false` on the throw, and together they keep it in frame. */
  startPosition: [0, 8, 0],
  startingHeight: 8,
  throwForce: 1.5,
  spinForce: 4,
  friction: 0.8,
  restitution: 0.2,
  linearDamping: 0.55,
  angularDamping: 0.4,
  settleTimeout: 2500,

  ...DICE_LIGHTING,
};

let pending = null;
let live = null;

/** The colour last asked for, and whether a throw is already on its way. */
let wanted = null;
let throwing = false;

/** One build at a time: `build` stands on `window.Worker`, so a second inside
    the first would wrap its wrapper. React mounts effects twice in dev. */
let queue = Promise.resolve();

function queued(step) {
  const next = queue.then(step, step);

  queue = next.then(
    () => {},
    () => {},
  );

  return next;
}

/** `window.Worker` is stood on for the build because the workers are private
    fields and `terminate()` is the only way to stop the simulation loop. */
async function build() {
  const NativeWorker = window.Worker;
  const workers = [];

  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      workers.push(this);
    }
  };

  try {
    const { default: DiceBox } = await import("@3d-dice/dice-box");

    const box = new DiceBox({
      ...CONFIG,
      container: `#${PREVIEW_STAGE_ID}`,
    });

    await box.init();

    // `init()` does not wait for its textures, and a throw into a half-loaded
    // mesh finds a renderer with nothing to draw.
    await box.loadThemeQueue.flush();

    return { box, workers };
  } finally {
    window.Worker = NativeWorker;
  }
}

/** The roller, built into the stage on demand and reused after that. */
function roller() {
  if (live) {
    return Promise.resolve(live);
  }

  pending ??= queued(async () => {
    const built = await build();

    // The sheet closed while a megabyte of BabylonJS was still arriving.
    if (!document.getElementById(PREVIEW_STAGE_ID)) {
      tearDown(built);
      throw new Error("The preview stage went away while it was being built.");
    }

    live = built;

    return built;
  }).catch((error) => {
    pending = null;
    throw error;
  });

  return pending;
}

/**
 * The die, thrown again in whatever colour was last asked for. COALESCED rather
 * than queued: `wanted` is overwritten mid-throw and read again when it lands,
 * so twelve swatches in a row show the last press, not eleven stale throws.
 */
export function showPreviewDie(themeColor) {
  wanted = themeColor;

  if (throwing) {
    return;
  }

  throwing = true;

  void (async () => {
    try {
      while (wanted !== null) {
        const themeColorNow = wanted;

        wanted = null;

        const { box } = await roller();

        await box.roll(NOTATION, {
          theme: CONFIG.theme,
          themeColor: themeColorNow,

          /* `startPosition` above is only read when the library is told not
             to pick a corner of its own. */
          newStartPoint: false,
        });
      }
    } catch {
      // No WebGL, or the library never arrived. The swatches still answer.
      wanted = null;
    } finally {
      throwing = false;
    }
  })();
}

/**
 * Everything down: the die, both threads, the GPU context and the canvas.
 * `getContext` may fail — a transferred canvas throws when asked for one.
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

/** The sheet closing, and the roller with it. */
export function releasePreviewDie() {
  const held = live;

  live = null;
  pending = null;
  wanted = null;

  if (held) {
    tearDown(held);
  }
}
