/**
 * Canvas orchestration for the Paths background.
 *
 * Stacked layers, bottom to top:
 *
 *   bloom   – a low-resolution mirror of both trails, blurred by CSS. Cheap,
 *             GPU-side glow: one `drawImage` per frame instead of a real
 *             multi-pass blur.
 *   trail×2 – accumulation buffers, one per generation. New segments are drawn
 *             additively and left untouched while their path grows; the layer is
 *             then dissolved to nothing. Two of them, because with an
 *             overlapping NEXT_PATH_DELAY the new path is already growing while
 *             the old one is still dissolving, and a dissolve is a whole-layer
 *             operation — it cannot pick out one generation.
 *   dust    – cleared every frame: floating motes and the pulse on freshly
 *             burnt-out path tips.
 */

import { PathField, BULB_LIFE } from './paths.js'
import { DustField } from './dust.js'
import { createSprites } from './sprites.js'
import { createBrush } from './brush.js'
import { HIGHLIGHT, mix, rgba, sampleRamp } from './palette.js'
import { GLOW_SPREAD, PATH_BRIGHTNESS, SPEED } from './config.js'

/** Retina is worth it, 3x on a phone is not. */
const MAX_DPR = 2
/**
 * Backing-store scale of the bloom mirror. Higher keeps fine twigs in the glow
 * instead of smearing them into a wash; the CSS blur is in layout pixels, so
 * changing this does not change how wide the glow spreads.
 */
const BLOOM_SCALE = 0.3
/** Fixed simulation step, so motion looks identical at 60 / 120 / 144 Hz. */
const STEP = 1 / 60
/** Never try to catch up more than this after a tab stall. */
const MAX_CATCHUP = 5
/**
 * Smallest change in dissolve level worth writing to the DOM. Half a level out
 * of 255 is invisible, so anything finer is pure style-recalc churn.
 */
const LEVEL_QUANTUM = 1 / 512
/** Reduced-motion still frame: run this long, then stop. */
const STILL_SECONDS = 8

export function createRenderer({ host, bloom, trails, dust, reducedMotion = false }) {
  const bloomCtx = bloom.getContext('2d')
  const dustCtx = dust.getContext('2d')
  const sprites = createSprites()
  const stampSegment = createBrush()

  /**
   * One entry per generation buffer; `level` is its current dissolve opacity,
   * and `generation` is which path drew what is on it.
   *
   * The opacity is written back explicitly rather than assumed: these canvases
   * outlive the renderer (React owns the elements), so a remount — StrictMode,
   * or the reduced-motion listener rebuilding — would otherwise inherit a
   * mid-dissolve opacity that `setLevel` then never corrects, leaving the whole
   * background permanently dimmed.
   */
  const layers = trails.map((canvas) => {
    canvas.style.opacity = '1'
    return { canvas, ctx: canvas.getContext('2d'), level: 1, generation: 0 }
  })
  /** Where new growth is drawn, and which layer is currently dissolving. */
  let drawLayer = 0
  let fadeLayer = 0
  let lastGeneration = 0
  let lastDissolveId = 0

  let width = 0
  let height = 0
  let dpr = 1
  let field = null
  let motes = null

  let raf = 0
  let last = 0
  let accumulator = 0
  let disposed = false
  let started = false

  /** Pending coalesced resize, and the deferred reduced-motion composition. */
  let resizeRaf = 0
  let idleHandle = 0
  let idleTimer = 0
  /**
   * True until the reduced-motion still has been composed. Permanently false on
   * the animated path, which has a loop to keep the frame current.
   */
  let stillPending = reducedMotion

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null

  function sizeLayer(canvas, ctx) {
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /**
   * Grab a trail so a resize doesn't blank out what is on screen.
   *
   * Allocated per call and left to the collector as soon as the draw-back is
   * done. Holding two of these for reuse was tried and reverted: reassigning
   * `width` reallocates the backing store anyway, so only the element wrapper
   * is saved, while ~63 MB at 1080p on a 2x display stays resident for the
   * life of a page whose background never unmounts.
   */
  function snapshot(canvas) {
    if (!canvas.width || !canvas.height) return null
    const copy = document.createElement('canvas')
    copy.width = canvas.width
    copy.height = canvas.height
    copy.getContext('2d').drawImage(canvas, 0, 0)
    return copy
  }

  /**
   * Coalesce resize events to one per frame.
   *
   * Both the ResizeObserver and the window listener fire during a drag, and
   * each pass re-allocates every backing store on the stack. Collapsing them
   * onto a frame boundary means one pass per painted frame at most.
   *
   * `start()` calls `applyResize` directly instead: the first sizing has to be
   * synchronous, or `field` is still null when the caller uses it.
   */
  function resize() {
    if (disposed || resizeRaf) return
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      applyResize()
    })
  }

  function applyResize() {
    if (disposed) return
    const nextWidth = Math.max(1, host.clientWidth)
    const nextHeight = Math.max(1, host.clientHeight)
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return

    const previous = width && height ? layers.map((l) => snapshot(l.canvas)) : null

    width = nextWidth
    height = nextHeight
    dpr = nextDpr

    layers.forEach((l) => sizeLayer(l.canvas, l.ctx))
    sizeLayer(dust, dustCtx)
    bloom.width = Math.max(1, Math.round(width * dpr * BLOOM_SCALE))
    bloom.height = Math.max(1, Math.round(height * dpr * BLOOM_SCALE))

    if (previous) {
      layers.forEach((l, i) => {
        if (!previous[i]) return
        l.ctx.globalCompositeOperation = 'source-over'
        l.ctx.drawImage(previous[i], 0, 0, width, height)
      })
    }

    if (!field) {
      field = new PathField(width, height)
      motes = new DustField(width, height)
    } else {
      field.setSize(width, height)
      motes.setSize(width, height)
    }

    // Assigning `width` above cleared the dust and bloom bitmaps. The trails
    // came back from the snapshot; these two have no equivalent, so they must
    // be redrawn here or the frame ships without them.
    //
    // For resize-driven frames this has to happen every time: `tick`
    // re-registers itself at the top of its own body, so its callback is
    // already in the animation-frame map before a resize can append this one —
    // the order is tick, then applyResize, then paint. Skip it and every frame
    // of a window drag shows the trail with no glow and no motes.
    //
    // Suppressed only while the reduced-motion still is pending. That covers
    // more than the one call `start()` makes directly: the flag stays up for
    // however long the idle callback takes, so resizes inside that window skip
    // the paint too. Safe because nothing paints dust or bloom before the still
    // is composed, and the width reassignments above clear both bitmaps on
    // every pass — there is never anything there to lose. Add any pre-still
    // painting and that stops being true.
    //
    // Without the gate, the mount-time call would put a partial frame on
    // screen — a static mote field at simulation time zero — which the still
    // then replaces wholesale a few hundred milliseconds later, jumping the
    // field by a quarter of the screen. Exactly the discontinuity this branch
    // exists to avoid.
    if (!stillPending) {
      paintDust()
      paintBloom()
    }
  }

  /**
   * Run the scene forward off-clock, for the reduced-motion still. Uses the same
   * step as the rAF loop: one path at a time is cheap enough that a coarser step
   * would only buy a beaded, wrongly-lit frame.
   */
  function simulate(seconds) {
    const steps = Math.round(seconds / STEP)
    for (let i = 0; i < steps; i++) {
      // Scaled by SPEED to match `tick`. Identical at the shipped SPEED of 1,
      // but without it the still frame silently drifts to a different stage of
      // growth than the animated version the moment that dial is turned.
      field.step(STEP * SPEED)
      motes.step(STEP * SPEED)
      // Paint as we go: segments are consumed each frame, so batching them all
      // to the end would balloon the queue for no benefit.
      paintTrail()
    }
  }

  /**
   * Point `drawLayer` and `fadeLayer` at the right buffers for this frame.
   *
   * A dissolve claims whichever layer was being drawn to when it started; a
   * launch then moves new growth to the *other* one. With an overlapping
   * NEXT_PATH_DELAY that is what keeps the incoming tree out of the outgoing
   * tree's dissolve.
   */
  function syncLayers() {
    // Keyed on the dissolve's id, not on a false→true edge: if a dissolve ever
    // began while the previous one was still running, an edge test would miss it
    // and keep fading the wrong layer, stranding the other at a partial opacity.
    if (field.dissolveId !== lastDissolveId) {
      lastDissolveId = field.dissolveId
      if (fadeLayer !== drawLayer) finishDissolve(layers[fadeLayer])
      fadeLayer = drawLayer
    }

    if (field.generation !== lastGeneration) {
      lastGeneration = field.generation
      drawLayer = 1 - fadeLayer
      const layer = layers[drawLayer]
      layer.ctx.globalCompositeOperation = 'source-over'
      layer.ctx.clearRect(0, 0, width, height)
      layer.generation = field.generation
      setLevel(layer, 1)
    }
  }

  function finishDissolve(layer) {
    layer.ctx.globalCompositeOperation = 'source-over'
    layer.ctx.clearRect(0, 0, width, height)
    setLevel(layer, 0)
  }

  function setLevel(layer, level) {
    // Sub-half-a-level moves are invisible; skip them rather than churn style.
    if (level !== 0 && level !== 1 && Math.abs(layer.level - level) < LEVEL_QUANTUM) return
    if (layer.level === level) return
    layer.level = level
    layer.canvas.style.opacity = level
  }

  /**
   * Dissolve by fading the layer *element*, never its pixels.
   *
   * Multiplying the canvas down in place — `destination-out` once per frame —
   * looks equivalent but is a feedback loop: every pass rounds to 8 bits, so
   * neighbouring values keep collapsing onto each other. About a hundred passes
   * in, the whole 0..255 range has fallen to roughly twenty surviving levels and
   * a dark, smooth glow has become a handful of countable plateaus.
   *
   * Compositor opacity multiplies once, at the end, from pristine source pixels.
   * The canvas is still cleared outright at zero, so the frame genuinely empties.
   */
  function applyDissolve() {
    const fading = layers[fadeLayer]
    const level = field.fadeLevel

    if (level <= 0 && fading.level > 0) {
      finishDissolve(fading)
      return
    }
    setLevel(fading, level)
    if (fadeLayer !== drawLayer) setLevel(layers[drawLayer], 1)
  }

  /** How visible a generation currently is, for effects drawn outside its layer. */
  function levelOfGeneration(generation) {
    for (const layer of layers) if (layer.generation === generation) return layer.level
    return 0
  }

  function paintTrail() {
    syncLayers()
    applyDissolve()

    const ctx = layers[drawLayer].ctx
    ctx.globalCompositeOperation = 'lighter'

    const segments = field.segments
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      stampSegment(ctx, s, GLOW_SPREAD, PATH_BRIGHTNESS * s.gain)
    }
    segments.length = 0

    // Burnt-out tips get stamped into the buffer exactly once, and only onto
    // their own generation's layer.
    for (const bulb of field.bulbs) {
      if (bulb.stamped) continue
      bulb.stamped = true
      if (bulb.generation === field.generation) stampBulb(ctx, bulb)
    }
  }

  function stampBulb(ctx, bulb) {
    const colour = sampleRamp(bulb.t)
    const r = bulb.r * 3.8
    const gradient = ctx.createRadialGradient(bulb.x, bulb.y, 0, bulb.x, bulb.y, r)
    gradient.addColorStop(0, rgba(HIGHLIGHT, 1))
    gradient.addColorStop(0.14, rgba(mix(colour, HIGHLIGHT, 0.75), 0.6))
    gradient.addColorStop(0.42, rgba(colour, 0.16))
    gradient.addColorStop(1, rgba(colour, 0))
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(bulb.x, bulb.y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  function paintDust() {
    dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    dustCtx.clearRect(0, 0, width, height)
    dustCtx.globalCompositeOperation = 'lighter'

    for (const mote of motes.motes) {
      const alpha = motes.opacity(mote)
      if (alpha <= 0.004) continue
      const sprite = mote.bokeh ? sprites.bokeh : sprites.spark
      const size = mote.r * (mote.bokeh ? 2 : 7)
      dustCtx.globalAlpha = alpha
      dustCtx.drawImage(sprite, mote.x - size / 2, mote.y - size / 2, size, size)
    }

    // Fresh tips flare and settle rather than snapping on. The dust layer is
    // never dissolved, so a bulb has to be dimmed by its own generation's level
    // by hand — otherwise the last tips of a tree keep flaring at full strength
    // while the tree they belong to fades out from under them.
    const now = field.time
    for (const bulb of field.bulbs) {
      const age = now - bulb.born
      if (age < 0 || age > BULB_LIFE) continue
      const level = levelOfGeneration(bulb.generation)
      if (level <= 0) continue
      const decay = 1 - age / BULB_LIFE
      const pulse = 0.55 + 0.45 * Math.sin(now * 2.4 + bulb.phase)
      dustCtx.globalAlpha = decay * decay * pulse * 0.55 * level
      const size = bulb.r * 7
      dustCtx.drawImage(sprites.bulb, bulb.x - size / 2, bulb.y - size / 2, size, size)
    }

    dustCtx.globalAlpha = 1
  }

  function paintBloom() {
    // The mirror has to apply each layer's dissolve itself — it is copying the
    // pristine canvases, not the faded elements.
    bloomCtx.globalCompositeOperation = 'source-over'
    bloomCtx.clearRect(0, 0, bloom.width, bloom.height)
    bloomCtx.globalCompositeOperation = 'lighter'
    for (const layer of layers) {
      if (layer.level <= 0) continue
      bloomCtx.globalAlpha = layer.level
      bloomCtx.drawImage(layer.canvas, 0, 0, bloom.width, bloom.height)
    }
    bloomCtx.globalAlpha = 1
  }

  function tick(now) {
    if (disposed) return
    raf = requestAnimationFrame(tick)

    const delta = Math.min((now - last) / 1000, 0.25)
    last = now
    accumulator += delta

    // The accumulator runs on real time so the frame rate stays decoupled, but
    // the scene is stepped by STEP * SPEED — every duration in config.js is in
    // simulation seconds, so they all scale together.
    let steps = 0
    while (accumulator >= STEP && steps < MAX_CATCHUP) {
      field.step(STEP * SPEED)
      motes.step(STEP * SPEED)
      accumulator -= STEP
      steps++
    }
    if (steps === MAX_CATCHUP) accumulator = 0

    paintTrail()
    paintDust()
    paintBloom()
  }

  /** The reduced-motion still: run the scene forward once, then leave it up. */
  function composeStillFrame() {
    idleHandle = 0
    idleTimer = 0
    // Cleared before the disposal check, so the flag always means what its name
    // says rather than staying latched on a renderer that died mid-schedule.
    stillPending = false
    if (disposed) return

    simulate(STILL_SECONDS)
    paintDust()
    paintBloom()
  }

  return {
    start() {
      // Guarded because a second call would overwrite `raf` and strand the
      // first loop running forever, beyond the reach of destroy().
      if (disposed || started) return
      started = true

      applyResize()
      observer?.observe(host)
      window.addEventListener('resize', resize, { passive: true })

      if (reducedMotion) {
        // Compose one finished frame and leave it up — no rAF loop at all.
        //
        // Deferred off the critical path: simulate() runs its whole 8 seconds
        // in one synchronous burst, and doing that inside the mount effect of a
        // root-layout component blocks hydration for a few hundred milliseconds.
        // Spreading it across frames instead is not an option — a tree visibly
        // assembling itself is the exact motion this branch exists to avoid.
        if (typeof requestIdleCallback === 'function') {
          idleHandle = requestIdleCallback(composeStillFrame, { timeout: 500 })
        } else {
          idleTimer = setTimeout(composeStillFrame, 0)
        }
        return
      }

      // No warm-up: the page opens on an empty frame and the first path grows
      // in from nothing, same as every one after it.
      last = performance.now()
      raf = requestAnimationFrame(tick)
    },

    destroy() {
      disposed = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)

      if (idleHandle && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleHandle)
      }
      clearTimeout(idleTimer)

      observer?.disconnect()
      window.removeEventListener('resize', resize)
    },
  }
}
