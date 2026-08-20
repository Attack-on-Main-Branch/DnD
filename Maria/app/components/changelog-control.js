"use client";

/**
 * A handle onto the one changelog drawer in the dashboard layout, in the shape
 * `navigation-progress-control.js` already established: a module singleton
 * rather than a context, because there is exactly one drawer and the caller is
 * a click handler in a sibling subtree.
 *
 * `returnFocus` travels with the request. The drawer sends focus back to
 * whatever opened it, and opened from the notification popover that is the
 * envelope in the header, not the grimoire in the corner.
 */
let controller = null;

export function registerChangelog(api) {
  controller = api;

  return () => {
    if (controller === api) {
      controller = null;
    }
  };
}

export function openChangelog({ returnFocus = null } = {}) {
  controller?.open({ returnFocus });
}
