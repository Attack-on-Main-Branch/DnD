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
 * The marks on the rail beside the map, and the ONE panel behind all of them.
 * table-marks.jsx stood on its side, for its reasons: the box holds the rail's
 * centre line whichever mark was pressed, the arrow slides to the one that owns
 * it, and the contents morph rather than one closing while another opens.
 */

/** The arrow is placed from a measurement — see table-marks.jsx. */
const usePlacementEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const RailContext = createContext(null);

export function useRailMarks() {
  const rail = useContext(RailContext);

  // A mark outside the column has no box to portal into, and the destructure a
  // caller does next would blame `body` for it. Said here instead.
  if (!rail) {
    throw new Error("useRailMarks was called outside RailMarks");
  }

  return rail;
}

/**
 * How wide the panel stands. A literal, or Tailwind's scanner never sees it.
 * Narrower than the marks' own box above the board: this one hangs off the side
 * of the map rather than under it, and has the whole board to clear.
 */
const TRAY_WIDTH_CLASSES = "w-[min(26rem,calc(100vw-6rem))]";

export default function RailMarks({ children }) {
  const railRef = useRef(null);
  const arrowRef = useRef(null);

  /** Every mark's button, by the id RailTray made for itself. */
  const triggers = useRef(new Map());

  /* How wide the box stands while whatever is open owns it. The panel is
     SHARED: the maps tray is a grid of pictures and the two under it are lists,
     and a box sized for the widest would leave those two floating in it.

     SET FROM THE PRESS AND NOT FROM `hold`. An inline ref callback is detached
     and re-attached on every render, so `hold` runs on every render — and a
     `hold` that set state was a render scheduling a render, which took the
     whole table into its error boundary with "Maximum update depth exceeded".
     A toggle happens when somebody clicks, which is once. */
  const [width, setWidth] = useState(null);

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

  const toggle = useCallback((value, asked) => {
    setOpen((standing) => (standing === value ? null : value));

    /* Left where it is on the way out, so a closing panel collapses at the
       width it was opened at rather than snapping to the default first. */
    setWidth(asked ?? null);
  }, []);

  // Anywhere outside closes, and pointerdown rather than click so a drag that
  // starts outside does not leave it open behind the pointer. One listener for
  // both: the box is inside the rail, so the marks and what they opened are one
  // region — which is also what lets a press move between them without closing.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!railRef.current?.contains(event.target)) {
        close();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  /*
   * MEASURED FROM THE RAIL'S CENTRE, NOT THE BOX'S TOP. The box is centred on the
   * rail, so a panel morphing to a new height moves both its edges — an offset
   * taken from the top changed every frame and restarted the arrow's transition,
   * which is what made it judder. The two centres coincide and neither moves.
   */
  usePlacementEffect(() => {
    const arrow = arrowRef.current;
    const rail = railRef.current;
    const trigger = open ? triggers.current.get(open) : null;

    if (!arrow || !rail || !trigger) {
      return undefined;
    }

    function place() {
      const from = rail.getBoundingClientRect();
      const at = trigger.getBoundingClientRect();

      const down = at.top + at.height / 2 - (from.top + from.height / 2);

      arrow.style.translate = `-50% calc(${down}px - 50%)`;
    }

    place();

    // Only ever the window moving under it: the rail keeps its size.
    const observer = new ResizeObserver(place);

    observer.observe(rail);

    return () => observer.disconnect();
  }, [open]);

  return (
    <RailContext.Provider value={{ body, open, hold, toggle, close }}>
      <div
        ref={railRef}
        className="relative flex w-14 shrink-0 flex-col items-center gap-1"
      >
        {children}

        <div
          className={[
            "absolute top-1/2 left-full z-40 ml-4 -translate-y-1/2",
            (open && width) || TRAY_WIDTH_CLASSES,
            /* Width as well as opacity: both ends are definite lengths, so
               morphing from a list to a grid of maps travels rather than
               jumping halfway through the panel's own transition. */
            "transition-[opacity,width] duration-300",
            open
              ? "ease-tray opacity-100"
              : "pointer-events-none ease-tray-in opacity-0",
            "motion-reduce:transition-none",
          ].join(" ")}
        >
          <div
            className={surfaceClasses({
              variant: "solid",
              glow: true,
              className: [
                "relative",
                // A closed panel keeps filtering its backdrop — `opacity: 0`
                // does not stop it — which over the board showed as a dark slab
                // beside the map.
                "glass-unfiltered",
                "rounded-2xl text-left",
                // `.glow-gold` declares its own `transition` and a `transition-*`
                // utility replaces it wholesale, so only these two are named.
                "group transition-[border-color,box-shadow] duration-300",
                "motion-reduce:transition-none",
              ].join(" "),
            })}
          >
            {/* The pointer across at whichever mark is open. `border-b border-l`
                meet at the corner a 45° rotation puts on the left. Its
                `translate` is set from script, so the centring is in there too
                rather than in a utility that would overwrite it. */}
            <span
              ref={arrowRef}
              aria-hidden="true"
              className="absolute top-1/2 left-0 size-2.5 rotate-45 border-b border-l border-gold/25 bg-[var(--surface-96)] transition-[translate,border-color] duration-300 ease-tray group-focus-within:border-gold/60 group-hover:border-gold/60 motion-reduce:transition-none"
            />

            <div ref={setBody} />
          </div>
        </div>
      </div>
    </RailContext.Provider>
  );
}
