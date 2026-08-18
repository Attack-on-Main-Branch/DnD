"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange) {
  const media = window.matchMedia(QUERY);

  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** The server cannot know, so it assumes motion is fine and the client corrects. */
function getServerSnapshot() {
  return false;
}

/**
 * matchMedia is external state that can change at any moment, so
 * `useSyncExternalStore` reads it without a setState-inside-an-effect cascade.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The same preference read on the spot, for code that animates imperatively and
 * has no render to hang a hook off. Cannot be a render behind, unlike a value
 * threaded through a ref. Browser only — there is no server answer to give.
 */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
