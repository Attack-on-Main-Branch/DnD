"use client";

import { useEffect, useId, useRef } from "react";

import Button from "./button";
import { surfaceClasses } from "./surface";

/**
 * Confirmation modal for destructive actions.
 *
 * Built on the native <dialog> element, which brings focus trapping, the
 * top-layer stacking context, inertness of the page behind it and Escape-to-
 * close without any of it having to be reimplemented — and without the
 * accessibility bugs a hand-rolled modal usually ships with.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Named from the heading below. A heading inside a dialog does not
      // contribute to its accessible name on its own, so without these the
      // modal announces as an unnamed "dialog" — and the one thing a
      // destructive confirmation has to say is what it is confirming.
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape and backdrop dismissal both route through the same handler as
      // the Cancel button, so React state never drifts from the DOM state.
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) {
          onCancel();
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) {
          onCancel();
        }
      }}
      // No padding here on purpose: padding on the <dialog> itself counts as
      // part of the element, so clicking it would read as a backdrop click and
      // dismiss the dialog. The inner wrapper owns the spacing instead.
      className={surfaceClasses({
        variant: "solid",
        className:
          "m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 text-ink backdrop:bg-black/70",
      })}
    >
      <div className="p-6" onClick={(event) => event.stopPropagation()}>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>

        <p id={descriptionId} className="mt-2 text-sm text-ink/60">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
