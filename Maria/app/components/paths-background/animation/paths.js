/**
 * Path growth simulation.
 *
 * One *branching* path at a time. A trunk climbs out of the bottom of the
 * frame, forks as it goes, and every tip sways, tapers and finally burns out
 * into a glowing bead. Only once the whole system is spent — trunk and every
 * descendant — is the next path launched.
 *
 * The field never draws anything itself: it pushes line segments into
 * `segments` (drained by the renderer each frame) so the simulation and the
 * canvas work stay decoupled.
 */

import {
  BRANCH_MIN_WIDTH,
  FADE_DELAY,
  FADE_DURATION,
  GLOW_SPREAD,
  MAX_BRANCHES_PER_PATH,
  NEXT_PATH_DELAY,
  TRUNK_WIDTH_MAX,
  TRUNK_WIDTH_MIN,
} from './config.js'

const TAU = Math.PI * 2
const UP = -Math.PI / 2

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v)
const rand = (min, max) => min + Math.random() * (max - min)
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
/** Cheap approximation of a normal distribution in roughly -1..1. */
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
/** Shortest signed distance between two angles. */
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))
/** Smooth 0→1 over 0..1, flat at both ends. */
const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/**
 * How far a forked branch takes to reach full brightness, as a multiple of its
 * own stamp radius.
 *
 * A child is born exactly where its parent is, so for its first stretch it is
 * depositing into pixels the parent has already lit — and light is additive, so
 * the junction comes out brighter than either line. Integrating the brush
 * profile, an un-ramped child adds half a line's worth at the fork point, making
 * it 1.5× as bright as the branches leaving it. Easing the child in over two
 * stamp radii brings that to 1.03×, which is under a percent of visible
 * difference, and the parent's own glow covers the stretch where the child is
 * still dim so there is no seam.
 */
const FORK_RAMP_RADII = 2

/** How many times a tip may fork before it can only run out. */
const MAX_DEPTH = 7
/** Furthest any tip may aim from straight up, radians (~57°). */
const MAX_LEAN = 1
/** Seconds a burnt-out tip keeps pulsing on the overlay layer. */
export const BULB_LIFE = 2.5

/**
 * Where a path is in its loop. The field owns the timing rather than the
 * renderer; the renderer just reads `fadeLevel` and `generation` and puts the
 * two generations on their own layers.
 */
const GROWING = 'growing'
const HOLDING = 'holding'
const PENDING = 'pending'

export class PathField {
  constructor(width, height) {
    /** @type {object[]} live growing tips — all belong to the one path in flight */
    this.tips = []
    /** @type {object[]} segments produced this frame, drained by the renderer */
    this.segments = []
    /** @type {object[]} burnt-out tips still worth glowing */
    this.bulbs = []
    this.time = 0
    /** Current loop stage, one of GROWING / HOLDING / PENDING. */
    this.stage = PENDING
    /** Seconds left before the next path launches. */
    this.launchTimer = 0
    /** Seconds left of the post-growth hold. */
    this.holdTimer = 0
    /**
     * Bumped every launch. The renderer uses it to move new growth onto the
     * other trail layer, so an overlapping launch never gets caught by the
     * previous generation's dissolve.
     */
    this.generation = 0
    /**
     * Whether a generation is currently dissolving, and how much of it is left
     * (1 → 0). This runs on its own clock rather than as a stage, because the
     * next path may well have launched and be growing while it finishes.
     */
    this.dissolving = false
    this.fadeLevel = 1
    /**
     * Bumped each time a dissolve begins. The renderer keys off this rather than
     * a false→true edge on `dissolving`, so a dissolve that starts while another
     * is still running is still noticed.
     */
    this.dissolveId = 0
    this.swayPhase = Math.random() * TAU
    this.setSize(width, height)
  }

  setSize(width, height) {
    // Tips and bulbs both carry absolute coordinates, so they have to move
    // with the box the way DustField already moves its motes. A resize
    // stretches the whole trail bitmap; anything holding a raw x/y is left
    // behind by it.
    //
    // For a bulb that means its redrawn halo lands beside the core stamped
    // into the bitmap rather than around it — self-healing within BULB_LIFE
    // while the loop runs, permanent in the reduced-motion still. For a live
    // tip it means the next segment starts offset from where its own trail now
    // ends, notching the line, and that notch is baked into the accumulation
    // buffer for the rest of the generation.
    //
    // `px`/`py` need no rescale: `advance` overwrites them from `x`/`y` before
    // they are read again.
    //
    // Position only, deliberately. `width`, `speed` and `angle` stay in
    // pre-resize units, so after a large or lopsided resize a live tip
    // continues its stretched history at a slightly wrong thickness and
    // heading. Both are gradual — the resize is coalesced to one pass per
    // frame, and `straighten` pulls the heading back toward `target` within a
    // second or two — whereas a positional break is a hard seam baked into the
    // accumulation buffer for the rest of the generation. Correcting the angle
    // would mean correcting speed to match, for an artefact nobody can see.
    if (this.width && this.height) {
      const scaleX = width / this.width
      const scaleY = height / this.height

      for (const b of this.bulbs) {
        b.x *= scaleX
        b.y *= scaleY
      }

      for (const p of this.tips) {
        p.x *= scaleX
        p.y *= scaleY
      }
    }

    this.width = width
    this.height = height
    // Everything downstream is expressed in "design pixels" at ~820px, so a
    // path keeps the same proportions on a phone and on an ultrawide.
    this.scale = clamp(Math.min(width, height) / 820, 0.6, 1.9)
    this.origin = { x: width * 0.5, y: height + 30 * this.scale }
  }

  /** Advance the field by `dt` seconds. */
  step(dt) {
    this.time += dt
    // The root slowly sways left and right so consecutive paths never rise out
    // of exactly the same spot.
    this.origin.x = this.width * (0.5 + Math.sin(this.time * 0.047 + this.swayPhase) * 0.085)

    this.advanceDissolve(dt)
    this.advanceStage(dt)

    const spawned = []
    let write = 0
    for (let i = 0; i < this.tips.length; i++) {
      const tip = this.tips[i]
      if (this.advance(tip, dt, spawned)) this.tips[write++] = tip
    }
    this.tips.length = write

    const room = MAX_BRANCHES_PER_PATH - this.tips.length
    for (let i = 0; i < Math.min(room, spawned.length); i++) this.tips.push(spawned[i])

    this.pruneBulbs()
  }

  /**
   * Run the outgoing generation's dissolve down a straight ramp to exactly 0.
   *
   * Separate from the stage machine on purpose: with NEXT_PATH_DELAY shorter
   * than FADE_DURATION the next path is already growing while this finishes.
   */
  advanceDissolve(dt) {
    if (!this.dissolving) return
    this.fadeLevel = Math.max(0, this.fadeLevel - dt / Math.max(FADE_DURATION, 1e-3))
    if (this.fadeLevel <= 0) this.dissolving = false
  }

  /**
   * Drive the grow → hold → launch-the-next loop.
   *
   * Nothing touches the trail while a path is growing, so the tree reaches full
   * brightness intact.
   */
  advanceStage(dt) {
    switch (this.stage) {
      case GROWING:
        if (this.tips.length === 0) {
          this.stage = HOLDING
          this.holdTimer = FADE_DELAY
        }
        break

      case HOLDING:
        this.holdTimer -= dt
        if (this.holdTimer <= 0) {
          this.dissolving = true
          this.dissolveId++
          this.fadeLevel = 1
          this.launchTimer = NEXT_PATH_DELAY
          this.stage = PENDING
        }
        break

      case PENDING:
        this.launchTimer -= dt
        if (this.launchTimer <= 0) this.launch()
        break
    }
  }

  /** Launch a new branching path: a single trunk just below the bottom edge. */
  launch() {
    const s = this.scale
    const x = clamp(
      this.origin.x + gauss() * this.width * 0.14,
      this.width * 0.18,
      this.width * 0.82,
    )
    const y = this.height + rand(8, 90) * s
    // The trunk climbs very close to vertical. With only one path on screen its
    // heading is the axis the whole tree is built around, so any lean here gets
    // inherited and compounded by every fork until the tree walks off the frame.
    const target = UP + rand(-0.12, 0.12)
    const trunk = this.makeTip(
      x,
      y,
      target + rand(-0.1, 0.1),
      0,
      rand(TRUNK_WIDTH_MIN, TRUNK_WIDTH_MAX) * s,
      rand(6, 10),
      target,
    )
    trunk.speed *= rand(1.05, 1.3)
    this.tips.push(trunk)
    this.stage = GROWING
    this.generation++
  }

  /**
   * `target` is the heading the tip drifts towards. Forks hand their children a
   * target stepped off their own, so a tree fans out symmetrically from the
   * trunk instead of drifting in whichever direction it happened to start.
   */
  makeTip(x, y, angle, depth, width, life, target) {
    const s = this.scale
    const lean = target - UP
    const side = lean > 0 ? 1 : lean < 0 ? -1 : Math.random() < 0.5 ? -1 : 1
    return {
      x,
      y,
      px: x,
      py: y,
      angle,
      target,
      depth,
      width,
      life,
      age: 0,
      speed: rand(105, 165) * s * (1 - depth * 0.06),
      curl: side * rand(0.04, 0.24),
      // Wobble is the angular amplitude, swaySpeed its frequency; a slow, wide
      // sway is what makes a tendril rather than a blade of grass. `straighten`
      // damps it, so it has to stay low or the strands go rigid.
      wobble: rand(0.3, 0.95) * (0.7 + depth * 0.15),
      sway: Math.random() * TAU,
      swaySpeed: rand(0.35, 1.05),
      // A second, faster, much shallower octave on top. One sine alone reads as
      // a mechanical arc; two beating against each other give the curve the
      // small irregularities that make it look drawn rather than plotted.
      wobble2: rand(0.1, 0.3),
      sway2: Math.random() * TAU,
      swaySpeed2: rand(2.4, 4.2),
      straighten: depth === 0 ? 0.34 : 0.22,
      taper: rand(0.86, 0.95),
      drag: rand(0.93, 0.99),
      splits: 0,
      maxSplits: depth === 0 ? randInt(5, 9) : randInt(1, 3),
      nextSplit: rand(0.3, 0.9),
      // Distance covered so far, and over how much of it this tip eases up to
      // full brightness. Only forked children ramp — see FORK_RAMP_RADII. The
      // trunk starts below the frame with nothing to overlap, so it is 0.
      travelled: 0,
      rampDistance: depth === 0 ? 0 : (width * GLOW_SPREAD * FORK_RAMP_RADII) / 2,
    }
  }

  /** @returns {boolean} whether the tip is still alive */
  advance(p, dt, spawned) {
    p.age += dt
    p.px = p.x
    p.py = p.y

    p.sway += p.swaySpeed * dt
    p.sway2 += p.swaySpeed2 * dt
    // Tips hook over as they burn out, the way the ED's tendrils curl at the end.
    const senescence = clamp((p.age - p.life * 0.65) / (p.life * 0.35), 0, 1)
    const wander = Math.sin(p.sway) * p.wobble + Math.sin(p.sway2) * p.wobble2
    p.angle += (p.curl * (1 + senescence * 2.2) + wander) * dt
    p.angle += wrapAngle(p.target - p.angle) * p.straighten * dt

    p.speed *= Math.pow(p.drag, dt)
    p.width *= Math.pow(p.taper, dt)
    p.x += Math.cos(p.angle) * p.speed * dt
    p.y += Math.sin(p.angle) * p.speed * dt

    const t = this.colorT(p)
    const len = Math.hypot(p.x - p.px, p.y - p.py)
    p.travelled += len
    this.segments.push({
      x0: p.px,
      y0: p.py,
      x1: p.x,
      y1: p.y,
      w: p.width,
      t,
      len,
      // Eases a forked child up to full brightness so it stops double-lighting
      // the pixels its parent already lit at the junction.
      gain: p.rampDistance > 0 ? smoothstep(p.travelled / p.rampDistance) : 1,
    })

    // Don't fork a branch so thin its children would be born already spent.
    if (
      p.age >= p.nextSplit &&
      p.splits < p.maxSplits &&
      p.depth < MAX_DEPTH &&
      p.width > BRANCH_MIN_WIDTH * 2.5 * this.scale
    ) {
      this.fork(p, spawned)
    }

    const spent = p.age >= p.life || p.width <= BRANCH_MIN_WIDTH * this.scale
    const offscreen = p.y < -60 || p.x < -160 || p.x > this.width + 160

    if (spent && !offscreen) {
      this.bulbs.push({
        x: p.x,
        y: p.y,
        t,
        r: Math.max(2.4, p.width * 1.6) * this.scale,
        born: this.time,
        phase: Math.random() * TAU,
        // Which trail layer this belongs on. A bulb created in the same frame a
        // new path launches must not be stamped onto the incoming generation's
        // layer, or it would outlive the tree it came from.
        generation: this.generation,
        stamped: false,
      })
    }

    return !spent && !offscreen
  }

  fork(p, spawned) {
    p.splits++
    p.nextSplit = p.age + rand(0.3, 0.85)

    const twin = Math.random() < 0.24
    const count = twin ? 2 : 1
    for (let i = 0; i < count; i++) {
      const dir = twin ? (i === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1
      spawned.push(
        this.makeTip(
          p.x,
          p.y,
          p.angle + dir * rand(0.2, 0.62),
          p.depth + 1,
          p.width * rand(0.52, 0.78),
          p.life * rand(0.45, 0.8),
          clamp(p.target + dir * rand(0.18, 0.5), UP - MAX_LEAN, UP + MAX_LEAN),
        ),
      )
    }
    // Pinch the parent at the fork so joints read as joints.
    p.width *= 0.9
  }

  /**
   * Where a point sits on the colour ramp. Sideways distance from the root is
   * the dominant term (centre = chartreuse, flanks = rust); fork depth pushes it
   * further out, height nudges it back towards the hot end.
   */
  colorT(p) {
    const lateral = Math.min(1, Math.abs(p.x - this.origin.x) / (this.width * 0.38))
    const rise = clamp((this.origin.y - p.y) / (this.height * 0.95), 0, 1)
    return clamp(0.12 + lateral * 0.72 + p.depth * 0.06 - rise * 0.16, 0, 1)
  }

  pruneBulbs() {
    const cutoff = this.time - BULB_LIFE
    let write = 0
    for (let i = 0; i < this.bulbs.length; i++) {
      if (this.bulbs[i].born > cutoff) this.bulbs[write++] = this.bulbs[i]
    }
    this.bulbs.length = write
  }
}
