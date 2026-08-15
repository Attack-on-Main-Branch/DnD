"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, ViewTransition } from "react";

import grimoireLogo from "./brand/grimoire.webp";
import { adoptCarriedPhase } from "./view-nav";

/**
 * A layout effect on the client, a no-op on the server.
 *
 * It has to be a layout effect: React runs the commit for a navigation inside
 * the browser's `startViewTransition` callback, and passive effects are
 * flushed *after* that transition has finished animating. Measured, a
 * `useEffect` here ran a full second late — the book landed, and only then did
 * its drift jump to the position it should have arrived holding.
 *
 * The switch is what keeps React from warning about a layout effect during
 * server rendering, where there is nothing to adopt anyway.
 */
const useCommitEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * How big the book is, and with it the rune rings — they are 152% of this.
 *
 * Set here rather than at the two call sites, because the sign-in flight is a
 * move and nothing else only while both copies are the same size. Split them
 * and the browser has a resize to interpolate as well, which is what made the
 * book appear to shrink on its way down.
 *
 * Proportional rather than fixed: 17.875rem is right on a wide monitor and far
 * too much of a laptop, so it scales with the window and stops at that ceiling.
 * The floor keeps it from disappearing on a phone.
 */
const MARK_SIZE = "w-[clamp(9rem,14vw,17.875rem)]";

/**
 * The same widths again, in the form `next/image` needs to choose a file.
 *
 * It has to be here beside MARK_SIZE, and the two have to change together: the
 * hint is what the browser picks the srcset candidate from, so a stale one
 * simply downloads a bigger picture than the element can use. The breakpoints
 * are where the clamp changes hands — 14vw crosses 9rem at 1028px of viewport
 * and 17.875rem at 2043px.
 *
 * Neither call site can know any of this, which is why neither is asked to.
 */
const MARK_SIZES = "(max-width: 1028px) 144px, (max-width: 2042px) 14vw, 286px";

/**
 * The book, floating in its own light inside two counter-turning rune rings.
 *
 * One component, rendered in two places: inside the sign-in page's lore panel
 * and in the dashboard's bottom-left corner. Its parts carry named
 * `<ViewTransition>`s, which is what lets the browser carry them from one page
 * to the other on sign-in instead of destroying one set and creating another —
 * the book flies to the corner rather than blinking there.
 *
 * Each name must be unique on screen, so exactly one of these may be mounted
 * at a time. That holds: the login page and the dashboard never coexist.
 *
 * `share` names the CSS class the transition gets, and there is deliberately
 * no `default="none"` beside it.
 *
 * The framework guide pairs the two, and here that combination stopped the
 * pair forming at all. Measured during a real sign-out: with it, the only
 * thing that animated was `::view-transition-old(root)` — no group for either
 * name, so no class, so every rule below was dead and the book never moved.
 * Without it the groups appear at their full 900ms with `mark-turn` on the
 * book, which is the whole effect.
 *
 * The cost `default="none"` was there to avoid is these marks animating during
 * unrelated transitions. There are none: the only route change that unmounts
 * this component is between the login page and the dashboard, and within the
 * dashboard it lives in the layout and never moves.
 *
 * The rings are deliberately mismatched — 80s one way, 55s the other — because
 * two rings at the same speed read as one rigid object rather than as
 * something turning.
 *
 * Everything except the book is `aria-hidden`, and the book itself is
 * decorative: on the login page the `<h1>` beside it already says what this is,
 * and in the corner it is atmosphere.
 *
 * @param className  spacing and margins only. Do NOT pass a position utility:
 *                   the box is already `relative`, which the halo and rings
 *                   need as their containing block, and a second one here
 *                   would be resolved by stylesheet order rather than by the
 *                   order in the class attribute. That is how the corner copy
 *                   once ended up in the *top* left, 48px above its static
 *                   spot instead of fixed to the bottom. Position the wrapper
 *                   around it instead, the way the changelog launcher does.
 * @param tilt  a CSS angle for the book's resting lean, e.g. "-30deg". The
 *              artwork is drawn tilted about 15° to the right, so this is
 *              added on top of that: -30deg lands it 15° to the left instead.
 */
export default function GrimoireMark({ className = "", tilt }) {
  const bookRef = useRef(null);

  // On the far side of a sign-in or sign-out this mark is brand new, and its
  // drift would otherwise begin at 0% while the photograph in flight shows the
  // departing one frozen part-way through. Picking up that position is what
  // makes the hand-over invisible. Nothing happens on an ordinary page load.
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
        Two named transitions, not one, and the split is the whole point.

        The flight has to turn the book — the artwork leans 15° right and has
        to arrive leaning 15° left. It must NOT turn the rings: their two
        positions are the same picture, and rotating the snapshot rotated them
        along with the book, so on landing they snapped 30° back to where they
        actually were. That was the jump.

        Their own drift over a 900ms flight is 4° and 6°, far under anything
        the eye picks up, so the rings need no rotation at all — only the move.
      */}
      <ViewTransition name="grimoire-aura" share="aura-morph">
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center"
        >
          <span
            // `opacity-50` is the resting value, not decoration: the breathing
            // animation sets opacity in its keyframes and is only applied
            // under `motion-safe`, so without a declared value here the halo
            // would burn at full strength for anyone asking for reduced
            // motion.
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
        The named element is this wrapper, never the image itself.

        The image carries the drift, so it has a `transform` — and a view
        transition measures the element's *transformed* box to work out the
        move. Naming it meant interpolating between two rotated boxes: the
        book set off in the wrong direction before correcting, turned oddly
        on the way, and snapped on arrival. The wrapper has no transform, so
        the geometry is clean and the drift stays a detail inside the picture.
      */}
      <ViewTransition name="grimoire-book" share="book-morph">
        <span className="relative block w-full">
          <Image
            ref={bookRef}
            src={grimoireLogo}
            alt=""
            sizes={MARK_SIZES}
            loading="eager"
            // Two drop-shadows in one filter: a shadow the book sits on and a
            // gold bloom around it. They have to share one declaration —
            // Tailwind's drop-shadow utility writes a single custom property, so
            // a second one would replace the first rather than stack with it.
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
