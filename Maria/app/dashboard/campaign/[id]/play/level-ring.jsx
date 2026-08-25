"use client";

import { useState } from "react";
import { MAX_LEVEL, MIN_LEVEL, steppedLevel } from "sina/rules/level";

import { setCharacterLevel } from "./actions";
import { useCharacterLevel, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The level ring on a party card, and the two arrows that step it.
 *
 * `sina/rules/level` rather than `sina/rules/character`: this runs in the
 * browser, and that neighbour would bring the catalogues with it.
 *
 * `canAward` only decides whether to draw a control. `set_character_level`
 * answers everybody but this campaign's Dungeon Master with null.
 *
 * The number is SUBSCRIBED TO rather than handed down, so a press re-renders
 * this ring and nothing else on the card.
 *
 * THE ELEVATOR IS THE ROLLBACK: `car` already follows the number by reconciling
 * against it during render, so a refusal needs no undo of its own — the deed
 * re-reads the party and the ring rides back down. Hence no refusal branch here
 * and no message; the toast says what a 36px circle never could.
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

/** 36px across, so `r` is 18 and the arrow geometry below depends on it. */
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

export default function LevelRing({
  campaignId,
  characterId,
  name,
  actorName,
  canAward,
  atTable,
  onAwarded,
}) {
  const level = useCharacterLevel(characterId);
  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  /* How many awards are in the air. A counter and not a flag: the arrows are
     never disabled, so a second press can land while the first is still out. */
  const [busy, setBusy] = useState(0);

  const [car, setCar] = useState(() => ({
    shown: level,
    leaving: null,
    direction: 0,
    trip: 0,
  }));

  /**
   * What the server was last saying, so a press of our own is not read back as
   * somebody else's award. Adjusted DURING the render, the way
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

  function award(by) {
    const from = car.shown;
    const next = steppedLevel(from, by);

    // Already at that end; the arrow is not drawn there either.
    if (next === null) {
      return;
    }

    setBusy((out) => out + 1);

    run({
      /* Shown until the real list lands. A level is only ever awarded from the
         head of the table, so the target is always named. */
      note: [
        {
          action: "level_change",
          actor: actorName,
          target: name,
          level: next,
          delta: next - from,
        },
      ],

      paint: () => store.setLevel(characterId, next),

      work: () => setCharacterLevel(campaignId, characterId, next),

      tell: (result) => {
        // Only while this press is still the last word: an older answer would
        // ride the elevator back to a level nobody awarded.
        const settled = store.reconcileLevel(characterId, next, result.level);

        if (settled) {
          send({ kind: "level", characterId, level: result.level });
          onAwarded?.();
        }
      },

      want: { party: true, activity: true },
    }).finally(() => setBusy((out) => Math.max(0, out - 1)));
  }

  const beat = car.direction < 0 ? RIDE.down : RIDE.up;

  return (
    /* `group` on the wrapper and not on the ring: the arrows hang outside the
       ring's box, and an absolutely positioned child still hovers its DOM
       ancestors — which is what keeps them from flickering away as the pointer
       reaches them.

       `data-busy` holds them out while the write is in flight, so a cursor that
       has moved on does not snatch them back mid-press. An attribute rather
       than a class, so the three "shown" states below set one identical value
       and never have to out-specify one another. */
    <div
      data-busy={busy > 0 || undefined}
      className="group relative flex shrink-0 items-center justify-center"
    >
      {canAward && car.shown < MAX_LEVEL && (
        <CurvedArrow
          direction="up"
          label={`Level ${name} up to ${car.shown + 1}`}
          onClick={() => award(1)}
        />
      )}

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

      {canAward && car.shown > MIN_LEVEL && (
        <CurvedArrow
          direction="down"
          label={`Level ${name} down to ${car.shown - 1}`}
          onClick={() => award(-1)}
        />
      )}

      {/* What the ring means, for a reader who cannot see it. */}
      <span className="sr-only">
        Level {car.shown}
        {atTable ? ", at the table" : ""}
      </span>
    </div>
  );
}

/**
 * One arrow, with a base that conforms to the ring it comes out from behind.
 *
 * THE SIZES ARE NOT FREE. The drawing is 22×14 user units rendered at 22×14 CSS
 * pixels, so one unit is one pixel and the `A 21 21` below is a real radius in
 * the ring's frame. 21 and not 18 because the arrow stands three pixels OFF the
 * ring, and a concentric curve is what clears a circle by the same distance all
 * the way along. The base ends are 8px either side of centre, so they stand
 * √(21² − 8²) = 19.42 above the ring's centre — 1.42 above its bounding box,
 * which is where the base line sits inside the drawing, and is also the
 * stroke's headroom: an `<svg>` clips to its own viewBox.
 *
 * REVEALED BY OCCLUSION, NOT BY A FADE. The drawing sits in an `overflow-hidden`
 * viewport cut four pixels INTO the ring and rests translated past that edge, so
 * at rest there is nothing to see and — a clipped box not being hit-tested —
 * nothing to click. Four and not zero because the ring is round and the cut is
 * straight: across the drawing's 22px the circle's surface falls at most 3.75px
 * below its crown, so a cut at four is inside the silhouette the whole way.
 */
function CurvedArrow({ direction, label, onClick }) {
  const up = direction === "up";

  return (
    <span
      /* `-inset-x-2` is glow room for the hover drop-shadow, which reaches 8px
         and would be squared off by a clip tight to the ring's width. */
      className={`absolute -inset-x-2 z-0 flex h-7 justify-center overflow-hidden ${
        up
          ? "bottom-[calc(100%-4px)] items-end pb-1"
          : "top-[calc(100%-4px)] items-start pt-1"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        /* 18px is the drawing's height plus the four the viewport is cut in by:
           exactly enough to put every pixel of it past the edge.

           No opacity in the reveal — the clip is the reveal — which leaves
           `opacity` to mean one thing only, `disabled:opacity-40`.

           Only the TRANSITION is behind `motion-safe:`: reduced motion should
           still reveal the control, it just arrives without travelling.
           `translate` is the property Tailwind v4's utilities set. */
        className={
          `flex h-[14px] w-8 cursor-pointer justify-center text-gold/60 ` +
          `hover:text-gold focus-visible:text-gold ` +
          `hover:drop-shadow-[0_0_8px_var(--gold-40)] ` +
          `focus-visible:drop-shadow-[0_0_8px_var(--gold-40)] ` +
          `group-hover:translate-y-0 group-focus-within:translate-y-0 ` +
          `group-data-[busy]:translate-y-0 ` +
          `disabled:cursor-not-allowed disabled:opacity-40 ` +
          `motion-safe:transition-[translate,opacity,color,filter] ` +
          `motion-safe:duration-[180ms] motion-safe:ease-out ` +
          (up ? "translate-y-[18px]" : "-translate-y-[18px]")
        }
      >
        <svg
          viewBox="0 0 22 14"
          className="h-[14px] w-[22px] fill-gold/15 stroke-current"
          strokeWidth="1.25"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* The same curve read both ways; the sweep flag decides which side
              of the chord it bulges towards. */}
          <path
            d={
              up
                ? "M 3 12.58 A 21 21 0 0 1 19 12.58 L 11 1.75 Z"
                : "M 3 1.42 A 21 21 0 0 0 19 1.42 L 11 12.25 Z"
            }
          />
        </svg>
      </button>
    </span>
  );
}
