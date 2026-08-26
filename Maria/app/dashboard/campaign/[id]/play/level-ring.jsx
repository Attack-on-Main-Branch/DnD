"use client";

import { useState } from "react";

import { useCharacterLevel } from "./table-state";

/**
 * The level ring on a party card. A READ-OUT: nothing here moves the number, and
 * the only thing that does is experience crossing a threshold.
 *
 * THE ELEVATOR IS THE WHOLE COMPONENT. `car` follows the number by reconciling
 * against it during render, so a rung that moves rides rather than snaps.
 */

/**
 * Which way each half of the elevator travels. `--ease-glide` is the
 * `cubic-bezier(0.16, 1, 0.3, 1)` this was specified at.
 *
 * Literal strings, and they must stay so: a class built from a template is one
 * Tailwind's scanner never sees.
 */
const RIDE = {
  up: {
    arriving:
      "motion-safe:animate-[level-in-above_220ms_var(--ease-glide)_backwards]",
    leaving:
      "motion-safe:animate-[level-out-below_220ms_var(--ease-glide)_both]",
  },
  down: {
    arriving:
      "motion-safe:animate-[level-in-below_220ms_var(--ease-glide)_backwards]",
    leaving:
      "motion-safe:animate-[level-out-above_220ms_var(--ease-glide)_both]",
  },
};

/** 36px across. */
const RING_CLASSES =
  "relative z-10 grid size-9 shrink-0 place-items-center overflow-hidden " +
  "rounded-full border border-gold/30 bg-gold/15 " +
  "font-display text-lg leading-none font-semibold tabular-nums text-gold";

function ride(car, to) {
  return {
    shown: to,
    leaving: car.shown,
    direction: Math.sign(to - car.shown),
    trip: car.trip + 1,
  };
}

export default function LevelRing({ characterId, atTable }) {
  const level = useCharacterLevel(characterId);

  const [car, setCar] = useState(() => ({
    shown: level,
    leaving: null,
    direction: 0,
    trip: 0,
  }));

  /**
   * What the server was last saying. Adjusted DURING the render, the way
   * quantity-stepper.jsx is: React re-runs this before touching the DOM, so the
   * elevator never rides twice for one change.
   */
  const [agreed, setAgreed] = useState(level);

  if (agreed !== level) {
    setAgreed(level);

    if (level !== car.shown) {
      setCar(ride(car, level));
    }
  }

  const beat = car.direction < 0 ? RIDE.down : RIDE.up;

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      {/* `overflow-hidden` is the clipping mask: the two numbers pass each
          other inside it and neither is seen outside the circle. */}
      <span aria-hidden="true" className={RING_CLASSES}>
        {/* Stacked in one grid cell, so the ring is still sized by its digit.
            The key is what replays the animation on each ride. */}
        <span
          key={`arriving-${car.trip}`}
          className={`col-start-1 row-start-1 ${car.trip === 0 ? "" : beat.arriving}`}
        >
          {car.shown}
        </span>

        {car.leaving !== null && (
          /* `opacity-0` as a declaration and not only as a keyframe: reduced
             motion drops the animation, and this is where the digit rests. */
          <span
            key={`leaving-${car.trip}`}
            className={`col-start-1 row-start-1 opacity-0 ${beat.leaving}`}
          >
            {car.leaving}
          </span>
        )}
      </span>

      {/* What the ring means, for a reader who cannot see it. */}
      <span className="sr-only">
        Level {car.shown}
        {atTable ? ", at the table" : ""}
      </span>
    </div>
  );
}
