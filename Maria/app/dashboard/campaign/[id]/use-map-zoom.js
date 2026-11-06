"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How far a press may drift before it counts as a drag rather than a click. */
const DRAG_SLOP_PX = 4;
const HOLD_MS = 360;

/** The step a CLICK takes: surveyed, or read. The wheel walks instead. */
const ZOOM = 2.5;

/** How far the wheel may take it, and how much of a turn one notch is. */
const MIN_WHEEL_ZOOM = 1;
const MAX_WHEEL_ZOOM = 6;
const WHEEL_STEP = 0.0018;

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
 * @param wheel     turn the wheel to zoom, about the pointer. The table wants
 *                  this; the modal, inside a scrollable dialog, does not.
 * @param pointerZoom  whether a click toggles the zoom. Off at the table, where
 *                  the left button belongs to the tokens. Enter still works.
 * @param onTap     offered the point of every press that was not a drag, before
 *                  the zoom toggles. Returning true claims it.
 * @param keyboard  whether the frame is a focusable control that answers Enter,
 *                  Space and the arrow keys. The modal's map is; the table's
 *                  board is not — see `frameProps`.
 */
export function useMapZoom({
  frameRef,
  imageRef,
  contentSize,
  wheel = false,
  pointerZoom = true,
  onTap,
  onHold,
  keyboard = true,
  pinch = false,
  enabled = true,
}) {
  /* The scale itself, because the wheel walks it rather than switching it: a
     click still only knows two values, and both live in here. */
  const [scale, setScale] = useState(1);

  /* Readable synchronously: two notches can arrive in one frame, and the
     second must compound on what the first asked for. */
  const scaleRef = useRef(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // In a ref rather than state: it changes on every pointer move.
  const drag = useRef(null);
  const touches = useRef(new Map());
  const zoomGesture = useRef(null);

  const zoomed = scale > 1;

  /**
   * What the frame actually paints, at rest, and the frame's own box with it.
   * `object-contain` draws a picture wider than its box smaller than it was
   * decoded, and both the pan limits and a pointer's place on the map are
   * measured against what is painted rather than what came off the wire.
   */
  const fitted = useCallback(() => {
    const frame = frameRef.current;
    const image = imageRef?.current;
    const width = contentSize?.width ?? image?.naturalWidth;
    const height = contentSize?.height ?? image?.naturalHeight;

    if (!frame || !width || !height) {
      return null;
    }

    const box = frame.getBoundingClientRect();
    const ratio = width / height;
    const fittedWidth = Math.min(box.width, box.height * ratio);

    return { box, width: fittedWidth, height: fittedWidth / ratio };
  }, [contentSize, frameRef, imageRef]);

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

    if (!enabled || !zoomed || !frame) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setOffset((current) => clamp(current, scale));
    });

    observer.observe(frame);

    return () => observer.disconnect();
  }, [enabled, zoomed, scale, clamp, frameRef]);

  // Shared by the pointer and the keyboard so the two cannot drift apart.
  function toggleZoom() {
    const next = zoomed ? 1 : ZOOM;

    scaleRef.current = next;
    setScale(next);

    // Zooming out recentres, or the map is left off-centre in a frame it now
    // fits. Decided here rather than in a `setScale` updater: updaters must be
    // pure, and React may run them more than once per update.
    if (next === 1) {
      setOffset({ x: 0, y: 0 });
    }
  }

  function onPointerDown(event) {
    const touch = pinch && event.pointerType === "touch";
    if (event.button !== 0 || (!event.isPrimary && !touch)) {
      return;
    }

    // Capture keeps a drag that leaves the frame reporting here, but
    // `setPointerCapture` throws NotFoundError if the pointer is already gone —
    // an improvement, not a requirement, so it must not take the drag down.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Without capture the drag still works inside the frame.
    }

    setDragging(true);
    if (touch) {
      touches.current.set(event.pointerId, touchPoint(event));
      if (touches.current.size > 1) {
        clearTimeout(drag.current?.timer);
        drag.current?.hold?.cancel();
        drag.current = null;
        if (touches.current.size === 2) {
          zoomGesture.current = {
            ...pinchCenter(touches.current),
            scale: scaleRef.current,
            offset,
          };
        }
        return;
      }
    }
    const state = {
      id: event.pointerId,
      target: event.target,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    drag.current = state;
    if (onHold) {
      const point = pointAt(event);
      state.timer = setTimeout(() => {
        if (drag.current === state && !state.moved) {
          state.hold = onHold(point, state.target);
        }
      }, HOLD_MS);
    }
  }

  function onPointerMove(event) {
    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, touchPoint(event));
      const start = zoomGesture.current;
      if (start && touches.current.size >= 2) {
        const box = event.currentTarget.getBoundingClientRect();
        const now = pinchCenter(touches.current);
        const next = Math.min(
          MAX_WHEEL_ZOOM,
          Math.max(
            MIN_WHEEL_ZOOM,
            (start.scale * now.distance) / start.distance,
          ),
        );
        const ratio = next / start.scale;
        scaleRef.current = next;
        setScale(next);
        setOffset(
          clamp(
            {
              x:
                now.x -
                box.left -
                box.width / 2 -
                (start.x - box.left - box.width / 2 - start.offset.x) * ratio,
              y:
                now.y -
                box.top -
                box.height / 2 -
                (start.y - box.top - box.height / 2 - start.offset.y) * ratio,
            },
            next,
          ),
        );
        return;
      }
    }
    const state = drag.current;

    if (state?.id !== event.pointerId) {
      return;
    }

    if (state.hold) {
      state.hold.move(pointAt(event));
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (Math.hypot(dx, dy) > DRAG_SLOP_PX) {
      clearTimeout(state.timer);
      state.moved = true;
    }

    // Only a zoomed map has anywhere to go: at rest it is inside its frame and
    // every direction is already at its limit.
    if (!zoomed || !state.moved) {
      return;
    }

    setOffset(clamp({ x: state.originX + dx, y: state.originY + dy }, scale));
  }

  function onPointerUp(event) {
    const state = endPointer(event);

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Never captured, or already released. Neither matters here.
    }

    // A press that went nowhere is a click; the slop stops a shaking hand from
    // being read as a drag and swallowing the toggle.
    if (state?.hold) {
      state.hold.end(pointAt(event));
      return;
    }
    if (!state || state.moved) {
      return;
    }

    // Somebody is holding a token over the board, and this click is where they
    // want it rather than a request to zoom.
    if (onTap?.(pointAt(event), state.target)) {
      return;
    }

    if (pointerZoom) {
      toggleZoom();
    }
  }

  function endPointer(event) {
    const state = drag.current?.id === event.pointerId ? drag.current : null;
    if (state) {
      clearTimeout(state.timer);
      drag.current = null;
    }
    if (touches.current.delete(event.pointerId)) zoomGesture.current = null;
    if (!touches.current.size && !drag.current) setDragging(false);
    return state;
  }

  function onPointerCancel(event) {
    endPointer(event)?.hold?.cancel();
  }

  useEffect(() => {
    const tracked = touches.current;
    return () => {
      clearTimeout(drag.current?.timer);
      drag.current = null;
      zoomGesture.current = null;
      tracked.clear();
    };
  }, [enabled]);

  /**
   * THE WHEEL ZOOMS ABOUT THE POINTER: the picture is drawn at
   * `offset + scale * p` from the frame's centre, so holding a point still
   * across a change of scale is a matter of moving the offset by the same
   * ratio.
   *
   * Bound by hand, because React attaches wheel listeners PASSIVELY and
   * `preventDefault` inside one does nothing.
   */
  const zoomAt = useCallback(
    (clientX, clientY, deltaY) => {
      const frame = frameRef.current;
      if (!frame) return;
      const standing = scaleRef.current;

      const next = Math.min(
        MAX_WHEEL_ZOOM,
        Math.max(MIN_WHEEL_ZOOM, standing * Math.exp(-deltaY * WHEEL_STEP)),
      );

      if (next === standing) {
        return;
      }

      const box = frame.getBoundingClientRect();

      /* Where the pointer is, measured from the centre the transform turns
         about rather than from the frame's corner. */
      const at = {
        x: clientX - (box.left + box.width / 2),
        y: clientY - (box.top + box.height / 2),
      };

      const ratio = next / standing;

      scaleRef.current = next;
      setScale(next);

      /* BOTH SETTERS AT THE TOP LEVEL. This used to shift the offset from
         inside the scale's updater, and an updater must be pure: React runs
         them twice, so the pan applied twice per notch and the map crept. */
      setOffset((current) =>
        clamp(
          {
            x: at.x - (at.x - current.x) * ratio,
            y: at.y - (at.y - current.y) * ratio,
          },
          next,
        ),
      );
    },
    [clamp, frameRef],
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!enabled || !wheel || !frame) return undefined;

    function onWheel(event) {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY);
    }

    frame.addEventListener("wheel", onWheel, { passive: false });

    return () => frame.removeEventListener("wheel", onWheel);
  }, [enabled, frameRef, wheel, zoomAt]);

  function onKeyDown(event) {
    const nudge = KEY_NUDGE[event.key];

    if (nudge && zoomed) {
      event.preventDefault();
      setOffset((current) =>
        clamp({ x: current.x + nudge.x, y: current.y + nudge.y }, scale),
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
    zoomAt,

    /**
     * Everything the frame needs to be a control. `aria-label` is deliberately
     * absent — it names the map, and only the caller knows which one — and
     * `touch-none` belongs on the same element, or a drag on a touchscreen
     * scrolls the page out from under the map.
     *
     * `keyboard: false` takes the whole control away, `role` and `tabIndex`
     * with it: a frame that answers Space and the arrow keys but is not a button
     * is a trap, and one that is a button hides everything inside it from a
     * screen reader. THE TABLE'S BOARD TAKES THAT OPTION — see table-map.jsx.
     */
    frameProps: {
      ...(keyboard ? { role: "button", tabIndex: 0, onKeyDown } : null),
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
    },

    imageStyle: {
      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
      // Only the zoom is animated. Easing the pan would leave the map a frame
      // behind the pointer, which reads as lag.
      transition: dragging ? "none" : "transform 250ms ease",
    },
  };
}

function touchPoint(event) {
  return { x: event.clientX, y: event.clientY };
}

function pinchCenter(touches) {
  const [a, b] = touches.values();
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
  };
}
