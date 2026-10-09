"use client";

import { CRITICAL_SUCCESS, criticalFace } from "sina/rules/dice";

import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

/**
 * A natural 20 or a natural 1, flaring where the die came to rest: a shockwave
 * along the floor, a flash on the face, and the number lifting off it towards
 * the camera before it fades. Gold for the one; for the other, the blood red the
 * map's border wears in combat.
 *
 * THE SAME ON EVERY SCREEN WITHOUT A WORD ON THE WIRE. Every chair runs the
 * same seeded simulation — see dice-engine.js — so each already knows where
 * the die lies, the pose coming off its own physics worker. Nothing in it is
 * random, so the same pose draws the same flare.
 *
 * ITS OWN CANVAS, OVER THE DICE. dice-box renders in a worker on an offscreen
 * canvas, so nothing on this thread can add to its scene. This one is laid
 * over it with a camera hung exactly as dice-box hangs its own, and composited
 * `plus-lighter`, so what it draws ADDS to the dice and the map beneath. The
 * ring would cross the die it starts under, so it is cut away inside the die's
 * own footprint.
 *
 * Fired and forgotten: nothing waits on it, and every mesh, texture, material
 * and the GPU context are given back the moment it ends — the canvas off the
 * page FIRST. A canvas whose context is lost is drawn solid white, and
 * `plus-lighter` adds that to the whole map for a frame.
 */

export const CRIT_LAYER_ID = "dice-crit-layer";

/** dice-box's camera, from its render worker: straight down from this height
    on a perspective lens of this vertical field. */
const CAMERA_HEIGHT = 36.5;
const CAMERA_FOV = 0.25;

/** The physics floor's top face: a box centred at -0.5 with a half-height of 1. */
const FLOOR_Y = 0.5;

/** A d20 across its points, in units of its inradius — the height its centre
    rests at above the floor. */
const D20_SPAN = 2.517;

/** Below this the pose is not a die at rest, and the effect is drawn at it. */
const MIN_INRADIUS = 0.2;

const LIFE_S = 1.25;
const RIPPLE_S = 1.2;
const RIPPLE_REACH = 1.6;
const GLYPH_GROWTH = 2.2;

/** How long after the canvas leaves the page its GPU context is let go. */
const RELEASE_MS = 150;

/** The library, fetched once and only when a table is open. */
let library = null;

export function prepareCritFlare() {
  library ??= import("three").catch((error) => {
    library = null;
    throw error;
  });

  return library;
}

/**
 * NOBODY IS SHOWN A FLARE THEY MISSED. A hidden tab pauses animation frames, so
 * a flare queued while it was away used to play the moment it came back. When
 * the page was last hidden is kept, and a throw that went on while it was —
 * at any point, since a paused board finishes its tumble on the way back — is
 * not flared at all.
 */
let lastHidden = -Infinity;

if (typeof document !== "undefined") {
  if (document.hidden) {
    lastHidden = performance.now();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      lastHidden = performance.now();
    }
  });
}

/** Whether this page has been in view the whole time since `since`. */
function watched(since) {
  return !document.hidden && lastHidden < since;
}

/** A frame later than this was waiting on a hidden page. */
const LATE_FRAME_MS = 250;

/**
 * Every die of one throw that rested on a critical, flared together. `dice`
 * is `throwDie`'s `onRest` answer; `since` is when the throw began, on
 * `performance.now()`'s clock.
 */
export function flareCriticals(dice, since) {
  if (prefersReducedMotion() || !watched(since)) {
    return;
  }

  const crits = dice
    .map((die) => ({ ...die, kind: criticalFace(die.sides, die.value) }))
    .filter((die) => die.kind && die.pose);

  const layer = document.getElementById(CRIT_LAYER_ID);

  if (crits.length === 0 || !layer?.clientWidth || !layer.clientHeight) {
    return;
  }

  /* On the next frame and not in this task: the number is reported in the
     microtasks right behind this one, and a GPU context is not built for free.
     The log and the rail go first. */
  prepareCritFlare()
    .then((THREE) => {
      const asked = performance.now();

      requestAnimationFrame(() => {
        if (watched(since) && performance.now() - asked < LATE_FRAME_MS) {
          play(THREE, layer, crits);
        }
      });
    })
    .catch(() => {});
}

function play(THREE, layer, crits) {
  if (!layer.isConnected) {
    return;
  }

  const width = layer.clientWidth;
  const height = layer.clientHeight;

  const canvas = document.createElement("canvas");

  canvas.className =
    "pointer-events-none absolute inset-0 size-full mix-blend-plus-lighter";
  layer.append(canvas);

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    // No WebGL to spare: the roll stands without its flourish.
    canvas.remove();
    return;
  }

  // Colours go through untouched: they are sRGB already, and additive light
  // is judged by eye rather than measured.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  /* dice-box's camera is left-handed, looking down with -x to the right and
     -z up the screen. Three is right-handed, so the world is mirrored in z on
     the way in and the camera hung with +z up. */
  const camera = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(CAMERA_FOV),
    width / height,
    1,
    CAMERA_HEIGHT + 1,
  );

  camera.position.set(0, CAMERA_HEIGHT, 0);
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 0, 0);

  const owned = [];
  const effects = crits.map((crit) => stage(THREE, scene, owned, crit));

  const start = performance.now();
  let frame = 0;
  let done = false;

  function finish() {
    if (done) {
      return;
    }

    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(backstop);

    // Off the page before the context goes, or the map flashes white.
    canvas.remove();

    for (const thing of owned) {
      thing.dispose();
    }

    scene.clear();
    renderer.renderLists.dispose();
    renderer.dispose();

    setTimeout(() => renderer.forceContextLoss(), RELEASE_MS);
  }

  function tick(now) {
    // A frame's timestamp is when it began, which can be just before `start`.
    const t = Math.max(0, (now - start) / 1000);

    if (t >= LIFE_S) {
      finish();
      return;
    }

    for (const effect of effects) {
      effect(t);
    }

    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  // A hidden tab stops animation frames; the GPU context is let go regardless.
  const backstop = setTimeout(finish, LIFE_S * 1000 + 250);

  frame = requestAnimationFrame(tick);
}

/** One die's flare, built into the scene. Answers the per-frame update. */
function stage(THREE, scene, owned, crit) {
  const [x, y, z] = crit.pose;
  const failure = crit.kind !== CRITICAL_SUCCESS;
  const colors = palette(THREE, failure);

  const inradius = Math.max(MIN_INRADIUS, y - FLOOR_Y);
  const reach = inradius * D20_SPAN * RIPPLE_REACH;
  const face = new THREE.Vector3(x, y + inradius + 0.02, -z);

  /* The number drifts a little towards the middle of the board as it rises,
     which keeps one off a die resting against a wall inside the frame. */
  const inward = new THREE.Vector2(-face.x, -face.z);

  if (inward.lengthSq() > 0) {
    inward.normalize().multiplyScalar(inradius * 0.5);
  }

  const keep = (thing) => {
    owned.push(thing);
    return thing;
  };

  /* The shockwave, flat on the floor. */
  const ripple = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(reach * 2.4, reach * 2.4)),
    keep(
      new THREE.ShaderMaterial({
        uniforms: {
          uCore: { value: colors.core },
          uGlow: { value: colors.glow },
          uRadius: { value: 0 },
          uEcho: { value: 0 },
          uWidth: { value: inradius * 0.3 },
          uOpacity: { value: 1 },
          uHole: { value: inradius * 1.2 },
          // A 1 lays its ring on thicker, where a 20's gold already shines.
          uGain: { value: failure ? 1.6 : 1 },
        },
        vertexShader: RIPPLE_VERTEX,
        fragmentShader: RIPPLE_FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );

  ripple.rotation.x = -Math.PI / 2;
  ripple.position.set(face.x, FLOOR_Y + 0.01, face.z);
  scene.add(ripple);

  /* The flash on the face: a soft halo, a hot core and a four-point glint. */
  const glow = keep(radialTexture(THREE));
  const glint = keep(glintTexture(THREE));

  const halo = sprite(THREE, keep, glow, colors.glow, face);
  const core = sprite(THREE, keep, glow, colors.hot, face);
  const star = sprite(THREE, keep, glint, colors.hot, face);

  scene.add(halo, core, star);

  /* The number, lifted off the face. */
  const lettering = keep(glyphTexture(THREE, String(crit.value), colors));
  const glyph = sprite(
    THREE,
    keep,
    lettering.texture,
    new THREE.Color(1, 1, 1),
    face,
  );
  const glyphHeight = inradius * 0.96;
  const glyphWidth = glyphHeight * lettering.aspect;

  scene.add(glyph);

  return (t) => {
    const flicker = failure ? 0.9 + 0.1 * Math.sin(t * 47) : 1;

    const wave = Math.min(1, t / RIPPLE_S);
    const echo = Math.max(0, (t - 0.12) / RIPPLE_S);

    ripple.material.uniforms.uRadius.value = reach * easeOutCubic(wave);
    ripple.material.uniforms.uEcho.value =
      reach * 0.78 * easeOutCubic(Math.min(1, echo));
    ripple.material.uniforms.uWidth.value =
      inradius * (0.2 + 0.3 * easeOutCubic(wave));
    ripple.material.uniforms.uOpacity.value = Math.pow(1 - wave, 1.6);

    const surge = t < 0.06 ? t / 0.06 : Math.exp(-(t - 0.06) * 6);

    core.material.opacity = surge * flicker;
    core.scale.setScalar(
      inradius * (1.6 + 1.4 * easeOutCubic(Math.min(1, t / 0.25))),
    );

    halo.material.opacity =
      0.75 *
      (t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 3.2)) *
      (1 - easeInQuad(Math.min(1, t / RIPPLE_S))) *
      flicker;
    halo.scale.setScalar(
      inradius * (3.2 + 2 * easeOutCubic(Math.min(1, t / 0.6))),
    );

    star.material.opacity =
      t < 0.05 ? t / 0.05 : Math.max(0, 1 - (t - 0.05) / 0.45);
    star.material.rotation = 0.6 * t;
    star.scale.setScalar(
      inradius * (2 + 3 * easeOutCubic(Math.min(1, t / 0.35))),
    );

    const growth = 1 + (GLYPH_GROWTH - 1) * easeOutCubic(Math.min(1, t / 1));
    const lift = easeOutCubic(Math.min(1, t / RIPPLE_S));
    const appear = Math.min(1, Math.max(0, (t - 0.04) / 0.1));
    const dissolve = 1 - easeInQuad(Math.min(1, Math.max(0, (t - 0.8) / 0.4)));

    // The flashes flicker; the number holds steady, so it can be read.
    glyph.material.opacity = appear * dissolve;
    glyph.scale.set(glyphWidth * growth, glyphHeight * growth, 1);
    glyph.position.set(
      face.x + inward.x * lift,
      face.y + inradius * 1.5 * lift,
      face.z + inward.y * lift,
    );
  };
}

function sprite(THREE, keep, map, color, at) {
  const shown = new THREE.Sprite(
    keep(
      new THREE.SpriteMaterial({
        map,
        color,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );

  shown.position.copy(at);

  return shown;
}

/**
 * The theme's colours, read off the stylesheet's own tokens and resolved by
 * the browser, which is the one thing that reads every colour syntax CSS has.
 */
function palette(THREE, failure) {
  const style = getComputedStyle(document.documentElement);
  const token = (name) => style.getPropertyValue(name).trim();

  // A 1 takes the combat border's own red — see map-stage.jsx.
  const css = failure
    ? { core: token("--color-rose-600"), glow: token("--color-ruby") }
    : { core: token("--color-gold"), glow: token("--color-crit-gold") };

  const core = cssColor(THREE, css.core);
  const glow = cssColor(THREE, css.glow);

  return {
    core,
    glow,
    // Blood stays red: a 1 is barely lifted towards white where a 20 burns.
    hot: core.clone().lerp(new THREE.Color(1, 1, 1), failure ? 0.2 : 0.55),
    // A 1's numeral burns near white inside a tight red glow: red on the red
    // halo behind it is not a number anybody can read.
    shine: failure ? 0.65 : 0.7,
    blur: failure ? 24 : 44,
    css,
  };
}

function cssColor(THREE, value) {
  const probe = document.createElement("canvas");

  probe.width = 1;
  probe.height = 1;

  const pen = probe.getContext("2d", { willReadFrequently: true });

  pen.fillStyle = value || "#ffffff";
  pen.fillRect(0, 0, 1, 1);

  const [r, g, b] = pen.getImageData(0, 0, 1, 1).data;

  return new THREE.Color().setRGB(
    r / 255,
    g / 255,
    b / 255,
    THREE.LinearSRGBColorSpace,
  );
}

function radialTexture(THREE) {
  const size = 128;
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const pen = canvas.getContext("2d");
  const fall = pen.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );

  fall.addColorStop(0, "rgba(255,255,255,1)");
  fall.addColorStop(0.25, "rgba(255,255,255,0.55)");
  fall.addColorStop(0.6, "rgba(255,255,255,0.12)");
  fall.addColorStop(1, "rgba(255,255,255,0)");
  pen.fillStyle = fall;
  pen.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function glintTexture(THREE) {
  const size = 256;
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const pen = canvas.getContext("2d");

  pen.translate(size / 2, size / 2);

  for (const turn of [0, Math.PI / 2]) {
    pen.save();
    pen.rotate(turn);

    const ray = pen.createLinearGradient(-size / 2, 0, size / 2, 0);

    ray.addColorStop(0, "rgba(255,255,255,0)");
    ray.addColorStop(0.5, "rgba(255,255,255,1)");
    ray.addColorStop(1, "rgba(255,255,255,0)");
    pen.fillStyle = ray;
    pen.fillRect(-size / 2, -2, size, 4);
    pen.restore();
  }

  return new THREE.CanvasTexture(canvas);
}

/** The number in the app's display face, burning in the theme's colours. */
function glyphTexture(THREE, text, { css, shine, blur }) {
  const family =
    getComputedStyle(document.body).getPropertyValue("--font-cinzel").trim() ||
    "serif";
  const font = `700 200px ${family}`;
  const pad = 56;

  const canvas = document.createElement("canvas");
  let pen = canvas.getContext("2d");

  pen.font = font;

  const measured = pen.measureText(text);

  canvas.width = Math.ceil(measured.width + pad * 2);
  canvas.height = 200 + pad * 2;

  // Resizing a canvas resets its pen.
  pen = canvas.getContext("2d");
  pen.font = font;
  pen.textAlign = "center";
  pen.textBaseline = "middle";

  const middle = [canvas.width / 2, canvas.height / 2 + 8];

  pen.shadowColor = css.glow;
  pen.shadowBlur = blur;
  pen.fillStyle = css.core;
  pen.fillText(text, ...middle);
  pen.fillText(text, ...middle);

  pen.shadowBlur = 0;
  pen.globalAlpha = shine;
  pen.fillStyle = "#ffffff";
  pen.fillText(text, ...middle);

  const texture = new THREE.CanvasTexture(canvas);

  return {
    texture,
    aspect: canvas.width / canvas.height,
    dispose: () => texture.dispose(),
  };
}

function easeOutCubic(p) {
  return 1 - Math.pow(1 - p, 3);
}

function easeInQuad(p) {
  return p * p;
}

const RIPPLE_VERTEX = /* glsl */ `
  varying vec2 vAt;

  void main() {
    vAt = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* A crest and a fainter echo behind it, with a wash trailing inside; cut away
   where the die stands, which it would otherwise be drawn across. */
const RIPPLE_FRAGMENT = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uGlow;
  uniform float uRadius;
  uniform float uEcho;
  uniform float uWidth;
  uniform float uOpacity;
  uniform float uHole;
  uniform float uGain;

  varying vec2 vAt;

  void main() {
    float d = length(vAt);
    float outside = smoothstep(uHole * 0.92, uHole * 1.08, d);

    float front = (d - uRadius) / uWidth;
    float crest = exp(-front * front);

    float back = (d - uEcho) / (uWidth * 0.7);
    float echo = 0.45 * exp(-back * back);

    float wash = d < uRadius ? 0.22 * pow(d / max(uRadius, 0.0001), 3.0) : 0.0;

    float light = min(1.0, (crest + echo + wash) * uOpacity * outside * uGain);

    if (light <= 0.002) discard;

    gl_FragColor = vec4(mix(uGlow, uCore, crest), light);
  }
`;
