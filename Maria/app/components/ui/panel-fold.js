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

/** The table's furniture, stepping back behind the map it belongs to. */
const TUCK_MS = 240;

/** The board itself, once nothing is left standing around it. */
const SHRINK_MS = 380;

/** The play star, on its way to the table it opens. */
const BLOOM_MS = 700;

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

/** Which way a piece marked `data-tuck` steps back out of sight. */
const TUCK_OUT = {
  /* The marks above the board, dropping behind it. Their own height and then
     some: the mat stands 1.5rem proud of the picture, and a mark that stops
     short of it fades out in the open air instead of going anywhere. */
  down: "0 5rem",
  /* The dice rail, sliding back under the map's right edge — the entrance in
     entrance.js run backwards. */
  left: "-5rem 0",
};

/**
 * A piece going behind the map rather than off the page. It has somewhere to
 * hide, so it travels its own length and no further; the fade finishes the job
 * for whatever part of it never reaches cover.
 */
function tuckAway(piece) {
  play(
    piece,
    [
      { translate: "0 0", opacity: 1 },
      { translate: TUCK_OUT[piece.dataset.tuck] ?? TUCK_OUT.down, opacity: 0 },
    ],
    {
      duration: TUCK_MS,
      easing: ease("--ease-tray-in", "ease-in"),
    },
  );

  return TUCK_MS;
}

/**
 * The map, going the way it arrived: `map-rise` reversed, at the same 0.7. It
 * waits for the tuck above, because a board that shrinks out from under its own
 * furniture leaves the furniture hanging in the air.
 */
function shrinkAway(map) {
  play(
    map,
    [
      { scale: "1", opacity: 1 },
      { scale: "0.7", opacity: 0 },
    ],
    {
      duration: SHRINK_MS,
      delay: TUCK_MS,
      easing: ease("--ease-tray-in", "ease-in"),
    },
  );

  return TUCK_MS + SHRINK_MS;
}

/**
 * The star that was pressed, growing past the page as the table opens behind
 * it. Only ever the one that was pressed — see `closeOut` — because every other
 * way off these pages leaves it fading with the header it sits in.
 *
 * The fade lags the growth deliberately: on a straight ramp it had gone before
 * it was large enough to read as anything. `--ease-flight` and not the tray's
 * curve for the same reason — that one spends four fifths of its travel in the
 * first fifth of its time, which is a snap rather than a swell.
 */
function bloomAway(star) {
  play(
    star,
    [
      { scale: "1", opacity: 1, offset: 0 },
      { scale: "1.5", opacity: 0.85, offset: 0.4 },
      { scale: "2.6", opacity: 0, offset: 1 },
    ],
    {
      duration: BLOOM_MS,
      easing: ease("--ease-flight", "ease-in-out"),
    },
  );

  return BLOOM_MS;
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
 * the layout, so it waits for `leavingLayout` — signing out. A `data-bloom`
 * piece belongs to the press: `pressed` is the anchor the click came through,
 * and only a star inside it grows rather than fades. `data-fade="route"`
 * belongs to the route rather than the view: `?new` swaps the panel underneath
 * the dashboard's greeting while the page around it stays, and taking it away
 * and putting it back for that reads as leaving somewhere you have not left.
 * Everything else — plain `data-fade`, panels, tiles — is the view itself and
 * always goes.
 */
export function closeOut(
  root,
  { leavingLayout = false, leavingRoute = true, pressed = null } = {},
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

  /* A `data-bloom` piece is only ever the one that was pressed. It carries
     `data-fade` as well, and takes that instead on every other way out. */
  const blooming = pressed?.closest("[data-bloom]") ?? null;

  const waits = [
    ...(leavingLayout ? [raiseBar(root.querySelector("[data-bar]"))] : []),
    ...(blooming ? [bloomAway(blooming)] : []),
    ...[...root.querySelectorAll(fading)]
      .filter((piece) => piece !== blooming)
      .map(fadeAway),
    ...[...root.querySelectorAll("[data-slide]")].map(slideAway),
    ...[...root.querySelectorAll("[data-tuck]")].map(tuckAway),
    ...[...root.querySelectorAll("[data-shrink]")].map(shrinkAway),
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
