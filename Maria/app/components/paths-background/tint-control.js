"use client";

/**
 * A handle onto the background's tint, for the table. A module singleton for
 * the reason navigation-progress-control.js is one: there is exactly one
 * background, mounted in the root layout, and the page that colours it is
 * nowhere beneath it to be handed a context.
 *
 * The wish is kept as well as passed on, so a table that says so before the
 * background has registered is still obeyed once it does.
 */
let tint = null;
let fighting = false;

export function registerTint(instance) {
  tint = instance;
  instance.set(fighting ? 1 : 0);

  return () => {
    if (tint === instance) {
      tint = null;
    }
  };
}

/** Red while the party fights, the background's own gold otherwise. */
export function setBattleTint(on) {
  fighting = on;
  tint?.set(on ? 1 : 0);
}
