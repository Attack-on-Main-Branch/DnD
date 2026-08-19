"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  MAP_VIGNETTE_SCALED_STYLE,
  MAP_VIGNETTE_STYLE,
  surfaceClasses,
} from "@/app/components/ui/surface";

/** How far a press may drift before it counts as a drag rather than a click. */
const DRAG_SLOP_PX = 4;

/** One step, and only one: a map is either being surveyed or being read. */
const ZOOM = 2.5;

const OPEN_MAP_MS = 320;
const OPEN_FRAME_MS = 200;
const CLOSE_FRAME_MS = 180;
const CLOSE_MAP_MS = 320;

/** Everything above and beside the map inside the card: padding, title, hint. */
const CARD_CHROME_PX = 140;
const CARD_PADDING_PX = 32;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeTray() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ease-tray")
      .trim() || "ease-out"
  );
}

/**
 * The pair of transforms that make the modal's map look like the preview's: the
 * preview crops to 16:9, the modal pads the sides, so morphing the frame alone
 * ended on a snap. The frame takes a plain FLIP and the picture takes the scale
 * that undoes the squash, leaving the map at its own ratio throughout.
 *
 * Both boxes are measured together — read at different moments they sit in
 * different layouts. The ratio comes from the preview because the full image
 * has no natural size yet when the first sequence starts.
 */
function windowReveal(frame, ratio, element) {
  const to = frame?.getBoundingClientRect();
  const from = element?.getBoundingClientRect();

  if (!to?.width || !to?.height || !from?.width || !from?.height) {
    return null;
  }

  const outer = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${
    from.width / to.width
  }, ${from.height / to.height})`;

  if (!ratio) {
    return null;
  }

  // What `object-contain` paints, and the scale that makes it cover.
  const paintedWidth = Math.min(to.width, to.height * ratio);
  const cover = Math.max(
    from.width / paintedWidth,
    from.height / (paintedWidth / ratio),
  );

  const scaleX = from.width / to.width;
  const scaleY = from.height / to.height;
  const preview = getComputedStyle(element);
  // Divided back out of the scale, so both land on the preview's exactly.
  const veilRadius = Math.min(from.width, from.height) / 2;
  const corner = parseFloat(preview.borderTopLeftRadius) || 0;
  const edge = parseFloat(preview.borderTopWidth) || 0;

  return {
    outer,
    inner: `scale(${cover / scaleX}, ${cover / scaleY})`,
    veil: { x: veilRadius / scaleX, y: veilRadius / scaleY },
    corner: `${corner / scaleX}px / ${corner / scaleY}px`,
    // A ring, not a border: a border would change the measured box. Spread is
    // one number for both axes, so this lands within a fraction of a pixel.
    edge: `inset 0 0 0 ${edge / scaleX}px ${preview.borderTopColor}`,
  };
}

/** Called before measuring: a filling animation from the last collapse would
 *  otherwise be part of what gets measured. */
function resetLayers(elements) {
  for (const element of elements) {
    if (!element) {
      continue;
    }

    for (const running of element.getAnimations()) {
      running.cancel();
    }

    element.style.opacity = "";
    element.style.transform = "";
    element.style.visibility = "";
  }
}

/** The veil's circle, in the frame's own space. See MAP_VIGNETTE_SCALED_STYLE. */
function dressVeil(veil, radii) {
  veil?.style.setProperty("--veil-rx", `${radii.x}px`);
  veil?.style.setProperty("--veil-ry", `${radii.y}px`);
}

/** Runs `then` when an animation finishes, unless a newer run superseded it. */
function after(animation, run, runRef, then) {
  animation.finished
    .then(() => {
      if (run === runRef.current) {
        then();
      }
    })
    .catch(() => {});
}

/** No compensation needed: `scrollbar-gutter` keeps the gutter either way. */
function lockScroll() {
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  document.body.style.overflow = "";
}

/** Left moves the image right, so the view travels the way the key points. */
const KEY_STEP_PX = 48;

const KEY_NUDGE = {
  ArrowLeft: { x: KEY_STEP_PX, y: 0 },
  ArrowRight: { x: -KEY_STEP_PX, y: 0 },
  ArrowUp: { x: 0, y: KEY_STEP_PX },
  ArrowDown: { x: 0, y: -KEY_STEP_PX },
};

/**
 * A thumbnail on the page, the original in a frame you can zoom. The split is
 * bandwidth: a ~1.8MB map inline costs that on every visit.
 *
 * The full-resolution `<img>` mounts on first open and then stays. Not before,
 * because an `<img>` in the DOM downloads whether or not it is visible; not
 * unmounted after, or every reopen is a fresh request.
 */
export default function CampaignMap({ url, title }) {
  const [open, setOpen] = useState(false);
  // Sticky: the full image is mounted from the first open onwards. See above.
  const [hasOpened, setHasOpened] = useState(false);
  const [stage, setStage] = useState("idle");
  // Read from the preview; the card is sized from it. 16:9 until first open.
  const [ratio, setRatio] = useState(null);

  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const chromeRef = useRef(null);
  const headerRef = useRef(null);
  const hintRef = useRef(null);
  const labelRef = useRef(null);
  const mapRef = useRef(null);
  const pictureRef = useRef(null);
  const veilRef = useRef(null);

  const stageRef = useRef("idle");
  // Supersedes an in-flight sequence, so a second press cannot leave its
  // last stage behind.
  const runRef = useRef(0);

  function enter(next) {
    stageRef.current = next;
    setStage(next);
  }

  const layers = useCallback(
    () => [
      chromeRef.current,
      headerRef.current,
      hintRef.current,
      mapRef.current,
      pictureRef.current,
      veilRef.current,
    ],
    [],
  );

  /**
   * Map first, frame second. The frame carries the map's duration as its delay
   * and fills backwards, so no timer holds the stages together.
   */
  function playOpen() {
    const run = ++runRef.current;

    resetLayers(layers());

    const reveal = windowReveal(mapRef.current, ratio, openerRef.current);

    if (!reveal || prefersReducedMotion()) {
      enter("open");
      return;
    }

    enter("expanding-map");

    dressVeil(veilRef.current, reveal.veil);

    if (labelRef.current) {
      labelRef.current.style.opacity = "0";
    }

    const easing = easeTray();
    const resting = getComputedStyle(mapRef.current).borderRadius;
    const map = mapRef.current.animate(
      [
        {
          transform: reveal.outer,
          borderRadius: reveal.corner,
          boxShadow: reveal.edge,
        },
        { transform: "none", borderRadius: resting, boxShadow: "none" },
      ],
      { duration: OPEN_MAP_MS, easing },
    );

    pictureRef.current.animate(
      [{ transform: reveal.inner }, { transform: "none" }],
      { duration: OPEN_MAP_MS, easing },
    );

    veilRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: OPEN_MAP_MS,
      easing,
    });

    const bloom = {
      duration: OPEN_FRAME_MS,
      delay: OPEN_MAP_MS,
      easing,
      fill: "backwards",
    };

    const chrome = chromeRef.current.animate(
      [
        { opacity: 0, transform: "scale(0.96)" },
        { opacity: 1, transform: "none" },
      ],
      bloom,
    );

    for (const part of [headerRef.current, hintRef.current]) {
      part?.animate([{ opacity: 0 }, { opacity: 1 }], bloom);
    }

    after(map, run, runRef, () => enter("expanding-frame"));
    after(chrome, run, runRef, () => enter("open"));
  }

  /** The frame folds in, then the map goes back down into the thumbnail. */
  function playClose() {
    const run = ++runRef.current;
    const reveal = windowReveal(mapRef.current, ratio, openerRef.current);

    if (!reveal || prefersReducedMotion()) {
      return Promise.resolve();
    }

    // Cancelled, not reset: clearing the styles first would flash the frame in.
    for (const element of layers()) {
      for (const running of element?.getAnimations() ?? []) {
        running.cancel();
      }
    }

    // Nothing to retract if the frame never bloomed.
    const retract = stageRef.current === "expanding-map" ? 0 : CLOSE_FRAME_MS;
    const easing = easeTray();
    const fold = { duration: retract, easing, fill: "forwards" };

    dressVeil(veilRef.current, reveal.veil);
    const resting = getComputedStyle(mapRef.current).borderRadius;

    enter("collapsing-frame");

    chromeRef.current.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "scale(0.96)" },
      ],
      fold,
    );

    for (const part of [headerRef.current, hintRef.current]) {
      part?.animate([{ opacity: 1 }, { opacity: 0 }], fold);
    }

    const shrink = {
      duration: CLOSE_MAP_MS,
      delay: retract,
      easing,
      fill: "both",
    };

    const map = mapRef.current.animate(
      [
        { transform: "none", borderRadius: resting, boxShadow: "none" },
        {
          transform: reveal.outer,
          borderRadius: reveal.corner,
          boxShadow: reveal.edge,
        },
      ],
      shrink,
    );

    pictureRef.current.animate(
      [{ transform: "none" }, { transform: reveal.inner }],
      shrink,
    );

    veilRef.current.animate([{ opacity: 0 }, { opacity: 1 }], shrink);

    setTimeout(() => {
      if (run === runRef.current) {
        enter("collapsing-map");
      }
    }, retract);

    return map.finished.catch(() => {});
  }

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      lockScroll();
      playOpen();
    } else if (!open && dialog.open) {
      dialog.close();
      unlockScroll();
      // Not at the end of the collapse: that has to keep its last frame until
      // the dialog is actually gone.
      resetLayers(layers());

      // Nothing stood the label down under reduced motion, so nothing brings
      // it back either.
      if (labelRef.current?.style.opacity) {
        labelRef.current.style.opacity = "";
        labelRef.current.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 180,
          easing: easeTray(),
        });
      }

      delete dialog.dataset.closing;
      stageRef.current = "idle";
      setStage("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openDialog() {
    const preview = openerRef.current?.querySelector("img");

    if (preview?.naturalWidth) {
      setRatio(preview.naturalWidth / preview.naturalHeight);
    }
    setHasOpened(true);
    setOpen(true);
  }

  // Closed by the sequence, not beside it: otherwise it leaves the top layer
  // on the first frame and the collapse plays against nothing.
  function close() {
    const dialog = dialogRef.current;

    if (!dialog?.open) {
      setOpen(false);
      return;
    }

    dialog.dataset.closing = "true";
    playClose().then(() => setOpen(false));
  }

  return (
    <>
      {/* `max-w-full` so a narrow window shrinks the frame rather than pushing
          the panel wider than its column. */}
      <button
        ref={openerRef}
        type="button"
        onClick={openDialog}
        aria-label={`View the full map of ${title}`}
        className="group relative mx-auto block aspect-video w-[640px] max-w-full cursor-pointer overflow-hidden rounded-2xl border border-gold/15 bg-surface/60 transition duration-300 hover:border-gold/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70"
      >
        {/* `cover`: a letterboxed thumbnail spent a third of its box on black. */}
        <Image
          src={url}
          alt=""
          fill
          sizes="(min-width: 640px) 640px, 92vw"
          style={{ objectFit: "cover" }}
          className="transition-transform duration-700 group-hover:scale-105"
        />

        {/* Outside the scaling image, so the hover zoom moves the map inside a
            frame that stays put. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={MAP_VIGNETTE_STYLE}
        />

        {/* Straight on the vignette: its own gradient weighted the bottom
            edge against a symmetric one. */}
        <span
          ref={labelRef}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 p-4 text-center font-mono text-[10px] tracking-[0.2em] text-ink/70 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] transition-colors duration-300 group-hover:text-gold"
        >
          Click for full resolution
        </span>
      </button>

      {/* The dialog is the whole viewport and carries no chrome: the glass is a
          layer inside it, free to bloom after the map has settled. */}
      <dialog
        ref={dialogRef}
        data-stage={stage}
        aria-label={`Full map of ${title}`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="map-dialog m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/85"
      >
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
          className="grid h-full w-full place-items-center p-4"
        >
          {/* Sized from the map: a fixed 16:9 wrapper left the frame's fill
              showing down both sides of a map that is not 16:9. Width is
              whichever runs out first, the viewport or the height left. */}
          <div
            className="relative"
            style={{
              width: `min(92vw, (100vh - ${CARD_CHROME_PX}px) * ${
                ratio ?? 16 / 9
              } + ${CARD_PADDING_PX}px)`,
            }}
          >
            <div
              ref={chromeRef}
              aria-hidden="true"
              className={surfaceClasses({
                variant: "solid",
                className: "pointer-events-none absolute inset-0 rounded-2xl",
              })}
            />

            <div className="relative flex flex-col gap-3 p-4">
              <div
                ref={headerRef}
                className="flex items-center justify-between gap-4"
              >
                <h2 className="truncate font-display text-lg font-semibold tracking-wide">
                  {title}
                </h2>

                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-display text-sm tracking-wide text-ink/60 transition-colors duration-300 hover:text-gold"
                >
                  Close
                </button>
              </div>

              {/* Mounted from the first open onwards — see the note at the
                  top of this file. */}
              {hasOpened && (
                <ZoomableMap
                  url={url}
                  title={title}
                  ratio={ratio}
                  frameRef={mapRef}
                  pictureRef={pictureRef}
                  veilRef={veilRef}
                  hintRef={hintRef}
                />
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

/**
 * Click to zoom, drag to move. The frame is a proportion of the viewport rather
 * than a fixed width, or the better monitor gets the smaller map.
 *
 * Transformed rather than resized, so zooming costs no layout and no second
 * decode, and served as the original file — `next/image` would hand back
 * something smaller than what is already in the bucket.
 */
function ZoomableMap({
  url,
  title,
  ratio,
  frameRef,
  pictureRef,
  veilRef,
  hintRef,
}) {
  const ownFrameRef = useRef(null);
  const imageRef = useRef(null);

  const [zoomed, setZoomed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // In a ref rather than state: it changes on every pointer move.
  const drag = useRef(null);

  /**
   * How far the image may move before its edge comes inside the frame. Computed
   * from the *fitted* size: the image is `object-contain`, so the painted size
   * is what the scale multiplies, and clamping against the natural size would
   * let the map be dragged out into empty space.
   */
  const limits = useCallback((scale) => {
    const frame = ownFrameRef.current;
    const image = imageRef.current;

    if (!frame || !image?.naturalWidth) {
      return { x: 0, y: 0 };
    }

    const box = frame.getBoundingClientRect();
    const ratio = image.naturalWidth / image.naturalHeight;
    const fittedWidth = Math.min(box.width, box.height * ratio);
    const fittedHeight = fittedWidth / ratio;

    return {
      x: Math.max(0, (fittedWidth * scale - box.width) / 2),
      y: Math.max(0, (fittedHeight * scale - box.height) / 2),
    };
  }, []);

  const clamp = useCallback(
    (next, scale) => {
      const bound = limits(scale);

      return {
        x: Math.min(bound.x, Math.max(-bound.x, next.x)),
        y: Math.min(bound.y, Math.max(-bound.y, next.y)),
      };
    },
    [limits],
  );

  // A frame that changes size while zoomed can leave the map parked outside its
  // own limits, which shows as a gap along one edge until the next drag.
  useEffect(() => {
    const frame = ownFrameRef.current;

    if (!zoomed || !frame) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setOffset((current) => clamp(current, ZOOM));
    });

    observer.observe(frame);

    return () => observer.disconnect();
  }, [zoomed, clamp]);

  function onPointerDown(event) {
    // `touch-none` suppresses the `pointercancel` that would reset the drag, so
    // a second finger would overwrite the slot below and jump the map.
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }

    // Capture keeps a drag that leaves the frame reporting here, but
    // `setPointerCapture` throws NotFoundError if the pointer is already gone —
    // an improvement, not a requirement, so it must not take the drag down.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Without capture the drag still works inside the frame.
    }

    setDragging(true);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
  }

  function onPointerMove(event) {
    const state = drag.current;

    if (!state) {
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (Math.hypot(dx, dy) > DRAG_SLOP_PX) {
      state.moved = true;
    }

    // Only a zoomed map has anywhere to go: at rest it is inside its frame and
    // every direction is already at its limit.
    if (!zoomed || !state.moved) {
      return;
    }

    setOffset(clamp({ x: state.originX + dx, y: state.originY + dy }, ZOOM));
  }

  function onPointerUp(event) {
    const state = drag.current;
    drag.current = null;
    setDragging(false);

    if (!state) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Never captured, or already released. Neither matters here.
    }

    // A press that went nowhere is a click; the slop stops a shaking hand from
    // being read as a drag and swallowing the toggle.
    if (state.moved) {
      return;
    }

    toggleZoom();
  }

  // Shared by the pointer and the keyboard so the two cannot drift apart.
  function toggleZoom() {
    const next = !zoomed;

    setZoomed(next);

    // Zooming out recentres, or the map is left off-centre in a frame it now
    // fits. Decided here rather than in a `setZoomed` updater: updaters must be
    // pure, and React may run them more than once per update.
    if (!next) {
      setOffset({ x: 0, y: 0 });
    }
  }

  function onKeyDown(event) {
    const nudge = KEY_NUDGE[event.key];

    if (nudge && zoomed) {
      event.preventDefault();
      setOffset((current) =>
        clamp({ x: current.x + nudge.x, y: current.y + nudge.y }, ZOOM),
      );
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleZoom();
    }
  }

  const scale = zoomed ? ZOOM : 1;

  return (
    <div className="flex flex-col gap-2">
      {/*
        A tab stop with a key handler, because zoom lived only in `onPointerUp`
        and pan only in `onPointerMove` — while the live region below told a
        keyboard user to drag something they could not even focus.
      */}
      <div
        ref={(node) => {
          ownFrameRef.current = node;

          if (frameRef) {
            frameRef.current = node;
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Map of ${title}. ${zoomed ? "Zoomed in" : "Zoomed out"}.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        // `touch-none` so a drag on a touchscreen pans the map instead of
        // scrolling the dialog out from under it.
        style={{ aspectRatio: ratio ?? 16 / 9 }}
        className={`relative w-full origin-top-left touch-none overflow-hidden rounded-lg bg-surface/60 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70 ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
      >
        {/* The reveal's counter-scale rides here; the image carries the zoom. */}
        <div ref={pictureRef} className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={url}
            alt={`Map of ${title}`}
            // Without this the browser starts its own image drag on
            // mousedown, which cancels the pan before it begins.
            draggable={false}
            className="absolute inset-0 size-full object-contain"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              // Only the zoom is animated. Easing the pan would leave the map a
              // frame behind the pointer, which reads as lag.
              transition: dragging ? "none" : "transform 250ms ease",
            }}
          />
        </div>

        {/* Masks the swap from the cropped preview to the whole picture. The
            full map is deliberately unvignetted. */}
        <span
          ref={veilRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0"
          style={MAP_VIGNETTE_SCALED_STYLE}
        />
      </div>

      <p
        ref={hintRef}
        aria-live="polite"
        className="text-center font-mono text-[10px] tracking-[0.2em] text-ink/50 uppercase"
      >
        {zoomed
          ? "Drag or arrow keys to move · click or Enter to zoom out"
          : "Click or Enter to zoom in"}
      </p>
    </div>
  );
}
