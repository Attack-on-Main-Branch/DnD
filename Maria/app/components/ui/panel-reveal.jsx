"use client";

import { useLayoutEffect, useRef } from "react";

/** A slit, then the unfold, then the content. Reversed on the way out. */
export const SLIT_IN_MS = 150;
export const UNFOLD_MS = 320;
export const CONTENT_IN_MS = 200;

export const CONTENT_OUT_MS = 150;
export const FOLD_MS = 250;
export const SLIT_OUT_MS = 100;

/** Flat enough to read as a line, tall enough to keep its rounded ends. */
const SLIT = "scaleY(0.02)";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ease(token, fallback = "ease-out") {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(token).trim() ||
    fallback
  );
}

function clear(...elements) {
  for (const element of elements) {
    for (const running of element?.getAnimations() ?? []) {
      running.cancel();
    }
  }
}

/**
 * Opens a glass panel out of a horizontal slit, then brings its contents in.
 *
 * The panel's opacity is only below 1 while it is flat. It carries a
 * `backdrop-filter`, and anything below full opacity is a backdrop root, so the
 * fade is spent at a height where the broken glass cannot be seen. The contents
 * fade freely: they sit inside the element carrying the filter, not around it.
 */
export function revealPanel(panel) {
  const content = panel?.firstElementChild;

  if (!panel) {
    return;
  }

  clear(panel, content);

  panel.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: SLIT_IN_MS,
    easing: "ease-out",
    fill: "backwards",
  });

  if (prefersReducedMotion()) {
    return;
  }

  panel.animate([{ transform: SLIT }, { transform: "scaleY(1)" }], {
    duration: UNFOLD_MS,
    delay: SLIT_IN_MS,
    easing: ease("--ease-tray"),
    fill: "backwards",
  });

  content?.animate(
    [
      { opacity: 0, translate: "0 6px" },
      { opacity: 1, translate: "0 0" },
    ],
    {
      duration: CONTENT_IN_MS,
      delay: SLIT_IN_MS + UNFOLD_MS,
      easing: "ease-out",
      fill: "backwards",
    },
  );
}

/** The reverse, returning how long the caller has to wait for it. */
export function foldPanel(panel) {
  const content = panel?.firstElementChild;

  if (!panel || prefersReducedMotion()) {
    return 0;
  }

  clear(panel, content);

  content?.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: CONTENT_OUT_MS,
    easing: "ease-out",
    fill: "forwards",
  });

  // The unfold's curve reversed: run forwards it eased *out*, so the last few
  // percent crawled and the fold read as unfinished.
  panel.animate([{ transform: "scaleY(1)" }, { transform: SLIT }], {
    duration: FOLD_MS,
    delay: CONTENT_OUT_MS,
    easing: ease("--ease-tray-in", "ease-in"),
    fill: "forwards",
  });

  panel.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: SLIT_OUT_MS,
    delay: CONTENT_OUT_MS + FOLD_MS,
    easing: "ease-out",
    fill: "forwards",
  });

  return CONTENT_OUT_MS + FOLD_MS + SLIT_OUT_MS;
}

/** The wrapper exists to hold a ref: the panel is Server-rendered. */
export default function PanelReveal({ children }) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    revealPanel(rootRef.current?.firstElementChild);
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
