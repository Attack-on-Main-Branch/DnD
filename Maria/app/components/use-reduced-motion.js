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

/**
 * The same preference, read on the spot rather than subscribed to.
 *
 * For code that animates imperatively and so has no render to hang a hook off
 * — the navigation bar drives itself through the Web Animations API and keeps
 * its effect on an empty dependency list on purpose. Asking at the moment of
 * animating is both simpler than threading the hook's value through a ref and
 * more current, since it cannot be a render behind.
 *
 * Callers must be in the browser; there is no server answer to give.
 */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
