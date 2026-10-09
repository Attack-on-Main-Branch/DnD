"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

import {
  PREVIEW_DIE,
  PREVIEW_STAGE_ID,
  releasePreviewDie,
  showPreviewDie,
  turnPreviewDie,
} from "./preview-roller";

/** How long a colour has to stand before the die is thrown again in it. */
const SETTLE_MS = 300;

/** How far a press may wander, in pixels, and still be a press, not a drag. */
const DRAG_SLOP = 4;

/** One arrow-key press, in radians: twelve to go all the way round. */
const KEY_TURN = Math.PI / 6;

const KEY_TURNS = {
  ArrowLeft: [-KEY_TURN, 0],
  ArrowRight: [KEY_TURN, 0],
  ArrowUp: [0, -KEY_TURN],
  ArrowDown: [0, KEY_TURN],
};

/**
 * A die in the colour and style under consideration, thrown for real by the
 * table's own library — see preview-roller.js.
 *
 * NOTHING LOADS UNTIL IT IS SEEN. A sheet tab keeps its panel mounted while
 * collapsed, and a megabyte of BabylonJS is not something to fetch for a tab
 * nobody opened.
 *
 * A new colour is a new throw — dice-box paints the body as a die is made — so
 * a drag across the colour field throws once it rests, not once per pixel.
 *
 * Once it has landed it can be looked over: dragged, or turned with the arrow
 * keys, it turns in place — a drag across the whole box is half a turn. A
 * press that does not wander is still a press, and throws it again.
 *
 * Nothing is thrown for a reader who asked for stillness: a die exists here by
 * being thrown, which is exactly what that setting asks not to see. They get
 * `still` instead — a picture of the same die, if the caller has one.
 */
export default function PreviewDie({
  color,
  theme,
  die = PREVIEW_DIE,
  still: picture = null,
  className = "size-32",
}) {
  const [still] = useState(() => prefersReducedMotion());
  const [seen, setSeen] = useState(false);
  const button = useRef(null);
  const drag = useRef(null);
  const dragged = useRef(false);
  const turn = useRef({ x: 0, y: 0, frame: 0 });

  useEffect(() => {
    if (still || seen) {
      return undefined;
    }

    const watch = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
      }
    });

    watch.observe(button.current);

    return () => watch.disconnect();
  }, [seen, still]);

  useEffect(() => {
    if (still) {
      return undefined;
    }

    const queued = turn.current;

    return () => {
      cancelAnimationFrame(queued.frame);
      releasePreviewDie();
    };
  }, [still]);

  useEffect(() => {
    if (still || !seen) {
      return undefined;
    }

    const wait = setTimeout(() => showPreviewDie(color, theme, die), SETTLE_MS);

    return () => clearTimeout(wait);
  }, [color, die, seen, still, theme]);

  if (still) {
    return picture;
  }

  // A drag fires faster than a frame is drawn: what arrives between frames is
  // sent as one turn.
  const turnBy = (x, y) => {
    const queued = turn.current;

    queued.x += x;
    queued.y += y;
    queued.frame ||= requestAnimationFrame(() => {
      turnPreviewDie(queued.x, queued.y);
      queued.x = 0;
      queued.y = 0;
      queued.frame = 0;
    });
  };

  const release = () => {
    dragged.current = Boolean(drag.current?.moved);
    drag.current = null;
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }

          showPreviewDie(color, theme, die);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          dragged.current = false;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            moved: false,
            width: event.currentTarget.clientWidth || 1,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const held = drag.current;

          if (!held) {
            return;
          }

          const dx = event.clientX - held.x;
          const dy = event.clientY - held.y;

          if (!held.moved && Math.hypot(dx, dy) < DRAG_SLOP) {
            return;
          }

          held.moved = true;
          held.x = event.clientX;
          held.y = event.clientY;
          turnBy((dx * Math.PI) / held.width, (dy * Math.PI) / held.width);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(event) => {
          const [x, y] = KEY_TURNS[event.key] ?? [];

          if (x === undefined) {
            return;
          }

          event.preventDefault();
          turnBy(x, y);
        }}
        aria-label="Throw the preview die again. Drag it, or use the arrow keys, to turn it over."
        className={`dice-preview shrink-0 cursor-grab touch-none rounded-2xl select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:cursor-grabbing ${className}`}
      >
        {/* The roller writes its canvas in here on first use and leaves it
          there. Never a click target itself — the press belongs to the button
          around it. */}
        <span
          id={PREVIEW_STAGE_ID}
          aria-hidden="true"
          className="block size-full"
        />
      </button>
      <p aria-hidden="true" className="-mt-2 text-center text-xs text-ink/55">
        Drag the die to turn it, or tap it to throw again.
      </p>
    </>
  );
}
