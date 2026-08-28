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
 * How wide the panel stands. Narrower than the marks' own box above the board:
 * this one hangs off the side of the map rather than under it, and has the whole
 * board to clear.
 *
 * A CSS LENGTH RATHER THAN A UTILITY, because it is needed in two places now:
 * the box wears it, and so does the panel inside — which folds along this very
 * axis and would re-wrap its own text on the way out if it took its width from
 * the fold. See `.tab-shell-across` in globals.css and rail-tray.jsx.
 */
export const TRAY_WIDTH = "min(26rem, calc(100vw - 6rem))";

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
          /*
           * THE BOX IS THE FOLD. Nought wide when nothing is open, its own width
           * when something is: these trays hang off the SIDE of the board, so
           * they go back the way they came rather than folding upward like the
           * marks above it. The panel inside keeps a width of its own and is cut
           * against this one — see `.tab-shell-across` in globals.css.
           *
           * A definite length at both ends either way, so moving between two
           * trays of different widths travels rather than jumping.
           */
          style={{ width: open ? (width ?? TRAY_WIDTH) : 0 }}
          /* Which of the two closes this is: the last tray out, or one making
             way for another. Their rows are timed differently — see the CSS. */
          data-rail-shut={open ? undefined : ""}
          className={[
            "absolute top-1/2 left-full z-40 ml-4 -translate-y-1/2",
            /* The fold and the fade are timed apart in there, the way the marks
               above the board time theirs — see globals.css. */
            "rail-tray-box",
            /* On the box and not the glass: the arrow is a sibling of the
               glass rather than a child — see below. */
            "group",
            open ? "opacity-100" : "pointer-events-none opacity-0",
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
                /*
                 * AND THIS IS WHERE THE PANEL IS CUT. It keeps a width of its
                 * own — a tray sized by the folding track would re-wrap its text
                 * on the way out — so mid-fold there is more panel than box.
                 *
                 * Clipping deeper in, at `.tab-clip`, was not enough: that is a
                 * grid item, and a grid track will not shrink below its
                 * content's minimum, so mid-fold it stood WIDER than the box and
                 * the cards spilled over the board. Cut here, against the very
                 * box whose width is animating, and against its rounded corners.
                 *
                 * `clip` and not `hidden`, which is a scrolling value. An
                 * element's overflow clips its CHILDREN, never its own shadow.
                 */
                "overflow-clip",
                // `.glow-gold` declares its own `transition` and a `transition-*`
                // utility replaces it wholesale, so only these two are named.
                "transition-[border-color,box-shadow] duration-300",
                "motion-reduce:transition-none",
              ].join(" "),
            })}
          >
            {/* One cell, and every tray in it: overlaid rather than stacked,
                or the box is as tall as all of them at once. See the CSS. */}
            <div ref={setBody} className="grid" />
          </div>

          {/* The pointer across at whichever mark is open. Its `translate` is
              set from script, so the centring is in there too.

              OUTSIDE THE GLASS, and after it: half of this notch stands off the
              panel's left edge, and the clip above would have taken that half
              away. The box is positioned, so it is the same rect to measure
              against, and coming last it paints over the glass. */}
          <span
            ref={arrowRef}
            aria-hidden="true"
            className="absolute top-1/2 left-0 size-2.5 rotate-45 border-b border-l border-gold/25 bg-[var(--surface-96)] transition-[translate,border-color] duration-300 ease-tray group-focus-within:border-gold/60 group-hover:border-gold/60 motion-reduce:transition-none"
          />
        </div>
      </div>
    </RailContext.Provider>
  );
}
