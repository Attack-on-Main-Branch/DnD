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
 * Whether the visitor has asked their system to reduce motion.
 *
 * `useSyncExternalStore` is the right primitive here: matchMedia is external
 * state that can change at any moment, and this reads it without the
 * setState-inside-an-effect dance that causes a cascading re-render.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
