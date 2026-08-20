"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  registerNavigationProgress,
  stopNavigationProgress,
} from "../navigation-progress-control";
import { prefersReducedMotion } from "../use-reduced-motion";

/** How far the bar may creep while the page is still on its way. */
const CRAWL_TARGET = 0.9;
const CRAWL_DURATION = 8000;

/** The closing sweep, and the fade that follows it. */
const FINISH_DURATION = 240;
const FADE_DURATION = 160;

/** Nothing should leave the bar running forever if a signal is ever missed. */
const SAFETY_TIMEOUT = 15000;

/**
 * The loading bar across the top of every page. Mounted once in the root layout
 * so it survives the navigation it is reporting on — inside a <Link> it belongs
 * to the page being left and unmounts the moment that navigation completes.
 *
 * A click or submit anywhere in the document starts it; a change of pathname
 * finishes it. Driven through refs and the Web Animations API rather than React
 * state, since nothing it does affects what is rendered.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const barRef = useRef(null);
  const stateRef = useRef({
    running: false,
    crawl: null,
    finish: null,
    safety: null,
  });

  useEffect(() => {
    const bar = barRef.current;

    if (!bar) {
      return undefined;
    }

    const state = stateRef.current;

    function clearSafety() {
      if (state.safety !== null) {
        clearTimeout(state.safety);
        state.safety = null;
      }
    }

    function start() {
      if (state.running) {
        return;
      }

      state.running = true;

      state.finish?.cancel();
      state.finish = null;
      state.crawl?.cancel();
      state.crawl = null;

      bar.style.opacity = "1";

      // Reduced motion: placed at the crawl target and held, so it still
      // reports loading without travelling. Handled here rather than in CSS
      // because every frame comes from the Web Animations API, which no
      // stylesheet can override.
      if (prefersReducedMotion()) {
        bar.style.transform = `scaleX(${CRAWL_TARGET})`;

        clearSafety();
        state.safety = setTimeout(stop, SAFETY_TIMEOUT);
        return;
      }

      // In case the last navigation ended on the static branch above.
      bar.style.transform = "scaleX(0)";

      // Stalls at 90%: reaching the end would claim the work was finished.
      state.crawl = bar.animate(
        [{ transform: "scaleX(0)" }, { transform: `scaleX(${CRAWL_TARGET})` }],
        {
          duration: CRAWL_DURATION,
          easing: "cubic-bezier(0, 0.7, 0.2, 1)",
          fill: "forwards",
        },
      );

      clearSafety();
      state.safety = setTimeout(stop, SAFETY_TIMEOUT);
    }

    function stop() {
      if (!state.running) {
        return;
      }

      state.running = false;
      clearSafety();

      // The counterpart of the static start: appearing and disappearing is the
      // entire signal, so there is no sweep to run and nothing to read a
      // position from.
      if (prefersReducedMotion()) {
        state.crawl?.cancel();
        state.crawl = null;

        bar.style.opacity = "0";
        bar.style.transform = "scaleX(0)";
        return;
      }

      // Read the position before cancelling: cancelling snaps the element back
      // to the start, and the sweep must pick up where the bar actually is.
      // Read unconditionally, since a reduced-motion start places the bar with
      // an inline transform and runs no animation at all.
      const current = getComputedStyle(bar).transform;
      // "none" would mean an identity matrix — full width — and the sweep
      // would start already finished.
      const from = current === "none" ? "scaleX(0)" : current;

      if (state.crawl) {
        state.crawl.cancel();
        state.crawl = null;
      }

      // Sweep the rest of the way, then fade, so a fast navigation still shows
      // a complete bar. Reset only once this has finished, never mid-sweep.
      const total = FINISH_DURATION + FADE_DURATION;

      const finish = bar.animate(
        [
          { transform: from, opacity: 1, easing: "ease-out" },
          {
            transform: "scaleX(1)",
            opacity: 1,
            offset: FINISH_DURATION / total,
          },
          { transform: "scaleX(1)", opacity: 0 },
        ],
        { duration: total, fill: "forwards" },
      );

      state.finish = finish;

      finish.finished
        .then(() => {
          if (state.finish !== finish) {
            return;
          }

          // Hide first, then drop the animation: releasing the forwards fill
          // would otherwise flash the bar back to full opacity for a frame.
          bar.style.opacity = "0";
          finish.cancel();
          state.finish = null;
        })
        .catch(() => {
          // Cancelled because another navigation started. Nothing to tidy up.
        });
    }

    function handleClick(event) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      // A modified click opens a new tab; this one stays put.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;

      if (!anchor || anchor.hasAttribute("download")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href || href.startsWith("#")) {
        return;
      }

      let url;

      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      // Same page, or off-site: either way there is nothing to wait for.
      if (
        url.origin !== window.location.origin ||
        url.pathname === window.location.pathname
      ) {
        return;
      }

      start();
    }

    function handleSubmit(event) {
      if (!event.defaultPrevented) {
        start();
      }
    }

    // `stop` for a navigation that will not happen after all — a form that
    // failed validation in the browser. `start` for one the listeners below
    // cannot see, because its click was cancelled to play a closing first.
    const unregister = registerNavigationProgress({ start, stop });

    // Capture phase: React calls preventDefault on form actions, and this needs
    // to see the event before that happens.
    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      unregister();
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      clearSafety();
      state.crawl?.cancel();
      state.finish?.cancel();
    };
  }, []);

  // The URL changed, so the navigation landed. Harmless on the first render:
  // stop() does nothing when the bar is not running.
  useEffect(() => {
    stopNavigationProgress();
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <div
        ref={barRef}
        style={{ transform: "scaleX(0)", opacity: 0 }}
        className="h-full w-full origin-left bg-gold shadow-[0_0_8px] shadow-gold/60"
      />
    </div>
  );
}
