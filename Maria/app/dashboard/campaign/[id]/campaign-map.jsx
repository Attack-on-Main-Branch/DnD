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
 * The map: a thumbnail on the page, the original in a frame you can zoom.
 *
 * The point of the split is bandwidth. A campaign map is around 2560px and
 * something like 1.8MB, and a page that puts it inline spends that on every
 * visit — measured, roughly thirty times what the box on screen can show. The
 * thumbnail goes through the optimiser at the width it is actually drawn at,
 * which brings it to tens of kilobytes.
 *
 * The full-resolution `<img>` is not rendered until the dialog is first opened,
 * and from then on it stays. Both halves of that matter.
 *
 * Not before, because an `<img>` in the DOM downloads whether or not anything
 * can see it — hiding one with CSS would have cost exactly what this is
 * avoiding.
 *
 * And not removed afterwards, which is what an earlier version did: unmounting
 * on close meant every reopen was a fresh request, and maps uploaded before the
 * cache header was raised still carry a one-hour `max-age`, so after an hour
 * that request was a full download again. Once opened, the element stays inside
 * the closed dialog, which the browser renders as `display: none` — no pixels,
 * no layout, no second download whatever the cache says.
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
    }
  }, [open]);

  function close() {
    setOpen(false);
    // Focus goes back to what opened the dialog rather than to the top of the
    // document, which is where it lands otherwise.
    openerRef.current?.focus();
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
        {/*
          `cover`, filling the frame. Cropping the edge of a map would be losing
          part of what it says — but nothing is lost now that the whole thing is
          one click away, and a letterboxed thumbnail spent a third of its box
          on empty black.
        */}
        <Image
          src={url}
          alt=""
          fill
          sizes="(min-width: 640px) 640px, 92vw"
          style={{ objectFit: "cover" }}
          className="transition-transform duration-700 group-hover:scale-105"
        />

        {/*
          The dashboard card's vignette, from the same definition, so the two
          views of a map darken identically. `pointer-events-none` so it cannot
          intercept the click that opens the dialog, and outside the scaling
          image so the hover zoom moves the map inside a frame that stays put.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={MAP_VIGNETTE_STYLE}
        />

        {/*
          The label sits straight on the vignette now. It used to bring its own
          gradient up from the bottom edge, and that band was a second darkening
          on top of a symmetric one — the bottom of the frame came out visibly
          heavier than the other three sides. A drop shadow does the same job
          for a line of text without touching the picture.
        */}
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

          {/*
            Mounted from the first open onwards, never before it and never
            removed after — see the note at the top of this file.
          */}
          {hasOpened && <ZoomableMap url={url} title={title} />}
        </div>
      </dialog>
    </>
  );
}

/**
 * The full map inside a frame that never changes size: click to zoom in, click
 * again to zoom out, drag to move around while zoomed.
 *
 * The frame keeps its 16:9 and takes 70% of the viewport width on a large
 * screen. That proportion is the point of it — a fixed 1152px was about 60% of
 * a 1080p display and only 45% of a 1440p one, so the better monitor got the
 * smaller map.
 *
 * The image is transformed rather than resized, so zooming costs no layout and
 * no second decode. It is also the original file: `next/image` would hand back
 * something smaller than what is already in the bucket, and this is the view
 * where the detail is the whole point.
 */
function ZoomableMap({ url, title }) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);

  const [zoomed, setZoomed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Drag bookkeeping lives in a ref rather than state: it changes on every
  // pointer move, and none of it belongs in a render.
  const drag = useRef(null);

  /**
   * How far the image may be moved before its edge would come inside the
   * frame, in screen pixels.
   *
   * Computed from the *fitted* size rather than the natural one. The image is
   * `object-contain`, so at rest it is letterboxed inside the frame and that
   * painted size is what the scale multiplies — clamping against the natural
   * size would let the map be dragged out into empty space.
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
    // Left button only. The pointer is captured so a drag that leaves the frame
    // still reports its moves here instead of being lost to the document.
    if (event.button !== 0) {
      return;
    }

    // Guarded: `setPointerCapture` throws NotFoundError if the pointer is no
    // longer active by the time this runs. Capture is an improvement — it keeps
    // a drag that leaves the frame reporting here — not a requirement, so
    // losing it must not take the drag down with it.
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

    // A press that went nowhere is a click. The slop is what stops a hand that
    // shakes two pixels from being read as a drag and swallowing the toggle.
    if (state.moved) {
      return;
    }

    const next = !zoomed;

    setZoomed(next);

    // Zooming out recentres. Keeping the old offset would leave the map
    // off-centre in a frame it now fits entirely.
    //
    // Decided here rather than inside a `setZoomed` updater, which is where it
    // started: an updater has to be pure, and React is free to run it more than
    // once for a single update — under StrictMode it deliberately does. A
    // `setOffset` in there is a side effect firing an unpredictable number of
    // times.
    if (!next) {
      setOffset({ x: 0, y: 0 });
    }
  }

  const scale = zoomed ? ZOOM : 1;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        // `touch-none` so a drag on a touchscreen pans the map instead of
        // scrolling the dialog out from under it.
        className={`relative aspect-video w-full touch-none overflow-hidden rounded-lg bg-surface/60 select-none ${
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
        {zoomed ? "Drag to move · click to zoom out" : "Click to zoom in"}
      </p>
    </div>
  );
}
