"use client";

/**
 * A handle onto the single navigation bar in the root layout. A module
 * singleton rather than a context: there is exactly one bar and the callers are
 * event handlers, not components.
 *
 * No `start`: the bar starts itself from its own capture-phase listeners, so
 * the only thing outsiders need is a way to say nothing will happen after all.
 */
let controller = null;

export function registerNavigationProgress(api) {
  controller = api;

  return () => {
    if (controller === api) {
      controller = null;
    }
  };
}

export function stopNavigationProgress() {
  controller?.stop();
}
