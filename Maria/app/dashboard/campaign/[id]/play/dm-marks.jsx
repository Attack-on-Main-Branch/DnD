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

import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

import { LOG_CLASSES, logEntrance } from "./entrance";

/**
 * The head of the table's box, at the top of the log's column: the marks along
 * its top, and ONE panel beneath them that shows whatever the pressed mark
 * opens. table-marks.jsx's mechanism laid into a box — each panel is
 * portalled in by its own mark, and one gives way to the next by the same
 * `.tab-shell` row morph.
 *
 * IT GIVES WAY BEFORE THE LOG DOES. The column's height is the board's (see
 * activity-column.jsx): this box takes what its panel needs, the log under it
 * keeps a floor, and past that the panel scrolls here rather than pushing the
 * board down.
 *
 * THE STRIP IS 4rem — a 3.25rem mark and its padding — and the column's floor
 * is worked out from it.
 */

/** The bar is placed from a measurement — see table-marks.jsx. */
const usePlacementEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const DmMarksContext = createContext(null);

export function useDmMarks() {
  const marks = useContext(DmMarksContext);

  // A mark outside the box has nowhere to portal into, and the destructure a
  // caller does next would blame `body` for it. Said here instead.
  if (!marks) {
    throw new Error("useDmMarks was called outside DmMarks");
  }

  return marks;
}

export default function DmMarks({ children }) {
  const stripRef = useRef(null);
  const barRef = useRef(null);
  const scrollerRef = useRef(null);

  /** Whether the bar was already under a mark — the first one it jumps to. */
  const shown = useRef(false);

  /** Every mark's button, by the id DmTray made for itself. */
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

  // A panel opens at its own top, not wherever the last one was scrolled to.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [open]);

  /*
   * The bar under the open mark, placed the way tab-strip.jsx places its
   * underline: off the trigger's own box, never through React state. The first
   * placement jumps rather than sliding in from the strip's left edge.
   */
  usePlacementEffect(() => {
    const bar = barRef.current;
    const strip = stripRef.current;
    const trigger = open ? triggers.current.get(open) : null;

    if (!bar || !strip || !trigger) {
      shown.current = false;
      return undefined;
    }

    function place() {
      bar.style.width = `${trigger.offsetWidth}px`;
      bar.style.translate = `${trigger.offsetLeft}px 0`;
    }

    if (!shown.current) {
      bar.style.transitionProperty = "opacity";
      place();
      bar.getBoundingClientRect();
      bar.style.transitionProperty = "";
    } else {
      place();
    }

    shown.current = true;

    // The strip is as wide as the column, which moves with the window.
    const observer = new ResizeObserver(place);
    observer.observe(strip);

    return () => observer.disconnect();
  }, [open]);

  return (
    <DmMarksContext.Provider value={{ body, open, hold, toggle, close }}>
      <section
        data-fold
        aria-label="The Dungeon Master’s tools"
        style={logEntrance()}
        className={surfaceClasses({
          className: `flex min-h-0 w-full flex-col overflow-hidden rounded-2xl ${LOG_CLASSES}`,
        })}
      >
        {/* One element child, which is what panel-fold.js fades before it
            folds the shell around it. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={stripRef}
            className="relative flex shrink-0 items-center justify-around px-3 py-1.5"
          >
            {children}

            <span
              ref={barRef}
              aria-hidden="true"
              className={`pointer-events-none absolute -bottom-px left-0 h-0.5 rounded-full bg-gold shadow-[0_0_12px] shadow-gold/70 transition-[translate,width,opacity] duration-300 ease-tray motion-reduce:transition-none ${
                open ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          {/* The hairline the header and the changelog drawer carry. */}
          <div
            aria-hidden="true"
            className={`shrink-0 ${FADED_RULE_CLASSES}`}
          />

          <div
            ref={scrollerRef}
            className="scroll-gold min-h-0 overflow-x-hidden overflow-y-auto"
          >
            {/* Every panel in one column, all but the open one collapsed. No
                glow margin on their clips: in a scroller, the 4rem `.tab-clip`
                leaves a collapsed panel to paint into is 4rem to scroll.
                `0px`: Chrome drops a unitless nought for this property. */}
            <div
              ref={setBody}
              className="[&_.tab-clip]:[overflow-clip-margin:0px]"
            />
          </div>
        </div>
      </section>
    </DmMarksContext.Provider>
  );
}
