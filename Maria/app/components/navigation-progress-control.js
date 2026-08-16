"use client";

/**
 * A tiny handle onto the single navigation bar mounted in the root layout.
 *
 * Deliberately a module singleton rather than a React context: there is
 * exactly one bar, the callers are event handlers rather than components, and
 * threading a provider through the tree to reach them would be ceremony around
 * a two-function API.
 *
 * There used to be a third, `startNavigationProgress`, which nothing imported.
 * The bar starts itself from its own capture-phase click and submit listeners,
 * so the only thing anyone outside it ever needs is a way to say "nothing is
 * going to happen after all" — which is `stop`.
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
