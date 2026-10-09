/**
 * The background's colour, turned from its own gold to a fighting red and back.
 *
 * Applied to the finished picture rather than the brush: the trails accumulate,
 * so a palette swap would only colour new growth and leave the tree already
 * standing gold until it dissolved — a seam, not a fade.
 *
 * A gamma curve per channel rather than `hue-rotate()`. Rotating gold at full
 * brightness clips it to salmon and drags the rust tips round to magenta.
 * Bending green and blue down takes gold to orange-red, amber to red and rust
 * to oxblood, and the near-white core — high in every channel — keeps its heat.
 * Red is lifted a little, because red alone is far darker than the gold it
 * replaces and the tree read as dimmer rather than as another colour.
 * Everything else about the picture is untouched.
 *
 * Driven from script because an SVG filter's numbers cannot be transitioned in
 * CSS. At rest the filter is taken off entirely, so the gold background pays
 * nothing for it.
 */

/** The curve at full strength, per channel. 1 leaves a channel as it was. */
const RED_EXPONENT = 0.75;
const GREEN_EXPONENT = 4;
const BLUE_EXPONENT = 2;

/** Gold to red, end to end. Turned back midway, it takes only what is left. */
const FADE_MS = 1500;

function smoothstep(k) {
  return k * k * (3 - 2 * k);
}

/**
 * `red`, `green` and `blue` are the filter's `feFuncR`, `feFuncG` and
 * `feFuncB`; `reference` is the `url(#…)` the host wears while any of the red
 * is showing.
 */
export function createTint({ host, red, green, blue, reference }) {
  let heat = 0;
  let from = 0;
  let to = 0;
  let start = 0;
  let duration = 0;
  let raf = 0;

  function paint(level) {
    red.setAttribute("exponent", String(1 + (RED_EXPONENT - 1) * level));
    green.setAttribute("exponent", String(1 + (GREEN_EXPONENT - 1) * level));
    blue.setAttribute("exponent", String(1 + (BLUE_EXPONENT - 1) * level));
    host.style.filter = level > 0 ? reference : "";
  }

  function step(now) {
    const k = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
    heat = from + (to - from) * smoothstep(k);
    paint(heat);
    raf = k < 1 ? requestAnimationFrame(step) : 0;
  }

  return {
    /** 1 for red, 0 for gold. */
    set(target) {
      if (target === to) return;

      cancelAnimationFrame(raf);
      from = heat;
      to = target;
      start = performance.now();
      duration = FADE_MS * Math.abs(to - from);
      raf = requestAnimationFrame(step);
    },

    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      paint(0);
    },
  };
}
