"use client";

/**
 * A handle onto the single navigation bar in the root layout. A module
 * singleton rather than a context: there is exactly one bar and the callers are
 * event handlers, not components.
 *
 * The bar mostly starts itself, from its own capture-phase listeners. `start`
 * is for the one case those cannot see: a navigation whose click was cancelled
 * so a closing animation could play first, which reads to those listeners as a
 * click that goes nowhere.
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

export function startNavigationProgress() {
  controller?.start();
}

export function stopNavigationProgress() {
  controller?.stop();
}
