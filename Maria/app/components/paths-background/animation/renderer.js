/**
 * Canvas orchestration for the Paths background. Stacked bottom to top:
 *
 *   bloom   – low-resolution mirror of both trails, blurred by CSS. One
 *             `drawImage` per frame instead of a real multi-pass blur.
 *   trail×2 – accumulation buffers, one per generation. Two of them because a
 *             dissolve is a whole-layer operation and cannot pick out one
 *             generation, while an overlapping NEXT_PATH_DELAY has the new path
 *             growing before the old has finished fading.
 *   dust    – cleared every frame: motes and the pulse on burnt-out tips.
 */

import { PathField, BULB_LIFE } from "./paths.js";
import { DustField } from "./dust.js";
import { createSprites } from "./sprites.js";
import { createBrush } from "./brush.js";
import { HIGHLIGHT, mix, rgba, sampleRamp } from "./palette.js";
import { GLOW_SPREAD, PATH_BRIGHTNESS, SPEED } from "./config.js";

/** Retina is worth it, 3x on a phone is not. */
const MAX_DPR = 2;
/**
 * Backing-store scale of the bloom mirror. Higher keeps fine twigs in the glow
 * instead of smearing them into a wash; the CSS blur is in layout pixels, so
 * changing this does not change how wide the glow spreads.
 */
const BLOOM_SCALE = 0.3;
/** Fixed simulation step, so motion looks identical at 60 / 120 / 144 Hz. */
const STEP = 1 / 60;
/** Never try to catch up more than this after a tab stall. */
const MAX_CATCHUP = 5;
/**
 * Smallest change in dissolve level worth writing to the DOM. Half a level out
 * of 255 is invisible, so anything finer is pure style-recalc churn.
 */
const LEVEL_QUANTUM = 1 / 512;
/** Reduced-motion still frame: run this long, then stop. */
const STILL_SECONDS = 8;

export function createRenderer({
  host,
  bloom,
  trails,
  dust,
  reducedMotion = false,
}) {
  const bloomCtx = bloom.getContext("2d");
  const dustCtx = dust.getContext("2d");
  const sprites = createSprites();
  const stampSegment = createBrush();

  /**
   * One entry per generation buffer. The opacity is written back explicitly:
   * these canvases outlive the renderer, so a remount would otherwise inherit a
   * mid-dissolve opacity that `setLevel` never corrects.
   */
  const layers = trails.map((canvas) => {
    canvas.style.opacity = "1";
    return { canvas, ctx: canvas.getContext("2d"), level: 1, generation: 0 };
  });
  /** Where new growth is drawn, and which layer is currently dissolving. */
  let drawLayer = 0;
  let fadeLayer = 0;
  let lastGeneration = 0;
  let lastDissolveId = 0;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let field = null;
  let motes = null;

  let raf = 0;
  let last = 0;
  let accumulator = 0;
  let disposed = false;
  let started = false;

  /** Pending coalesced resize, and the deferred reduced-motion composition. */
  let resizeRaf = 0;
  let idleHandle = 0;
  let idleTimer = 0;
  /**
   * True until the reduced-motion still has been composed. Permanently false on
   * the animated path, which has a loop to keep the frame current.
   */
  let stillPending = reducedMotion;

  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => resize())
      : null;

  function sizeLayer(canvas, ctx) {
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Grab a trail so a resize doesn't blank out what is on screen. Allocated per
   * call: caching two saves only the element wrapper, since reassigning `width`
   * reallocates the backing store anyway, and costs ~63 MB resident at 1080p.
   */
  function snapshot(canvas) {
    if (!canvas.width || !canvas.height) return null;
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext("2d").drawImage(canvas, 0, 0);
    return copy;
  }

  /**
   * Coalesce resize events to one per frame: the observer and the window
   * listener both fire during a drag, and each pass reallocates every backing
   * store. `start()` calls `applyResize` directly — the first sizing must be
   * synchronous or `field` is still null when the caller uses it.
   */
  function resize() {
    if (disposed || resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      applyResize();
    });
  }

  function applyResize() {
    if (disposed) return;
    const nextWidth = Math.max(1, host.clientWidth);
    const nextHeight = Math.max(1, host.clientHeight);
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;

    const previous =
      width && height ? layers.map((l) => snapshot(l.canvas)) : null;

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;

    layers.forEach((l) => sizeLayer(l.canvas, l.ctx));
    sizeLayer(dust, dustCtx);
    bloom.width = Math.max(1, Math.round(width * dpr * BLOOM_SCALE));
    bloom.height = Math.max(1, Math.round(height * dpr * BLOOM_SCALE));

    if (previous) {
      layers.forEach((l, i) => {
        if (!previous[i]) return;
        l.ctx.globalCompositeOperation = "source-over";
        l.ctx.drawImage(previous[i], 0, 0, width, height);
      });
    }

    if (!field) {
      field = new PathField(width, height);
      motes = new DustField(width, height);
    } else {
      field.setSize(width, height);
      motes.setSize(width, height);
    }

    // Assigning `width` cleared the dust and bloom bitmaps; the trails came
    // back from the snapshot, these two have no equivalent. Required on every
    // resize frame, since `tick` re-registers before a resize can append —
    // skip it and a window drag shows the trail with no glow and no motes.
    //
    // Gated while the reduced-motion still is pending, or the mount-time call
    // would show a partial frame that the still then replaces wholesale. Safe
    // only because nothing paints dust or bloom before the still is composed.
    if (!stillPending) {
      paintDust();
      paintBloom();
    }
  }

  /** Run the scene forward off-clock, for the reduced-motion still. */
  function simulate(seconds) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i++) {
      // Scaled by SPEED to match `tick`, or the still drifts to a different
      // stage of growth than the animated version as soon as that dial moves.
      field.step(STEP * SPEED);
      motes.step(STEP * SPEED);
      // Painted as we go: segments are consumed each frame.
      paintTrail();
    }
  }

  /**
   * A dissolve claims whichever layer was being drawn to when it started; a
   * launch moves new growth to the other one. That is what keeps an incoming
   * tree out of the outgoing tree's dissolve.
   */
  function syncLayers() {
    // Keyed on the dissolve's id, not a false→true edge: a dissolve beginning
    // while the previous one still ran would be missed, fading the wrong layer
    // and stranding the other at a partial opacity.
    if (field.dissolveId !== lastDissolveId) {
      lastDissolveId = field.dissolveId;
      if (fadeLayer !== drawLayer) finishDissolve(layers[fadeLayer]);
      fadeLayer = drawLayer;
    }

    if (field.generation !== lastGeneration) {
      lastGeneration = field.generation;
      drawLayer = 1 - fadeLayer;
      const layer = layers[drawLayer];
      layer.ctx.globalCompositeOperation = "source-over";
      layer.ctx.clearRect(0, 0, width, height);
      layer.generation = field.generation;
      setLevel(layer, 1);
    }
  }

  function finishDissolve(layer) {
    layer.ctx.globalCompositeOperation = "source-over";
    layer.ctx.clearRect(0, 0, width, height);
    setLevel(layer, 0);
  }

  function setLevel(layer, level) {
    if (
      level !== 0 &&
      level !== 1 &&
      Math.abs(layer.level - level) < LEVEL_QUANTUM
    )
      return;
    if (layer.level === level) return;
    layer.level = level;
    layer.canvas.style.opacity = level;
  }

  /**
   * Fades the layer *element*, never its pixels. Multiplying the canvas down in
   * place is a feedback loop: each pass rounds to 8 bits, and after ~100 passes
   * the 0..255 range has collapsed to roughly twenty countable plateaus.
   * Compositor opacity multiplies once, from pristine source pixels.
   */
  function applyDissolve() {
    const fading = layers[fadeLayer];
    const level = field.fadeLevel;

    if (level <= 0 && fading.level > 0) {
      finishDissolve(fading);
      return;
    }
    setLevel(fading, level);
    if (fadeLayer !== drawLayer) setLevel(layers[drawLayer], 1);
  }

  /** How visible a generation currently is, for effects drawn outside its layer. */
  function levelOfGeneration(generation) {
    for (const layer of layers)
      if (layer.generation === generation) return layer.level;
    return 0;
  }

  function paintTrail() {
    syncLayers();
    applyDissolve();

    const ctx = layers[drawLayer].ctx;
    ctx.globalCompositeOperation = "lighter";

    const segments = field.segments;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      stampSegment(ctx, s, GLOW_SPREAD, PATH_BRIGHTNESS * s.gain);
    }
    segments.length = 0;

    // Stamped once, and only onto their own generation's layer.
    for (const bulb of field.bulbs) {
      if (bulb.stamped) continue;
      bulb.stamped = true;
      if (bulb.generation === field.generation) stampBulb(ctx, bulb);
    }
  }

  function stampBulb(ctx, bulb) {
    const colour = sampleRamp(bulb.t);
    const r = bulb.r * 3.8;
    const gradient = ctx.createRadialGradient(
      bulb.x,
      bulb.y,
      0,
      bulb.x,
      bulb.y,
      r,
    );
    gradient.addColorStop(0, rgba(HIGHLIGHT, 1));
    gradient.addColorStop(0.14, rgba(mix(colour, HIGHLIGHT, 0.75), 0.6));
    gradient.addColorStop(0.42, rgba(colour, 0.16));
    gradient.addColorStop(1, rgba(colour, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bulb.x, bulb.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintDust() {
    dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dustCtx.clearRect(0, 0, width, height);
    dustCtx.globalCompositeOperation = "lighter";

    for (const mote of motes.motes) {
      const alpha = motes.opacity(mote);
      if (alpha <= 0.004) continue;
      const sprite = mote.bokeh ? sprites.bokeh : sprites.spark;
      const size = mote.r * (mote.bokeh ? 2 : 7);
      dustCtx.globalAlpha = alpha;
      dustCtx.drawImage(
        sprite,
        mote.x - size / 2,
        mote.y - size / 2,
        size,
        size,
      );
    }

    // The dust layer is never dissolved, so a bulb is dimmed by its own
    // generation's level by hand — otherwise a tree's last tips keep flaring at
    // full strength while the tree fades out from under them.
    const now = field.time;
    for (const bulb of field.bulbs) {
      const age = now - bulb.born;
      if (age < 0 || age > BULB_LIFE) continue;
      const level = levelOfGeneration(bulb.generation);
      if (level <= 0) continue;
      const decay = 1 - age / BULB_LIFE;
      const pulse = 0.55 + 0.45 * Math.sin(now * 2.4 + bulb.phase);
      dustCtx.globalAlpha = decay * decay * pulse * 0.55 * level;
      const size = bulb.r * 7;
      dustCtx.drawImage(
        sprites.bulb,
        bulb.x - size / 2,
        bulb.y - size / 2,
        size,
        size,
      );
    }

    dustCtx.globalAlpha = 1;
  }

  function paintBloom() {
    // The mirror has to apply each layer's dissolve itself — it is copying the
    // pristine canvases, not the faded elements.
    bloomCtx.globalCompositeOperation = "source-over";
    bloomCtx.clearRect(0, 0, bloom.width, bloom.height);
    bloomCtx.globalCompositeOperation = "lighter";
    for (const layer of layers) {
      if (layer.level <= 0) continue;
      bloomCtx.globalAlpha = layer.level;
      bloomCtx.drawImage(layer.canvas, 0, 0, bloom.width, bloom.height);
    }
    bloomCtx.globalAlpha = 1;
  }

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);

    const delta = Math.min((now - last) / 1000, 0.25);
    last = now;
    accumulator += delta;

    // Real time in, simulation seconds out: every duration in config.js scales
    // with SPEED together.
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_CATCHUP) {
      field.step(STEP * SPEED);
      motes.step(STEP * SPEED);
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_CATCHUP) accumulator = 0;

    paintTrail();
    paintDust();
    paintBloom();
  }

  /** The reduced-motion still: run the scene forward once, then leave it up. */
  function composeStillFrame() {
    idleHandle = 0;
    idleTimer = 0;
    // Cleared before the disposal check, so it cannot stay latched on a
    // renderer that died mid-schedule.
    stillPending = false;
    if (disposed) return;

    simulate(STILL_SECONDS);
    paintDust();
    paintBloom();
  }

  return {
    start() {
      // A second call would overwrite `raf` and strand the first loop running
      // forever, beyond the reach of destroy().
      if (disposed || started) return;
      started = true;

      applyResize();
      observer?.observe(host);
      window.addEventListener("resize", resize, { passive: true });

      if (reducedMotion) {
        // Deferred off the critical path: simulate() runs its 8 seconds in one
        // synchronous burst, which would block hydration from a root-layout
        // mount effect. Spreading it across frames is not an option — a tree
        // visibly assembling itself is the motion this branch exists to avoid.
        if (typeof requestIdleCallback === "function") {
          idleHandle = requestIdleCallback(composeStillFrame, { timeout: 500 });
        } else {
          idleTimer = setTimeout(composeStillFrame, 0);
        }
        return;
      }

      last = performance.now();
      raf = requestAnimationFrame(tick);
    },

    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);

      if (idleHandle && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleHandle);
      }
      clearTimeout(idleTimer);

      observer?.disconnect();
      window.removeEventListener("resize", resize);
    },
  };
}
