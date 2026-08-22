"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

/** Everything a Tab can reach, for the keyboard loop below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The marks that hang above the map, and the panels behind them. One component
 * for all three, so the lore, the notes and the pack cannot drift apart: the
 * same ink, the same shake when something lands, the same unfold downward out
 * of the same arrow — `mail-arriving` for the shake and the notification
 * dropdown's fold.
 *
 * No halo behind the drawing any more. It was a box tucked INSIDE an outline,
 * which is where it had to go for the light to fall under the strokes rather
 * than through the gaps between them; these marks are solid, so there is no
 * inside to tuck it into and it came out as a smudge.
 *
 * The panel's width is the `w-[min(…)]` below, and both controls follow it.
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
  const panelId = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const [open, setOpen] = useState(false);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // Focus moves in with the panel, or Escape has nothing to catch and the mark
  // opens somewhere a keyboard cannot reach.
  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;

    (panel?.querySelector(FOCUSABLE) ?? panel)?.focus();
  }, [open]);

  // Anywhere outside closes, and pointerdown rather than click so a drag that
  // starts outside does not leave it open behind the pointer.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (
        !panelRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        close({ restoreFocus: false });
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  /**
   * Escape closes; Tab stays inside; Ctrl+Enter is whatever the panel says it
   * is. The trap is the notification dropdown's, for the same reason: what is
   * in here is half-finished, and tabbing out of it leaves it open behind the
   * board.
   */
  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close({ restoreFocus: true });
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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close({ restoreFocus: false }) : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
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

      {/* Always mounted, so it can fold away rather than vanish. */}
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={title}
        tabIndex={-1}
        inert={!open || undefined}
        onKeyDown={onKeyDown}
        className={surfaceClasses({
          variant: "solid",
          glow: true,
          className: [
            "absolute top-full left-1/2 z-40 mt-4 -translate-x-1/2",
            // A closed panel keeps filtering its backdrop — `opacity: 0` and
            // a folded `scale` do not stop it — which over the board's plume
            // showed as a dark slab under the mark.
            "glass-unfiltered",
            // ↓ THE PANEL'S SIZE. See the note at the top of this file.
            "w-[min(50rem,calc(100vw-2rem))] rounded-2xl text-left outline-none",
            // The unfold. `scale` is its own property in Tailwind v4, so it
            // composes with the `translate` above instead of overwriting it.
            // `border-color` and `box-shadow` are in the list because
            // `.glow-gold` declares its own `transition`, and a `transition-*`
            // utility replaces that property wholesale.
            "group origin-top transition-[scale,opacity,border-color,box-shadow] duration-300",
            open
              ? "ease-tray scale-y-100 opacity-100"
              : "pointer-events-none ease-tray-in scale-y-0 opacity-0",
            "motion-reduce:transition-none",
          ].join(" "),
        })}
      >
        {/* The pointer up at the mark — the notification panel's own arrow.
            Only the two borders that fall on its outer edges. */}
        <span
          aria-hidden="true"
          className="absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-t border-l border-gold/25 bg-[var(--surface-96)] transition-colors duration-300 group-focus-within:border-gold/60 group-hover:border-gold/60"
        />

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

        {/* The hairline the header and the changelog drawer both carry. */}
        <div aria-hidden="true" className={FADED_RULE_CLASSES} />

        {children}
      </div>
    </div>
  );
}
