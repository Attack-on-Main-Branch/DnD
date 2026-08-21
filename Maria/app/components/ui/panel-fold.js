/**
 * A page closing. The opening half is CSS — `.panel-in` and `.float-in` in
 * globals.css — because it only ever runs on mount, and a script-driven one
 * cannot start until React has hydrated. This half has to be script: the
 * creation sheet waits for it before navigating, and it has to be undoable.
 *
 * The animations are kept here rather than looked up again through
 * `getAnimations()`, which lists a *running* animation but not a finished one
 * still filling forwards. That gap is what left the dashboard's greeting
 * invisible: the creation sheet arrives on the same pathname, React keeps that
 * element, and nothing could see the fade still holding it at zero.
 */

const CONTENT_OUT_MS = 150;
const FOLD_MS = 250;
const SLIT_OUT_MS = 100;
const BAR_UP_MS = 300;
const SLIDE_OUT_MS = 380;

/** Flat enough to read as a line, tall enough to keep its rounded ends. */
const SLIT = "scaleY(0.02)";

/** The closing currently on the page. One page, one closing. */
let closing = [];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ease(token, fallback = "ease-out") {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(token).trim() ||
    fallback
  );
}

function play(element, keyframes, options) {
  const animation = element.animate(keyframes, {
    fill: "forwards",
    ...options,
  });
  closing.push(animation);

  return animation;
}

/**
 * The application bar leaving over the top. Only on the way out of the
 * signed-in pages: it belongs to all of them equally, so moving between them
 * leaves it where it is. Coming back is `.bar-in`, on whichever document draws
 * it next.
 */
function raiseBar(bar) {
  if (!bar) {
    return 0;
  }

  play(bar, [{ transform: "none" }, { transform: "translateY(-100%)" }], {
    duration: BAR_UP_MS,
    easing: ease("--ease-tray-in", "ease-in"),
  });

  return BAR_UP_MS;
}

/** The pieces around a panel, leaving on the same beat as its contents. */
function fadeAway(element) {
  play(element, [{ opacity: 1 }, { opacity: 0 }], {
    duration: CONTENT_OUT_MS,
    easing: "ease-out",
  });

  return CONTENT_OUT_MS;
}

/** Where a `data-slide` piece goes when it leaves. */
const SLIDE_OUT = {
  right: "100vw 0",
  left: "-100vw 0",
  /* The table's health bar and its scroll, dropping back below the fold they
     rose out of. */
  down: "0 100vh",
};

/**
 * A tile leaving the way it arrived, out the side it came in by. Movement only:
 * these are `.glass`, and anything below full opacity stops being glass — which
 * is what a fold's closing fade did to them, at a size where it showed. The
 * side and the stagger are the row's own, carried on the element by
 * dashboard/entrance.js and by the table's own entrance.js.
 */
function slideAway(tile) {
  const delay = Number(tile.dataset.slideDelay) || 0;

  play(
    tile,
    [
      { translate: "0 0" },
      { translate: SLIDE_OUT[tile.dataset.slide] ?? SLIDE_OUT.left },
    ],
    {
      duration: SLIDE_OUT_MS,
      delay,
      easing: ease("--ease-tray-in", "ease-in"),
    },
  );

  return SLIDE_OUT_MS + delay;
}

/** Contents out, then the panel folds, then the slit goes. */
function foldPanel(panel) {
  const content = panel.firstElementChild;

  if (content) {
    play(content, [{ opacity: 1 }, { opacity: 0 }], {
      duration: CONTENT_OUT_MS,
      easing: "ease-out",
    });
  }

  // The unfold's curve reversed: run forwards it eased *out*, so the last few
  // percent crawled and the fold read as unfinished.
  play(panel, [{ transform: "scaleY(1)" }, { transform: SLIT }], {
    duration: FOLD_MS,
    delay: CONTENT_OUT_MS,
    easing: ease("--ease-tray-in", "ease-in"),
  });

  play(panel, [{ opacity: 1 }, { opacity: 0 }], {
    duration: SLIT_OUT_MS,
    delay: CONTENT_OUT_MS + FOLD_MS,
    easing: "ease-out",
  });

  return CONTENT_OUT_MS + FOLD_MS + SLIT_OUT_MS;
}

/**
 * Everything under `root` that is marked to leave, and how long it takes.
 *
 * Each piece only goes when the thing it belongs to goes. The bar belongs to
 * the layout, so it waits for `leavingLayout` — signing out. `data-fade="route"`
 * belongs to the route rather than the view: `?new` swaps the panel underneath
 * the dashboard's greeting while the page around it stays, and taking it away
 * and putting it back for that reads as leaving somewhere you have not left.
 * Everything else — plain `data-fade`, panels, tiles — is the view itself and
 * always goes.
 */
export function closeOut(
  root,
  { leavingLayout = false, leavingRoute = true } = {},
) {
  for (const animation of closing) {
    animation.cancel();
  }

  closing = [];

  if (prefersReducedMotion()) {
    return 0;
  }

  const fading = leavingRoute
    ? "[data-fade]"
    : '[data-fade]:not([data-fade="route"])';

  const waits = [
    ...(leavingLayout ? [raiseBar(root.querySelector("[data-bar]"))] : []),
    ...[...root.querySelectorAll(fading)].map(fadeAway),
    ...[...root.querySelectorAll("[data-slide]")].map(slideAway),
    ...[...root.querySelectorAll("[data-fold]")].map(foldPanel),
  ];

  return Math.max(0, ...waits);
}

/**
 * The closing taken back off, from wherever it had got to — reversed rather
 * than cancelled, so one caught after a few frames comes back in a few frames
 * and one that finished fades back in rather than snapping.
 *
 * Called when a navigation lands, for whatever outlived it, and when a sign-in
 * the server turned down leaves the card where it was.
 */
export function reopen() {
  for (const animation of closing) {
    animation.reverse();
  }

  closing = [];
}
