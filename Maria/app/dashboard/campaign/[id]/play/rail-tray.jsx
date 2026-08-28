"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { TRAY_WIDTH, useRailMarks } from "./rail-marks";

/**
 * One mark on the rail, and the panel it opens: the drawing stays in the column,
 * the body goes through a portal into the shared box. TablePopover's own shell,
 * class for class — only the arrival differs, coming in from the mark's side.
 */

/** Everything a Tab can reach inside the tray, for the keyboard loop below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function RailTray({
  mark,
  markLabel,
  title,
  meta,
  dialogLabel,
  /* How wide the shared box stands while THIS tray owns it, as a CSS length.
     Undefined leaves the rail's own default — see rail-marks.jsx. */
  width,
  children,
}) {
  const value = useId();
  const panelId = `${value}-panel`;

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const { body, open, hold, toggle, close } = useRailMarks();
  const isOpen = open === value;

  /*
   * Focus moves in with the tray, or Escape has nothing to catch and the control
   * opens somewhere a keyboard cannot reach. `preventScroll`, because the
   * board's row is clipped on both axes and the browser would otherwise scroll
   * the whole page to reveal a control halfway down the panel.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panel = panelRef.current;

    (panel?.querySelector(FOCUSABLE) ?? panel)?.focus({ preventScroll: true });
  }, [isOpen]);

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const stops = [...panelRef.current.querySelectorAll(FOCUSABLE)];

    if (stops.length === 0) {
      event.preventDefault();
      return;
    }

    const first = stops[0];
    const last = stops[stops.length - 1];
    const here = document.activeElement;

    if (event.shiftKey && (here === first || here === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && here === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {/* A mark and not a button: no rim, no fill, nothing behind the drawing,
          exactly as the dice opposite and the marks above the board. */}
      <button
        ref={(node) => {
          triggerRef.current = node;
          hold(value, node);
        }}
        type="button"
        onClick={() => toggle(value, width)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={markLabel}
        className="grid size-15 cursor-pointer place-items-center rounded-full text-ink/60 transition-colors duration-300 hover:text-gold focus-visible:text-gold"
      >
        {mark}
      </button>

      {/* Always mounted once the box exists, so it can collapse rather than
          vanish — a row that is merely removed has no second height to travel
          towards. */}
      {body &&
        createPortal(
          /* `tab-shell-across`: these hang off the SIDE of the board and go
             back the way they came — see globals.css. The marks above the map
             use the same shell folding the other way. */
          <div
            className="tab-shell tab-shell-across"
            data-state={isOpen ? "open" : "collapsed"}
          >
            <div className="tab-clip">
              <div
                ref={panelRef}
                id={panelId}
                /* ITS OWN WIDTH, and not the fold's. These trays close along
                   the inline axis, so a panel sized by the collapsing track
                   would re-wrap every line of text on the way out instead of
                   being cut. See `.tab-shell-across` in globals.css. */
                style={{ width: width ?? TRAY_WIDTH }}
                role="dialog"
                aria-label={dialogLabel}
                tabIndex={-1}
                inert={!isOpen || undefined}
                onKeyDown={onKeyDown}
                className={`tab-panel outline-none ${
                  isOpen
                    ? "motion-safe:animate-[tray-panel-in_380ms_var(--ease-tray)]"
                    : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
                  <h2 className="min-w-0 truncate font-display text-sm font-semibold tracking-wide text-gold">
                    {title}
                  </h2>

                  {meta !== undefined && meta !== null && (
                    <p className="shrink-0 font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
                      {meta}
                    </p>
                  )}
                </div>

                {/* The hairline the header and the changelog drawer carry. */}
                <div aria-hidden="true" className={FADED_RULE_CLASSES} />

                {children}
              </div>
            </div>
          </div>,
          body,
        )}
    </>
  );
}
