"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  MAP_VIGNETTE_STYLE,
  surfaceClasses,
} from "@/app/components/ui/surface";

/** How far a press may drift before it counts as a drag rather than a click. */
const DRAG_SLOP_PX = 4;

/** One step, and only one: a map is either being surveyed or being read. */
const ZOOM = 2.5;

/**
 * How far an arrow key moves the map, in screen pixels. Left moves the image
 * right, so the view travels the way the key points.
 */
const KEY_STEP_PX = 48;

const KEY_NUDGE = {
  ArrowLeft: { x: KEY_STEP_PX, y: 0 },
  ArrowRight: { x: -KEY_STEP_PX, y: 0 },
  ArrowUp: { x: 0, y: KEY_STEP_PX },
  ArrowDown: { x: 0, y: -KEY_STEP_PX },
};

/**
 * A thumbnail on the page, the original in a frame you can zoom. The split is
 * bandwidth: a ~1.8MB map inline costs that on every visit, roughly thirty
 * times what the box on screen can show.
 *
 * The full-resolution `<img>` mounts on first open and then stays. Not before,
 * because an `<img>` in the DOM downloads whether or not it is visible; and not
 * unmounted on close, or every reopen is a fresh request — maps uploaded before
 * the cache header was raised still carry a one-hour `max-age`. Inside a closed
 * dialog it renders as `display: none`: no pixels, no layout, no re-download.
 */
export default function CampaignMap({ url, title }) {
  const [open, setOpen] = useState(false);
  // Sticky: the full image is mounted from the first open onwards. See above.
  const [hasOpened, setHasOpened] = useState(false);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      // A closing dialog restores focus to whatever had it, so this is a
      // fallback rather than the mechanism — but it has to run here: called
      // straight from `close()` it lands while the document is still inert.
      openerRef.current?.focus();
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      {/*
        640 x 360 — the same 16:9 at a size that leaves the lore above it room.
        `max-w-full` so a narrow window shrinks the frame rather than pushing
        the panel wider than its column.
      */}
      <button
        ref={openerRef}
        type="button"
        onClick={() => {
          setHasOpened(true);
          setOpen(true);
        }}
        aria-label={`View the full map of ${title}`}
        className="group relative mx-auto block aspect-video w-[640px] max-w-full cursor-pointer overflow-hidden rounded-2xl border border-gold/15 bg-surface/60 transition duration-300 hover:border-gold/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70"
      >
        {/* `cover`: a letterboxed thumbnail spent a third of its box on black,
          and the whole map is one click away. */}
        <Image
          src={url}
          alt=""
          fill
          sizes="(min-width: 640px) 640px, 92vw"
          style={{ objectFit: "cover" }}
          className="transition-transform duration-700 group-hover:scale-105"
        />

        {/*
          `pointer-events-none` so it cannot intercept the opening click, and
          outside the scaling image so the hover zoom moves the map inside a
          frame that stays put.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={MAP_VIGNETTE_STYLE}
        />

        {/* Straight on the vignette: its own gradient was a second darkening on
          top of a symmetric one, which weighted the bottom edge. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 p-4 text-center font-mono text-[10px] tracking-[0.2em] text-ink/70 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] transition-colors duration-300 group-hover:text-gold"
        >
          Click for full resolution
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`Full map of ${title}`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            close();
          }
        }}
        className={surfaceClasses({
          variant: "solid",
          className:
            "m-auto w-[95vw] rounded-2xl p-0 text-ink backdrop:bg-black/85 lg:w-[70vw]",
        })}
      >
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-4">
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

          {/* Mounted from the first open onwards — see the note at the top. */}
          {hasOpened && <ZoomableMap url={url} title={title} />}
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
function ZoomableMap({ url, title }) {
  const frameRef = useRef(null);
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
    const frame = frameRef.current;
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
    const frame = frameRef.current;

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
    // `isPrimary` because `touch-none` suppresses the `pointercancel` that would
    // otherwise reset the drag: a second finger would overwrite the single slot
    // below and the first one's next move would jump the map.
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
        ref={frameRef}
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
        className={`relative aspect-video w-full touch-none overflow-hidden rounded-lg bg-surface/60 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70 ${
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={url}
          alt={`Map of ${title}`}
          // Without this the browser starts its own image drag on mousedown,
          // which cancels the pan before it begins.
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

      <p
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
