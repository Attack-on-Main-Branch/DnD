"use client";

import { useEffect, useId, useRef } from "react";

import { useReducedMotion } from "@/app/components/use-reduced-motion";

import { SHEET_WIDTH_CLASS, surfaceClasses } from "./surface";

/**
 * The fold, in milliseconds. Must match `.edit-dialog[data-closing]` in
 * globals.css: the animation is CSS, but a <dialog> is closed by script, and
 * the script has to know when the fold has finished.
 */
const CLOSE_MS = 340;

/**
 * The sheet an edit is made on. A native <dialog>, so the focus trap, the top
 * layer, the inertness behind it and Escape all come free — the same reasoning
 * as confirm-dialog.jsx, one size up.
 *
 * The opening is `.edit-dialog` in globals.css and is the creation sheet's own,
 * to the millisecond: a slit fades in, unfolds, and the contents arrive after
 * it. That is not decoration. This modal holds the creation form itself, so a
 * different entrance would say it was a different sheet.
 *
 * `data-closing` is written straight onto the element rather than through
 * state, the way campaign-map.jsx writes its own: it exists to start a CSS
 * animation and nothing in React renders from it, so a render is a round trip
 * for nothing.
 *
 * The heading is `sr-only` by design: a dialog needs an accessible name, and a
 * visible one would put a line above the form that the creation sheet has not.
 *
 * The width and the padding are the creation panel's own — SHEET_WIDTH_CLASS
 * and PANEL_CLASSES in surface.js. The sheet is not meant to resemble the
 * creation sheet; it is meant to be it.
 */
export default function EditModal({
  open,
  title,
  busy = false,
  onClose,
  children,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return undefined;
    }

    if (open) {
      // Caught mid-fold: the attribute comes off, which restarts the opening
      // animation from wherever the collapse had got to.
      delete dialog.dataset.closing;

      if (!dialog.open) {
        dialog.showModal();
      }

      return undefined;
    }

    if (!dialog.open) {
      return undefined;
    }

    if (reduceMotion) {
      dialog.close();
      return undefined;
    }

    dialog.dataset.closing = "";

    const timer = setTimeout(() => {
      dialog.close();
      delete dialog.dataset.closing;
    }, CLOSE_MS);

    return () => clearTimeout(timer);
  }, [open, reduceMotion]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Escape and a press on the backdrop both route through the same handler
      // the Cancel button uses, so React state never drifts from the DOM state.
      // Prevented in both cases: the fold has to play before the close lands.
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) {
          onClose();
        }
      }}
      // No padding on the <dialog> itself: padding counts as part of the
      // element, so a press on it would read as a backdrop press and dismiss
      // the sheet. The wrapper inside owns the spacing.
      className={surfaceClasses({
        variant: "solid",
        glow: true,
        className:
          `edit-dialog scroll-gold m-auto max-h-[calc(100dvh-3rem)] w-[calc(100%-2rem)] ${SHEET_WIDTH_CLASS} ` +
          "overflow-y-auto rounded-2xl p-0 text-ink backdrop:bg-black/50",
      })}
    >
      {/* One element child, which is what `.edit-dialog > *` animates in. */}
      <div className="p-6 sm:p-8" onClick={(event) => event.stopPropagation()}>
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>

        {children}
      </div>
    </dialog>
  );
}
