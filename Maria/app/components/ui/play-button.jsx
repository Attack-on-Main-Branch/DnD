"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { useReducedMotion } from "@/app/components/use-reduced-motion";

/** Milliseconds for one full turn at rest. */
const SPIN_DURATION = 26000;

/** How much faster it turns while hovered or focused. */
const HOVER_SPEED = 5;

/**
 * Direction the highlight travels, in degrees clockwise from the +x axis.
 * 135° points down and to the left, so the sweep runs from the top-right
 * corner to the bottom-left one.
 */
const SHEEN_ANGLE = 135;

/**
 * A nine-pointed star as an SVG path: points alternate between the outer and
 * inner radius, starting at twelve o'clock.
 */
function starPath(points, outerRadius, innerRadius, rotationDeg = 0) {
  const step = Math.PI / points;
  const start = (rotationDeg * Math.PI) / 180 - Math.PI / 2;

  const coordinates = [];

  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = start + index * step;

    coordinates.push(
      `${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`,
    );
  }

  return `M${coordinates.join("L")}Z`;
}

const FRONT_STAR = starPath(9, 50, 21);
// Offset by half a step so its points show through the gaps of the front one,
// which is what gives the layered look of alternating long and short spikes.
const BACK_STAR = starPath(9, 44, 18, 20);

/**
 * `transform-origin: center` is wrong here: it resolves from the user-space
 * origin rather than the viewBox corner, so with "-60 -60 120 120" it lands on
 * (60, 60) and the star orbits instead of spinning. `transform-box` has to be
 * stated too — a fill-box reference would move with the bounding box.
 */
const SPIN_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" };

/**
 * Amber rather than gold: this control's own bloom is amber-500, and a gold
 * ring beside it reads as a competing colour. globals.css puts the app ring at
 * zero specificity so a component can do this. `outline-offset-4` clears the
 * round star and lands flush with the global 6px casing, and the 8px shadow
 * restores the dark beyond it — restated rather than widened, since
 * `box-shadow` does not accumulate.
 */
const CONTROL_CLASSES =
  "group relative grid size-20 place-items-center rounded-full " +
  "focus-visible:shadow-[0_0_0_8px_rgba(10,8,6,0.9)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-amber-500";

const NO_SESSION_NOTE = "Sessions are not available yet.";

/**
 * The way into a session. Given an `href` it is a link, which is what puts the
 * closing animation and the loading bar behind it — both hang off anchors in
 * nav-transition.jsx. Without one it stays the inert control the character
 * sheet has always shown, because that route has nowhere to go yet.
 *
 * `data-bloom` beside `data-fade` is how it leaves: pressed, it grows past the
 * page and fades slowly as the table opens behind it; on any other way off this
 * sheet it fades with everything else. panel-fold.js decides which, from the
 * anchor the click came through.
 */
export default function PlayButton({ href, label = "Play" }) {
  const spinRef = useRef(null);
  const counterSpinRef = useRef(null);

  const reduceMotion = useReducedMotion();

  // Gradients and clip paths are referenced by id, which is document scope, so
  // two of these on one page would share definitions. Stripped to
  // alphanumerics: React's own id carries delimiters `url(#…)` chokes on.
  const scope = useId().replace(/[^a-zA-Z0-9]/g, "");
  const noteId = `play-note-${scope}`;

  useEffect(() => {
    const spinNode = spinRef.current;

    if (!spinNode || reduceMotion) {
      return undefined;
    }

    const options = {
      duration: SPIN_DURATION,
      iterations: Infinity,
      easing: "linear",
    };

    // The Web Animations API rather than a CSS animation: swapping
    // `animation-duration` on hover restarts the timeline and the star jumps,
    // where `playbackRate` keeps the angle it had reached.
    const spin = spinNode.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      options,
    );

    const animations = [spin];

    // The highlight is masked to the star's silhouette, so left alone it would
    // turn with it and arrive from a different corner every second. Cancelling
    // the rotation exactly keeps the sweep fixed while the mask still tracks.
    const counterSpinNode = counterSpinRef.current;

    if (counterSpinNode) {
      const counterSpin = counterSpinNode.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }],
        options,
      );

      animations.push(counterSpin);

      // Locked together: created in the same tick they would almost certainly
      // share a start time, and "almost" wanders visibly over a few minutes.
      Promise.all([spin.ready, counterSpin.ready])
        .then(() => {
          counterSpin.startTime = spin.startTime;
        })
        .catch(() => {});
    }

    return () => {
      for (const animation of animations) {
        animation.cancel();
      }
    };
  }, [reduceMotion]);

  /** Asked of the elements rather than kept in a list, which an effect re-run
      could leave out of step. */
  function setSpeed(rate) {
    for (const node of [spinRef.current, counterSpinRef.current]) {
      for (const animation of node?.getAnimations() ?? []) {
        animation.playbackRate = rate;
      }
    }
  }

  const quickening = {
    onPointerEnter: () => setSpeed(HOVER_SPEED),
    onPointerLeave: () => setSpeed(1),
    onFocus: () => setSpeed(HOVER_SPEED),
    onBlur: () => setSpeed(1),
  };

  const star = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 drop-shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[filter] duration-500 group-hover:drop-shadow-[0_0_22px_rgba(245,158,11,0.75)]"
      >
        <svg viewBox="-60 -60 120 120" className="size-full">
          <defs>
            <linearGradient
              id={`play-gold-${scope}`}
              x1="0"
              y1="0"
              x2="0.35"
              y2="1"
            >
              <stop offset="0%" stopColor="#fff8c9" />
              <stop offset="35%" stopColor="#ffd23f" />
              <stop offset="70%" stopColor="#f0a500" />
              <stop offset="100%" stopColor="#c77800" />
            </linearGradient>

            <linearGradient
              id={`play-back-${scope}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="100%" stopColor="#ffd970" />
            </linearGradient>

            {/* The specular band that sweeps across the metal. */}
            <linearGradient
              id={`play-sheen-${scope}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <clipPath id={`play-clip-${scope}`}>
              <path d={FRONT_STAR} />
            </clipPath>
          </defs>

          <g ref={spinRef} style={SPIN_ORIGIN}>
            <path
              d={BACK_STAR}
              fill={`url(#play-back-${scope})`}
              stroke="#141414"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />

            <path
              d={FRONT_STAR}
              fill={`url(#play-gold-${scope})`}
              stroke="#141414"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            {!reduceMotion && (
              <g clipPath={`url(#play-clip-${scope})`}>
                <g ref={counterSpinRef} style={SPIN_ORIGIN}>
                  <g transform={`rotate(${SHEEN_ANGLE})`}>
                    {/* SMIL rather than CSS: a CSS transform on an SVG child
                        resolves against a coordinate system that varies by
                        `transform-box`, where `x` is plain user units. One
                        direction only — sweeping back would send the light the
                        wrong way for half of every cycle, so it crosses and
                        then waits off-stage. */}
                    <rect
                      x="-110"
                      y="-90"
                      width="26"
                      height="180"
                      fill={`url(#play-sheen-${scope})`}
                    >
                      <animate
                        attributeName="x"
                        values="-110;90;90"
                        keyTimes="0;0.3;1"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </rect>
                  </g>
                </g>
              </g>
            )}
          </g>
        </svg>
      </span>

      {/* Kept outside the spinning layer so the icon stays upright. */}
      <span className="relative z-10 text-black">
        <PlayIcon />
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        data-fade
        data-bloom
        // Everything inside is `aria-hidden`, so the name comes from here.
        aria-label={label}
        className={CONTROL_CLASSES}
        {...quickening}
      >
        {star}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        // Inert until sessions exist. `aria-disabled` rather than `disabled`
        // keeps it readable and reachable, and stops the pointer cursor from
        // promising a click that does nothing.
        aria-disabled="true"
        // Everything inside is `aria-hidden` and `aria-describedby` is a
        // description rather than a name, so without this the computation fell
        // through to `title` and the control announced as its own state.
        aria-label={label}
        aria-describedby={noteId}
        title={NO_SESSION_NOTE}
        className={CONTROL_CLASSES}
        {...quickening}
      >
        {star}
      </button>

      {/* The description, not the name. Out of the layout because a line of
          text under a 5rem button would be wider than the button; sighted users
          get the same sentence from `title`. */}
      <span id={noteId} className="sr-only">
        {NO_SESSION_NOTE}
      </span>
    </>
  );
}

function PlayIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}
