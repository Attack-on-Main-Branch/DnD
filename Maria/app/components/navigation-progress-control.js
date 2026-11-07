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
let progressVisible = false;
let showPageLoading = false;
const pendingPages = new Set();
const loadingListeners = new Set();

function updatePageLoading() {
  const next = pendingPages.size > 0 && !progressVisible;
  if (next === showPageLoading) return;
  showPageLoading = next;
  for (const listener of loadingListeners) listener();
}

export function setNavigationProgressVisible(visible) {
  progressVisible = visible;
  updatePageLoading();
}

export function registerPageLoading() {
  const page = Symbol();
  pendingPages.add(page);
  updatePageLoading();

  return () => {
    pendingPages.delete(page);
    updatePageLoading();
  };
}

export function subscribePageLoading(listener) {
  loadingListeners.add(listener);
  return () => loadingListeners.delete(listener);
}

export function isPageLoading() {
  return showPageLoading;
}

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
