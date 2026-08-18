/**
 * Which way the grimoire flies, and keeping its drift continuous across the
 * navigation. A view transition photographs one frame of the old page and hands
 * it to a freshly mounted element on the new one, which needs three things:
 *
 * DIRECTION — the transition pseudo-elements descend from the document root, so
 * the root is the only place that can tell them which way to turn.
 *
 * PHASE — the arriving book would start its drift at 0% while the photograph
 * caught the departing one mid-swing, up to 16px apart. The departing animation
 * is paused and its position carried across. Paused rather than eased to rest:
 * the resting pose is the bottom of the swing, so easing visibly dropped the
 * book before it set off.
 *
 * PIVOT — the photographed element is the wrapper, but the book inside it is up
 * to 16px off-centre when the shutter falls. Rotating the photograph 30° about
 * the wrapper swings that offset around, while the real book on the far side
 * has it unrotated (a transform list translates before it rotates), leaving the
 * two ends 2·16·sin(15°) ≈ 8px apart on the final frame. `--mark-drift`
 * publishes the offset so the stylesheet can pivot about the book's own centre.
 */
const ATTRIBUTE = "data-view-nav";
const DRIFT_PROPERTY = "--mark-drift";
const BACKSTOP_MS = 6000;

let backstop;
let watching = false;

/** Whether a real transition has been seen since the flag was stamped. */
let started = false;

/** Where in the 9s drift the departing book was, in milliseconds. */
let carriedPhase = null;

/** Whichever book is currently held still, so it can be let go again. */
let heldAnimation = null;

function driftOf(book) {
  if (!book?.getAnimations) {
    return null;
  }

  return (
    book.getAnimations().find((a) => a.animationName === "mark-float") ?? null
  );
}

/**
 * `f` of the composed matrix is exactly the translateY: the drift computes to
 * translate(0,tY)·rotate(θ), and a rotation contributes no translation of its
 * own. Written to the root so it inherits down to the transition pseudo-elements.
 */
function stampDriftOffset(book) {
  const transform = getComputedStyle(book).transform;
  let offset = 0;

  // "none" under reduced motion, where there is no drift to correct for.
  if (transform && transform !== "none") {
    try {
      offset = new DOMMatrixReadOnly(transform).f;
    } catch {
      offset = 0;
    }
  }

  document.documentElement.style.setProperty(DRIFT_PROPERTY, `${offset}px`);
}

export function markNavDirection(direction) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute(ATTRIBUTE, direction);

  const book = document.querySelector(".mark-book");
  const drift = driftOf(book);

  if (drift) {
    carriedPhase = drift.currentTime;
    drift.pause();
    heldAnimation = drift;
    stampDriftOffset(book);
  }

  watchForEnd();
  armBackstop();
}

/**
 * Called by the mark mounting on the far side while the flight is still in the
 * air, so the hand-over has nothing to jump between. No-op on a normal load.
 */
export function adoptCarriedPhase(book) {
  if (carriedPhase == null) {
    return;
  }

  const drift = driftOf(book);

  if (!drift) {
    return;
  }

  drift.currentTime = carriedPhase;
  drift.pause();
  heldAnimation = drift;
}

/**
 * Holds the flag until the transition finishes rather than guessing a duration.
 * `:active-view-transition` is the only signal and is newer than the transition
 * API, so a browser that does not know the selector falls back to the timeout.
 */
function watchForEnd() {
  if (watching) {
    return;
  }

  watching = true;

  function step() {
    let active = false;

    try {
      active = document.documentElement.matches(":active-view-transition");
    } catch {
      watching = false;
      return;
    }

    if (active) {
      started = true;
    } else if (started) {
      watching = false;
      clearNavDirection();
      return;
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * Last resort for a submit that never navigates — a failed sign-out has no
 * result to hang a release off. It cannot just fire on expiry: a slow
 * navigation looks identical from here, and releasing mid-flight would break
 * exactly what this protects. So it checks first and waits again if busy.
 */
function armBackstop() {
  clearTimeout(backstop);
  backstop = setTimeout(onBackstopExpiry, BACKSTOP_MS);
}

function onBackstopExpiry() {
  let active = false;

  try {
    active = document.documentElement.matches(":active-view-transition");
  } catch {
    active = false;
  }

  if (started || active) {
    armBackstop();
    return;
  }

  clearNavDirection();
}

export function clearNavDirection() {
  if (typeof document === "undefined") {
    return;
  }

  clearTimeout(backstop);
  started = false;

  document.documentElement.removeAttribute(ATTRIBUTE);
  document.documentElement.style.removeProperty(DRIFT_PROPERTY);

  heldAnimation?.play();
  heldAnimation = null;
  carriedPhase = null;
}
