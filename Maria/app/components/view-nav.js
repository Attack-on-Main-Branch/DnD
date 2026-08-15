/**
 * Which way the grimoire is about to fly, and keeping its drift continuous
 * across the navigation.
 *
 * Two jobs, both needed because a view transition photographs one frame of the
 * old page and hands it to a freshly mounted element on the new one.
 *
 * DIRECTION. The transition pseudo-elements are children of the document root,
 * so the root is the only thing that can tell them anything. Signing in flies
 * the book down to the dashboard's corner and turns it one way; signing out
 * flies it back and has to turn it the other.
 *
 * PHASE. The book that lands would otherwise begin its drift at 0%, while the
 * photograph caught the departing one wherever it happened to be — up to 16px
 * and a couple of degrees apart, which is a jump on arrival. So the departing
 * animation is paused, its position along the cycle is carried across, and the
 * arriving one is set to the same point and held there until the flight ends.
 *
 * Pausing rather than easing to rest, and that is the whole difference: an
 * earlier version animated the book to its resting pose first, and since that
 * pose is the bottom of the swing, the book visibly dropped before setting
 * off. Freezing it where it already is moves nothing at all.
 *
 * PIVOT. Freezing it mid-swing has one consequence that has to be paid for.
 * The element the transition photographs is the book's wrapper, which never
 * moves; the book inside it is up to 16px above that wrapper's centre when the
 * shutter falls. The flight then turns the photograph 30° about the wrapper's
 * centre, which swings that internal 16px around with it — while the real book
 * waiting on the far side is at a straight, unrotated 16px, because a
 * transform list translates before it rotates. So the two ends disagree by
 * 2·16·sin(15°) ≈ 8px, and only in the very last frame: at rest they agree,
 * at the top of the swing they are 8px apart. That is the arrival jump that
 * came and went depending on when the button was pressed. The offset is
 * published here as `--mark-drift` so the stylesheet can pivot the photograph
 * about the book's own centre instead, which holds it still for the whole
 * flight and lands it exactly where the real one is.
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
 * Publishes how far the frozen book sits from its wrapper's centre, so the
 * flight can turn the photograph about the book rather than about the box.
 *
 * `f` of the composed matrix is exactly the translateY: the drift computes to
 * translate(0,tY)·rotate(θ), and a rotation contributes no translation of its
 * own. Written to the root because the transition pseudo-elements descend from
 * it, and custom properties inherit all the way down to them.
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
 * Called by the mark that mounts on the far side, while the flight is still in
 * the air. Puts its drift at the same point the departing one was frozen at
 * and holds it there, so the hand-over when the photograph is taken away has
 * nothing to jump between.
 *
 * A no-op on an ordinary page load, when nothing has been carried.
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
 * Holds the flag until the transition has actually finished, rather than
 * guessing at a duration.
 *
 * Released too early and the arriving book starts drifting while it is still
 * in the air, so it is no longer where the photograph left it. Held too long
 * and it simply sits still after landing.
 *
 * `:active-view-transition` is the only signal for this and is newer than the
 * transition API itself, so a browser that does not know the selector falls
 * back to the timeout.
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
 * The last resort, for a submit that never navigates at all — a sign-out that
 * fails, say, which has no result to hang a release off.
 *
 * It cannot simply fire after six seconds, because from here a submit that
 * never navigates and a submit that navigates slowly look identical: the timer
 * measures round-trip latency, not failure. Firing mid-flight would unstamp
 * the direction, drop the carried phase and set the drift running again while
 * the book is still in the air — breaking exactly what it exists to protect.
 * So on expiry it looks first, and waits again if anything is actually
 * happening.
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
