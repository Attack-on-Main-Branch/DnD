"use client";

import { useEffect, useRef } from "react";

import Button from "./button";

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-black/10 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:border-white/15 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="p-6" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>

        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
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
