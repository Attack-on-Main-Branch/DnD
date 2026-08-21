"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How far a press may drift before it counts as a drag rather than a click. */
const DRAG_SLOP_PX = 4;

/** One step, and only one: a map is either being surveyed or being read. */
const ZOOM = 2.5;

/** Left moves the image right, so the view travels the way the key points. */
const KEY_STEP_PX = 48;

const KEY_NUDGE = {
  ArrowLeft: { x: KEY_STEP_PX, y: 0 },
  ArrowRight: { x: -KEY_STEP_PX, y: 0 },
  ArrowUp: { x: 0, y: KEY_STEP_PX },
  ArrowDown: { x: 0, y: -KEY_STEP_PX },
};

const ZOOM_HINT = {
  in: "Drag or arrow keys to move · click or Enter to zoom out",
  out: "Click or Enter to zoom in",
};

/**
 * Click to zoom, drag to move — the behaviour, without the markup. The campaign
 * sheet's modal and the table's board want exactly this and neither wants the
 * other's box, so the arithmetic lives here and each draws its own frame.
 *
 * Transformed rather than resized, so zooming costs no layout and no second
 * decode.
 *
 * @param frameRef  the box the map is clipped to.
 * @param imageRef  the <img> inside it, already laid out by the caller.
 */
export function useMapZoom({ frameRef, imageRef }) {
  const [zoomed, setZoomed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // In a ref rather than state: it changes on every pointer move.
  const drag = useRef(null);

  const scale = zoomed ? ZOOM : 1;

  /**
   * What the frame actually paints, at rest, and the frame's own box with it.
   * `object-contain` draws a picture wider than its box smaller than it was
   * decoded, and both the pan limits and a pointer's place on the map are
   * measured against what is painted rather than what came off the wire.
   */
  const fitted = useCallback(() => {
    const frame = frameRef.current;
    const image = imageRef.current;

    if (!frame || !image?.naturalWidth) {
      return null;
    }

    const box = frame.getBoundingClientRect();
    const ratio = image.naturalWidth / image.naturalHeight;
    const width = Math.min(box.width, box.height * ratio);

    return { box, width, height: width / ratio };
  }, [frameRef, imageRef]);

  /**
   * How far the image may move before its edge comes inside the frame. From the
   * fitted size above: clamping against the natural size would let the map be
   * dragged out into empty space.
   */
  const limits = useCallback(
    (scale) => {
      const paint = fitted();

      if (!paint) {
        return { x: 0, y: 0 };
      }

      return {
        x: Math.max(0, (paint.width * scale - paint.box.width) / 2),
        y: Math.max(0, (paint.height * scale - paint.box.height) / 2),
      };
    },
    [fitted],
  );

  /**
   * Where on the picture a pointer is, in fractions of it — (0,0) top left,
   * (1,1) bottom right — or null when the event landed on the frame beside the
   * map. Fractions because the board is as tall as the page has room for and it
   * zooms, so a pixel means somewhere else on every screen and at every step.
   *
   * Read off the transform rather than `getBoundingClientRect` on the image,
   * which reports the whole frame wherever the picture is letterboxed in it.
   * Both the transform's origin and what it paints are centred on the image's
   * box, so the painted centre is the frame's plus however far it was dragged.
   */
  function pointAt(event) {
    const paint = fitted();

    if (!paint) {
      return null;
    }

    const width = paint.width * scale;
    const height = paint.height * scale;
    const left = paint.box.left + paint.box.width / 2 + offset.x - width / 2;
    const top = paint.box.top + paint.box.height / 2 + offset.y - height / 2;

    const x = (event.clientX - left) / width;
    const y = (event.clientY - top) / height;

    return x < 0 || x > 1 || y < 0 || y > 1 ? null : { x, y };
  }

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
  }, [zoomed, clamp, frameRef]);

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

  function onPointerCancel() {
    drag.current = null;
    setDragging(false);
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

  return {
    zoomed,
    hint: zoomed ? ZOOM_HINT.in : ZOOM_HINT.out,

    /** What the picture is multiplied by, for anything drawn on top of it. */
    scale,
    pointAt,

    /**
     * Everything the frame needs to be a control. `aria-label` is deliberately
     * absent — it names the map, and only the caller knows which one — and
     * `touch-none` belongs on the same element, or a drag on a touchscreen
     * scrolls the page out from under the map.
     */
    frameProps: {
      role: "button",
      tabIndex: 0,
      onKeyDown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },

    imageStyle: {
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
      // Only the zoom is animated. Easing the pan would leave the map a frame
      // behind the pointer, which reads as lag.
      transition: dragging ? "none" : "transform 250ms ease",
    },
  };
}
