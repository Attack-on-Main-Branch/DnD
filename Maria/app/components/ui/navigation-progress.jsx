"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  registerNavigationProgress,
  stopNavigationProgress,
} from "../navigation-progress-control";

/** How far the bar may creep while the page is still on its way. */
const CRAWL_TARGET = 0.9;
const CRAWL_DURATION = 8000;

/** The closing sweep, and the fade that follows it. */
const FINISH_DURATION = 240;
const FADE_DURATION = 160;

/** Nothing should leave the bar running forever if a signal is ever missed. */
const SAFETY_TIMEOUT = 15000;

/**
 * The loading bar across the top of every page.
 *
 * Mounted once in the root layout, which is the whole point: an earlier
 * version lived inside each <Link>, so it belonged to the page being navigated
 * *away from* and was unmounted the instant that navigation completed — the
 * bar could never finish, and it saw nothing of the redirects that Server
 * Actions perform after signing in or out.
 *
 * Here it survives every navigation, and it learns about them from two
 * sources: a click or submit anywhere in the document starts it, and a change
 * of pathname finishes it.
 *
 * Driven imperatively through refs and the Web Animations API rather than
 * React state. The bar is a visual effect with no bearing on what is rendered,
 * and re-rendering the tree sixty times a second to move it would be work for
 * nothing.
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

      bar.style.opacity = "1";

      // Eases towards 90% and stalls there. The bar must never reach the end
      // before the page does — that would claim the work was finished.
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

      // Read where the crawl got to before cancelling it: cancelling snaps the
      // element straight back to the start, and the closing sweep has to pick
      // up from the current position rather than jumping backwards.
      let from = "scaleX(0)";

      if (state.crawl) {
        const current = getComputedStyle(bar).transform;
        // "none" would mean an identity matrix — full width — and the sweep
        // would start already finished.
        from = current === "none" ? "scaleX(0)" : current;

        state.crawl.cancel();
        state.crawl = null;
      }

      // Sweep the rest of the way, then fade. This is what makes a fast
      // navigation still show a complete bar: the crawl barely started, so
      // almost the whole width is covered here — and because the bar is only
      // reset once this animation has actually finished, it can never be cut
      // off half way.
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
        className="h-full w-full origin-left bg-indigo-500 shadow-[0_0_8px] shadow-indigo-500/60"
      />
    </div>
  );
}
