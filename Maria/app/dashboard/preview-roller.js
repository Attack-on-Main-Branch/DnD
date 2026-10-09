"use client";

import { loadDiceBox, queueDiceBuild, tearDownDiceBox } from "@/lib/dice-box";
import {
  DICE_ASSET_PATH,
  DICE_BODY_THEME,
  DICE_LIGHTING,
  DICE_THEMES,
  DICE_TYPES,
} from "@/lib/dice-themes";

/**
 * The die on the Dice tab: the real roller, not a drawing of one.
 *
 * A SECOND ROLLER AND NOT THE TABLE'S: play/dice-engine.js exists to make one
 * throw come out identically on six machines, and none of that means anything
 * here. What the two share — meshes, textures, theme, light, and the library
 * itself as lib/dice-box.js loads it — is imported. It also must not import out
 * of `play/`, a route folder its parent owns.
 *
 * One instance at a time, because dice-box has no `dispose()`, and built in
 * the same queue as the table's worlds: a pouch is opened at the table.
 */

/** dice-box takes a CSS SELECTOR, and `useId` gives `:r1:` — not one without
    escaping every colon. One sheet is open at a time, so one id. */
export const PREVIEW_STAGE_ID = "dice-preview-stage";

/** The die thrown until another is asked for. */
export const PREVIEW_DIE = "d20";

/** A whole set: a d100 is a d10 marked in tens, not a look of its own. */
export const PREVIEW_SET = DICE_TYPES.filter((type) => type !== "d100");

/**
 * The tray: as wide as the frame. dice-box's camera is FIXED — a little over
 * nine units of floor whatever else is configured — so `size` only places the
 * walls and `scale` alone decides how large the die looks. The walls stand
 * just inside the frame, so a die at rest is always wholly in view, and the
 * die is sized so that even the widest, a d6 or a d4 lying on a face, fits
 * between them with room to tumble: at much more, a d4 is wider than the tray
 * and the physics shoves it out through a wall.
 */
const ARENA = 9;

/**
 * How far from the middle a throw starts. dice-box's own starting points sit
 * half a unit inside a wall, which a die this size would start halfway
 * through — so the preview picks its own: the widest die's reach in from the
 * wall, at a random bearing. It is thrown back across the middle from there.
 */
const START_REACH = 1.25;

/**
 * A whole set in the same tray: small enough that six tumble past each other
 * without one shoving another through a wall, and started further out, there
 * being room to.
 */
const SET_SCALE = 9.5;
const SET_START_REACH = 2.5;

const CONFIG = {
  assetPath: DICE_ASSET_PATH,
  theme: DICE_BODY_THEME,
  themeColor: DICE_THEMES[DICE_BODY_THEME].body,
  size: ARENA,
  scale: 22,

  /* Thrown in low from a side of the tray, hard enough to cross it and
     tumbling as it goes. */
  startingHeight: 4,
  throwForce: 3.5,
  spinForce: 6,
  friction: 0.8,
  restitution: 0.3,
  linearDamping: 0.55,
  angularDamping: 0.4,
  settleTimeout: 3000,

  ...DICE_LIGHTING,
};

let pending = null;
let live = null;

/** The die last asked for, and whether a throw is already on its way. */
let wanted = null;
let throwing = false;

/**
 * Bumped by every release. A throw cut off by one — its workers terminated
 * mid-roll — never settles, so a loop or a build from before the release must
 * see the number has moved and stand down, rather than hold `throwing` for
 * ever or install a world built into a stage that has since gone.
 */
let generation = 0;

/**
 * `window.Worker` is stood on for the build because the workers are private
 * fields and `terminate()` is the only way to stop the simulation loop. The
 * one handed the canvas is the renderer, kept to be asked to turn the die —
 * see Maria/vendor/dice-box. A browser that renders on the main thread has
 * no such worker, and its die simply does not turn.
 */
async function build() {
  const DiceBox = await loadDiceBox();

  const NativeWorker = window.Worker;
  const workers = [];
  let renderer = null;

  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      workers.push(this);

      const post = this.postMessage.bind(this);

      this.postMessage = (message, transfer) => {
        if (message?.action === "init" && message.canvas) {
          renderer = this;
        }

        return post(message, transfer);
      };
    }
  };

  try {
    const box = new DiceBox({
      ...CONFIG,
      container: `#${PREVIEW_STAGE_ID}`,
    });

    await box.init();

    // `init()` does not wait for its textures, and a throw into a half-loaded
    // mesh finds a renderer with nothing to draw.
    await box.loadThemeQueue.flush();

    return { box, workers, renderer };
  } finally {
    window.Worker = NativeWorker;
  }
}

/** The roller, built into the stage on demand and reused after that. */
function roller() {
  if (live) {
    return Promise.resolve(live);
  }

  const mine = generation;

  pending ??= queueDiceBuild(async () => {
    const built = await build();

    // Released while a megabyte of BabylonJS was still arriving: its canvas
    // went into a stage that has gone, even if another now has the same id.
    if (mine !== generation || !document.getElementById(PREVIEW_STAGE_ID)) {
      tearDownDiceBox(built);
      throw new Error("The preview stage went away while it was being built.");
    }

    live = built;

    return built;
  }).catch((error) => {
    if (mine === generation) {
      pending = null;
    }

    throw error;
  });

  return pending;
}

/** One die, thrown again in whatever colour, style and shape were last asked for. */
export function showPreviewDie(
  themeColor,
  theme = CONFIG.theme,
  die = PREVIEW_DIE,
) {
  throwPreview({
    themeColor,
    theme,
    dice: [die],
    scale: CONFIG.scale,
    reach: START_REACH,
  });
}

/** Every die in `dice` at once, in one colour and style. */
export function showPreviewSet(themeColor, theme, dice = PREVIEW_SET) {
  throwPreview({
    themeColor,
    theme,
    dice,
    scale: SET_SCALE,
    reach: SET_START_REACH,
  });
}

/**
 * COALESCED rather than queued: `wanted` is overwritten mid-throw and read
 * again when it lands, so twelve swatches in a row show the last press, not
 * eleven stale throws.
 */
function throwPreview(request) {
  wanted = request;

  if (throwing) {
    return;
  }

  throwing = true;

  const mine = generation;

  void (async () => {
    try {
      while (wanted !== null && mine === generation) {
        const now = wanted;

        wanted = null;

        const { box } = await roller();

        if (mine !== generation) {
          return;
        }

        // dice-box reads a theme's dice list before it would load the theme.
        await box.loadThemeQueue.push(() => box.loadTheme(now.theme));

        const bearing = Math.random() * 2 * Math.PI;

        await box.updateConfig({
          scale: now.scale,
          startPosition: [
            now.reach * Math.cos(bearing),
            CONFIG.startingHeight,
            now.reach * Math.sin(bearing),
          ],
        });
        await box.roll(
          now.dice.map((die) => `1${die}`),
          {
            themeColor: now.themeColor,
            theme: now.theme,
            // `startPosition` above is read only when the library is told not
            // to pick a starting point of its own.
            newStartPoint: false,
          },
        );
      }
    } catch {
      // No WebGL, or the library never arrived. The swatches still answer.
      if (mine === generation) {
        wanted = null;
      }
    } finally {
      if (mine === generation) {
        throwing = false;
      }
    }
  })();
}

/**
 * The die in the tray turned in place, by `x` radians about the screen's up
 * and `y` about its across, as a drag reads. The renderer ignores it while
 * a die is still rolling, so nothing here waits for one to land.
 */
export function turnPreviewDie(x, y) {
  live?.renderer?.postMessage({ action: "turnDice", options: { x, y } });
}

/** The sheet closing, and the roller with it. */
export function releasePreviewDie() {
  const held = live;

  generation += 1;
  live = null;
  pending = null;
  wanted = null;
  throwing = false;

  if (held) {
    tearDownDiceBox(held);
  }
}
