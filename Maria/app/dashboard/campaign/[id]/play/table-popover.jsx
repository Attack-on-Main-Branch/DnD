"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { useTableMarks } from "./table-marks";

/**
 * How tall a panel's contents stand, the same for the scroll and the pack —
 * they open into the same box, and one half the height of the other would have
 * that box resize every time the pointer moved between two marks. Fixing the
 * body also stops a panel resizing as a note is written or an item used.
 *
 * A literal, or Tailwind's scanner never sees it. `60vh` is the guard: the
 * panel hangs off the marks above the board.
 */
export const POPOVER_BODY_CLASSES = "h-[min(34rem,60vh)]";

/** Everything a Tab can reach, for the keyboard loop below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One mark, and the panel it opens. Both halves of the same thing, in two
 * places: the drawing stays in the strip where its component put it, and the
 * body goes through a portal into the shared box — see table-marks.jsx for why
 * there is only one of those.
 *
 * The shell around the body is the character sheet's own tab panel, class for
 * class, which is what makes one panel give way to the next as a single box
 * changing shape rather than two boxes crossing.
 *
 * No halo behind the drawing. It was a box tucked INSIDE an outline, which is
 * where it had to go for the light to fall under the strokes rather than
 * through the gaps between them; these marks are solid, so there is no inside
 * to tuck it into and it came out as a smudge.
 */
export default function TablePopover({
  icon: Icon,
  label,
  title,
  count,
  arrival = 0,
  onShortcut,
  children,
}) {
  const value = useId();
  const panelId = `${value}-panel`;

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const { body, open, hold, toggle, close } = useTableMarks();
  const isOpen = open === value;

  /*
   * Focus moves in with the panel, or Escape has nothing to catch and the mark
   * opens somewhere a keyboard cannot reach.
   *
   * `preventScroll`, because the row it is unfolding out of has barely any
   * height yet: the browser read a control halfway down a panel still opening
   * as being outside its clip and scrolled the whole page to reveal it, leaving
   * the table sitting a third of a screen down.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panel = panelRef.current;

    (panel?.querySelector(FOCUSABLE) ?? panel)?.focus({ preventScroll: true });
  }, [isOpen]);

  /**
   * Escape closes; Tab stays inside; Ctrl+Enter is whatever the panel says it
   * is. The trap is the notification dropdown's, for the same reason: what is
   * in here is half-finished, and tabbing out of it leaves it open behind the
   * board.
   */
  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
      return;
    }

    if (
      onShortcut &&
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      onShortcut();
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
      <button
        ref={(node) => {
          triggerRef.current = node;
          hold(value, node);
        }}
        type="button"
        onClick={() => toggle(value)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={label}
        className="relative grid size-12 cursor-pointer place-items-center rounded-full text-ink/60 transition-colors duration-300 hover:text-gold focus-visible:text-gold"
      >
        {/* `key` is what restarts the shake: a class toggled on the same node
            coalesces into one style recalc and never replays. */}
        <Icon
          key={`mark-${arrival}`}
          className={`size-9 ${arrival > 0 ? "mail-arriving" : ""}`}
        />
      </button>

      {/* Always mounted once the box exists, so it can collapse rather than
          vanish — a row that is merely removed has no second height to travel
          towards. */}
      {body &&
        createPortal(
          <div className="tab-shell" data-state={isOpen ? "open" : "collapsed"}>
            <div className="tab-clip">
              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label={title}
                tabIndex={-1}
                inert={!isOpen || undefined}
                onKeyDown={onKeyDown}
                className={`tab-panel outline-none ${
                  isOpen
                    ? "motion-safe:animate-[tab-panel-in_380ms_var(--ease-tray)]"
                    : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
                  <h2 className="min-w-0 truncate font-display text-sm font-semibold tracking-wide text-gold">
                    {title}
                  </h2>

                  {count !== undefined && (
                    <p className="shrink-0 font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
                      {count}
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
