"use client";

import { useEffect, useRef } from "react";

import { useReducedMotion } from "@/app/components/use-reduced-motion";

/** Milliseconds for one full turn at rest. */
const SPIN_DURATION = 26000;

/** How much faster it turns while hovered or focused. */
const HOVER_SPEED = 5;

/**
 * A nine-pointed star as an SVG path.
 *
 * Points alternate between the outer and inner radius, starting at twelve
 * o'clock. Computed once at module load rather than typed out, so the shape can
 * be retuned by changing a number instead of forty coordinates.
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

export default function PlayButton() {
  const spinnerRef = useRef(null);
  const animationRef = useRef(null);

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = spinnerRef.current;

    if (!node || reduceMotion) {
      return undefined;
    }

    // Driven by the Web Animations API rather than a CSS animation on purpose:
    // swapping `animation-duration` on hover restarts the timeline and the star
    // visibly jumps, whereas changing `playbackRate` keeps the current angle and
    // only alters how fast it advances from there.
    const animation = node.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: SPIN_DURATION, iterations: Infinity, easing: "linear" },
    );

    animationRef.current = animation;

    return () => {
      animation.cancel();
      animationRef.current = null;
    };
  }, [reduceMotion]);

  function setSpeed(rate) {
    if (animationRef.current) {
      animationRef.current.playbackRate = rate;
    }
  }

  return (
    <>
      <button
        type="button"
        // Inert until sessions exist. `aria-disabled` rather than `disabled`
        // keeps it readable and reachable, and stops the pointer cursor from
        // promising a click that does nothing.
        aria-disabled="true"
        aria-describedby="play-button-note"
        title="Sessions are not available yet"
        onPointerEnter={() => setSpeed(HOVER_SPEED)}
        onPointerLeave={() => setSpeed(1)}
        onFocus={() => setSpeed(HOVER_SPEED)}
        onBlur={() => setSpeed(1)}
        // size-20 matches the Avatar `lg` size it sits beside in the header.
        className="group relative grid size-20 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
      >
        <span
          ref={spinnerRef}
          aria-hidden="true"
          className="absolute inset-0 drop-shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[filter] duration-500 group-hover:drop-shadow-[0_0_22px_rgba(245,158,11,0.75)]"
        >
          <svg viewBox="-60 -60 120 120" className="size-full">
            <defs>
              <linearGradient id="play-star-gold" x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0%" stopColor="#fff8c9" />
                <stop offset="35%" stopColor="#ffd23f" />
                <stop offset="70%" stopColor="#f0a500" />
                <stop offset="100%" stopColor="#c77800" />
              </linearGradient>

              <linearGradient id="play-star-back" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3a8" />
                <stop offset="100%" stopColor="#ffd970" />
              </linearGradient>

              {/* The specular band that sweeps across the metal. */}
              <linearGradient id="play-star-sheen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="45%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              <clipPath id="play-star-clip">
                <path d={FRONT_STAR} />
              </clipPath>
            </defs>

            <path
              d={BACK_STAR}
              fill="url(#play-star-back)"
              stroke="#141414"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />

            <path
              d={FRONT_STAR}
              fill="url(#play-star-gold)"
              stroke="#141414"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            <g clipPath="url(#play-star-clip)">
              {/*
                Tilted so the highlight runs corner to corner. Animated with
                SMIL rather than CSS: a CSS transform on an SVG child resolves
                against a coordinate system that varies by `transform-box`,
                while `x` is unambiguous user units.
              */}
              <g transform="rotate(20)">
                <rect x="-110" y="-90" width="26" height="180" fill="url(#play-star-sheen)">
                  {!reduceMotion && (
                    <animate
                      attributeName="x"
                      values="-110;90;-110"
                      keyTimes="0;0.55;1"
                      dur="4.5s"
                      repeatCount="indefinite"
                    />
                  )}
                </rect>
              </g>
            </g>
          </svg>
        </span>

        {/* Kept outside the spinning layer so the icon stays upright. */}
        <span className="relative z-10 text-black">
          <PlayIcon />
        </span>
      </button>

      {/*
        The button carries no visible label, so this is what names it. Kept in
        the accessibility tree but out of the layout: a line of explanatory
        text under a 5rem button would be wider than the button itself. Sighted
        users get the same sentence from the title attribute.
      */}
      <span id="play-button-note" className="sr-only">
        Play. Sessions are not available yet.
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
