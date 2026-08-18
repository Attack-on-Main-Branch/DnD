"use client";

import { useEffect, useRef } from "react";

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
 * origin, not the viewBox corner, so with "-60 -60 120 120" it lands on (60,
 * 60) and the star orbits instead of spinning. The star is drawn around (0, 0).
 * `transform-box` must be stated too — a fill-box reference would move with the
 * content's bounding box.
 */
const SPIN_ORIGIN = { transformBox: "view-box", transformOrigin: "0 0" };

export default function PlayButton() {
  const spinRef = useRef(null);
  const counterSpinRef = useRef(null);

  const reduceMotion = useReducedMotion();

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

    // Driven by the Web Animations API rather than a CSS animation on purpose:
    // swapping `animation-duration` on hover restarts the timeline and the star
    // visibly jumps, whereas changing `playbackRate` keeps the current angle and
    // only alters how fast it advances from there.
    const spin = spinNode.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      options,
    );

    const animations = [spin];

    // The highlight lives inside the star's clip path, so that it is masked to
    // the star's silhouette as that silhouette turns. Left alone it would turn
    // with it and arrive from a different corner every second. Cancelling the
    // rotation exactly keeps the sweep fixed on screen while the mask still
    // tracks the star.
    const counterSpinNode = counterSpinRef.current;

    if (counterSpinNode) {
      const counterSpin = counterSpinNode.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }],
        options,
      );

      animations.push(counterSpin);

      // Lock the two together. Created in the same tick they would almost
      // certainly share a start time anyway, but "almost certainly" drifts into
      // a visibly wandering highlight over a few minutes.
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

  /**
   * Asks the elements for their running animations rather than keeping a list
   * around. One source of truth, and nothing to fall out of step if an effect
   * re-runs.
   */
  function setSpeed(rate) {
    for (const node of [spinRef.current, counterSpinRef.current]) {
      for (const animation of node?.getAnimations() ?? []) {
        animation.playbackRate = rate;
      }
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
        // The name has to come from `aria-label`. Everything inside the button
        // is `aria-hidden`, and `aria-describedby` supplies a description, not
        // a name — so without this the computation fell all the way through to
        // `title` and the control announced as "Sessions are not available
        // yet", which is its state rather than what it is.
        aria-label="Play"
        aria-describedby="play-button-note"
        title="Sessions are not available yet"
        onPointerEnter={() => setSpeed(HOVER_SPEED)}
        onPointerLeave={() => setSpeed(1)}
        onFocus={() => setSpeed(HOVER_SPEED)}
        onBlur={() => setSpeed(1)}
        // Amber rather than gold, because this control's own bloom is amber-500
        // and a gold ring reads as a competing colour. globals.css puts the app
        // ring at zero specificity so a component can do this.
        //
        // `outline-offset-4` clears the round star, which lands the outline
        // flush with the global 6px casing; 8px restores the dark beyond it.
        // Restated rather than widened, since `box-shadow` does not accumulate.
        className="group relative grid size-20 place-items-center rounded-full focus-visible:shadow-[0_0_0_8px_rgba(10,8,6,0.9)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 drop-shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-[filter] duration-500 group-hover:drop-shadow-[0_0_22px_rgba(245,158,11,0.75)]"
        >
          <svg viewBox="-60 -60 120 120" className="size-full">
            <defs>
              <linearGradient
                id="play-star-gold"
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

            <g ref={spinRef} style={SPIN_ORIGIN}>
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

              {!reduceMotion && (
                <g clipPath="url(#play-star-clip)">
                  <g ref={counterSpinRef} style={SPIN_ORIGIN}>
                    <g transform={`rotate(${SHEEN_ANGLE})`}>
                      {/*
                        Animated with SMIL rather than CSS: a CSS transform on
                        an SVG child resolves against a coordinate system that
                        varies by `transform-box`, while `x` is unambiguous user
                        units.

                        One direction only. Sweeping back would send the light
                        the wrong way across the star for half of every cycle,
                        so it crosses, then waits off-stage for the rest.
                      */}
                      <rect
                        x="-110"
                        y="-90"
                        width="26"
                        height="180"
                        fill="url(#play-star-sheen)"
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
      </button>

      {/*
        The description, not the name — the name is the `aria-label` above, and
        repeating "Play" here would only make it announce twice. Kept in the
        accessibility tree but out of the layout: a line of explanatory text
        under a 5rem button would be wider than the button itself. Sighted
        users get the same sentence from the title attribute.
      */}
      <span id="play-button-note" className="sr-only">
        Sessions are not available yet.
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
