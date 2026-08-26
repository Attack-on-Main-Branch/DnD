"use client";

import { createContext, useContext, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { useTableMarks } from "./table-marks";

/**
 * How tall a panel's contents stand — ONE height for every mark and every chair,
 * or the box resizes each time the pointer moves between two of them.
 *
 * THE FIGURE IS THE SCORES SHEET'S, measured: a player's runs to 552px at 1440
 * by 900, and this is the next round pair above it. A Dungeon Master's carries
 * the party picker on top and does scroll; that is the trade.
 *
 * A literal, or Tailwind's scanner never sees it. The `vh` half is the guard:
 * the panel hangs off the marks and has the window's foot to clear.
 */
export const POPOVER_BODY_CLASSES = "h-[min(36rem,64vh)]";

/**
 * And how tall it stands with a SECOND panel under it: the pair hangs off the
 * marks together and has to clear the bottom of the window. A literal again.
 */
export const POPOVER_BODY_SHORT_CLASSES = "h-[min(24rem,42vh)]";

/** One node is shared by every mark, so only the open one may render into it. */
const AsideContext = createContext({ node: null, open: false });

/**
 * A panel of its own, under the one this is rendered inside — a list to choose
 * from, and the thing chosen. It draws its own surface, so a mark with nothing
 * open leaves no empty box behind.
 */
export function PopoverAside({ children }) {
  const { node, open } = useContext(AsideContext);

  return node && open ? createPortal(children, node) : null;
}

/**
 * Whether the panel this is called inside is open. A drawer that remembers what
 * somebody had open needs to forget it when the mark shuts, or the same spell
 * is standing under the book the next time it is pressed.
 */
export function usePopoverOpen() {
  return useContext(AsideContext).open;
}

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
  meta,
  arrival = 0,
  onShortcut,
  children,
}) {
  const value = useId();
  const panelId = `${value}-panel`;

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const { body, under, open, hold, toggle, close } = useTableMarks();
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

                  {/* Whatever the panel wants beside its name, then the count. */}
                  <div className="flex shrink-0 items-baseline gap-3">
                    {meta}

                    {count !== undefined && (
                      <p className="font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
                        {count}
                      </p>
                    )}
                  </div>
                </div>

                {/* The hairline the header and the changelog drawer carry. */}
                <div aria-hidden="true" className={FADED_RULE_CLASSES} />

                <AsideContext.Provider value={{ node: under, open: isOpen }}>
                  {children}
                </AsideContext.Provider>
              </div>
            </div>
          </div>,
          body,
        )}
    </>
  );
}
