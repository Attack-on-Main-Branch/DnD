"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { surfaceClasses } from "@/app/components/ui/surface";

/**
 * The three marks above the map, and the ONE panel behind all of them.
 *
 * One box rather than three, because a panel hung under its own mark opened
 * somewhere different for each — the lore off to the left, the pack off to the
 * right — and switching between them was two animations passing each other. The
 * box stands on the viewport's centre line whichever mark was pressed, the
 * arrow slides to the mark that owns it, and the contents morph the way the
 * character sheet's tabs do: the outgoing panel's row runs to `0fr` while the
 * incoming one runs the other way, so the box's height is a straight
 * interpolation between them. See `.tab-shell` in globals.css — this is that
 * mechanism, with the strip of tabs replaced by a strip of marks.
 *
 * The panels arrive through a portal. Each of the three is a component of its
 * own that owns its own state — how many notes are written, how much is
 * carried — so the trigger has to stay where that component renders it while
 * the body goes into the shared box. TablePopover does both halves.
 *
 * Opening and closing is the same mechanism again: with nothing chosen every
 * row is collapsed, the box has no height, and it fades. Nothing else to
 * unwind, and no second animation to keep in step with the first.
 */

/**
 * The arrow is placed from a measurement, so it has to be placed before the
 * frame is drawn or it slides in from the box's left edge the first time a mark
 * is pressed. The switch is grimoire-mark.jsx's, for the same reason: a layout
 * effect called during server rendering is a React warning.
 */
const usePlacementEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const MarksContext = createContext(null);

export function useTableMarks() {
  return useContext(MarksContext);
}

export default function TableMarks({ children }) {
  const stripRef = useRef(null);
  const boxRef = useRef(null);
  const arrowRef = useRef(null);

  /** Every mark's button, by the id TablePopover made for itself. */
  const triggers = useRef(new Map());

  /* The portal's landing place. State rather than a ref: it is null on the
     render that creates it, and the panels have to be told once it is not. */
  const [body, setBody] = useState(null);
  const [open, setOpen] = useState(null);

  const hold = useCallback((value, node) => {
    if (node) {
      triggers.current.set(value, node);
    } else {
      triggers.current.delete(value);
    }
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const toggle = useCallback(
    (value) => setOpen((standing) => (standing === value ? null : value)),
    [],
  );

  // Anywhere outside closes, and pointerdown rather than click so a drag that
  // starts outside does not leave it open behind the pointer. One listener for
  // all three: the box is inside the strip, so the marks and what they opened
  // are one region.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!stripRef.current?.contains(event.target)) {
        close();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  /*
   * The arrow, placed the way tab-strip.jsx places its underline: imperatively,
   * off the trigger's own box, so it never passes through React state. Measured
   * against the box rather than the strip because the box is the arrow's
   * containing block and carries a `-translate-x-1/2` that `offsetLeft` cannot
   * see.
   */
  usePlacementEffect(() => {
    const arrow = arrowRef.current;
    const box = boxRef.current;
    const strip = stripRef.current;
    const trigger = open ? triggers.current.get(open) : null;

    if (!arrow || !box || !strip || !trigger) {
      return undefined;
    }

    function place() {
      const from = box.getBoundingClientRect();
      const at = trigger.getBoundingClientRect();

      // `clientLeft` is the box's own border, which `left: 0` starts inside and
      // a rect measured from the outside does not know about.
      const across = at.left + at.width / 2 - from.left - box.clientLeft;

      arrow.style.translate = `calc(${across}px - 50%) -50%`;
    }

    place();

    // The box is as wide as the viewport allows, so its left edge moves with
    // the window while the marks stay in the middle.
    const observer = new ResizeObserver(place);
    observer.observe(strip);

    return () => observer.disconnect();
  }, [open]);

  return (
    <MarksContext.Provider value={{ body, open, hold, toggle, close }}>
      <div ref={stripRef} className="relative flex gap-3">
        {children}

        <div
          ref={boxRef}
          className={surfaceClasses({
            variant: "solid",
            glow: true,
            className: [
              "absolute top-full left-1/2 z-40 mt-4 -translate-x-1/2",
              // A closed panel keeps filtering its backdrop — `opacity: 0` does
              // not stop it — which over the board's plume showed as a dark
              // slab under the marks.
              "glass-unfiltered",
              // ↓ THE PANEL'S WIDTH. Its height is whatever is open in it.
              "w-[min(50rem,calc(100vw-2rem))] rounded-2xl text-left",
              // `border-color` and `box-shadow` are in the list because
              // `.glow-gold` declares its own `transition`, and a `transition-*`
              // utility replaces that property wholesale.
              "group transition-[opacity,border-color,box-shadow] duration-300",
              open
                ? "ease-tray opacity-100"
                : "pointer-events-none ease-tray-in opacity-0",
              "motion-reduce:transition-none",
            ].join(" "),
          })}
        >
          {/* The pointer up at whichever mark is open — the notification
              panel's own arrow. Only the two borders that fall on its outer
              edges. Its `translate` is set from script, so the centring is in
              there too rather than in a utility that would overwrite it. */}
          <span
            ref={arrowRef}
            aria-hidden="true"
            className="absolute top-0 left-0 size-2.5 rotate-45 border-t border-l border-gold/25 bg-[var(--surface-96)] transition-[translate,border-color] duration-300 ease-tray group-focus-within:border-gold/60 group-hover:border-gold/60 motion-reduce:transition-none"
          />

          <div ref={setBody} />
        </div>
      </div>
    </MarksContext.Provider>
  );
}
