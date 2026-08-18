"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, ViewTransition } from "react";

import grimoireLogo from "./brand/grimoire.webp";
import { adoptCarriedPhase } from "./view-nav";

/**
 * Must be a layout effect: React commits a navigation inside the browser's
 * `startViewTransition` callback, and passive effects flush after the
 * transition has finished animating — measured, a full second late. The switch
 * keeps React from warning during server rendering.
 */
const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The book's size, and with it the rings at 152%. Set here rather than at the
 * call sites: the sign-in flight is a move and nothing else only while both
 * copies are the same size, otherwise the book appears to shrink on its way.
 */
const MARK_SIZE = "w-[clamp(9rem,14vw,17.875rem)]";

/**
 * The same widths in the form `next/image` needs. Changes with MARK_SIZE or the
 * browser picks a srcset candidate the element cannot use. The breakpoints are
 * where the clamp changes hands: 14vw crosses 9rem at 1028px and 17.875rem at
 * 2043px.
 */
const MARK_SIZES = "(max-width: 1028px) 144px, (max-width: 2042px) 14vw, 286px";

/**
 * The book inside two counter-turning rune rings. One component in two places —
 * the sign-in lore panel and the dashboard corner — carrying named
 * `<ViewTransition>`s so the browser flies it between them instead of
 * destroying one and creating the other. Each name must be unique on screen, so
 * only one may be mounted; login and dashboard never coexist.
 *
 * `share` names the transition's CSS class, with deliberately no
 * `default="none"` beside it. The framework guide pairs the two, but here that
 * combination stopped the groups forming at all — only
 * `::view-transition-old(root)` animated, so every rule below was dead. Nothing
 * is lost: no other route change unmounts this component.
 *
 * @param className  spacing only. NOT a position utility — the box is already
 *                   `relative` for the halo and rings, and a second one is
 *                   resolved by stylesheet order rather than class order, which
 *                   once put the corner copy in the top left. Position a
 *                   wrapper around it instead.
 * @param tilt  a CSS angle for the resting lean. The artwork is drawn ~15° to
 *              the right, so this adds to that: -30deg lands 15° to the left.
 */
export default function GrimoireMark({ className = "", tilt }) {
  const bookRef = useRef(null);

  // A brand-new mark's drift would start at 0% while the photograph in flight
  // shows the departing one frozen part-way through. No-op on a normal load.
  useCommitEffect(() => {
    adoptCarriedPhase(bookRef.current);
  }, []);

  return (
    <div
      className={`relative grid aspect-square place-items-center ${MARK_SIZE} ${className}`}
      // Read by the float keyframes in globals.css, so the lean and the
      // drift stay one animation rather than two fighting over `transform`.
      style={tilt ? { "--mark-tilt": tilt } : undefined}
    >
      {/*
        Two named transitions rather than one: the flight must turn the book
        (15° right to 15° left) but not the rings, whose two positions are the
        same picture — rotating them with the book made them snap 30° back on
        landing. Their own drift over 900ms is 4° and 6°, below notice.
      */}
      <ViewTransition name="grimoire-aura" share="aura-morph">
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center"
        >
          <span
            // `opacity-50` is the resting value: the breathing keyframes only
            // apply under `motion-safe`, so without it the halo would burn at
            // full strength for anyone asking for reduced motion.
            className="absolute h-[78%] w-[78%] rounded-full bg-[radial-gradient(circle,rgba(255,223,156,0.42),transparent_68%)] opacity-50 blur-[26px] motion-safe:animate-[mark-breathe_8s_ease-in-out_infinite]"
          />

          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="absolute h-[152%] w-[152%] origin-center opacity-70 motion-safe:animate-[ring-spin_80s_linear_infinite]"
          >
            <circle
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.7"
              strokeDasharray="1 8"
            />
            <circle
              cx="100"
              cy="100"
              r="86"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.35"
              opacity="0.8"
            />
          </svg>

          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="absolute h-[124%] w-[124%] origin-center opacity-80 motion-safe:animate-[ring-spin-reverse_55s_linear_infinite]"
          >
            <circle
              cx="100"
              cy="100"
              r="92"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="0.6"
              strokeDasharray="0.6 6"
            />
          </svg>
        </span>
      </ViewTransition>

      {/*
        The wrapper is named, never the image: the image carries the drift, and
        a view transition measures the *transformed* box, so naming it
        interpolated between two rotated boxes and the book set off in the wrong
        direction. The wrapper has no transform.
      */}
      <ViewTransition name="grimoire-book" share="book-morph">
        <span className="relative block w-full">
          <Image
            ref={bookRef}
            src={grimoireLogo}
            alt=""
            sizes={MARK_SIZES}
            loading="eager"
            // One declaration, because Tailwind's drop-shadow utility writes a
            // single custom property and a second would replace the first.
            style={{
              filter:
                "drop-shadow(0 26px 44px rgba(0,0,0,0.65)) drop-shadow(0 0 30px rgba(255,223,156,0.34))",
            }}
            // `mark-book` is the hook globals.css uses for the hover lift and
            // for settling the drift before a page transition captures it.
            className="mark-book block w-full motion-safe:animate-[mark-float_9s_ease-in-out_infinite]"
          />
        </span>
      </ViewTransition>
    </div>
  );
}
