"use client";

import { useState } from "react";

import { controlClasses } from "./field-styles";

/**
 * The two halves of a stepper. These classes were written for the health band
 * that used to run across the foot of the board; that band is gone and its bars
 * are inside the party cards now, but play/card-health.jsx still presses the
 * same two buttons — so the pack's steppers and the hit-point ones cannot drift
 * apart.
 */
/**
 * What the hover says. `danger` is the red the Retire button on a character card
 * wears, and it is here for the same reason: a warning at the moment it is one.
 *
 * Literal strings — a class built from a template is one the scanner never sees.
 */
const TONES = {
  gold: "hover:border-gold/45 hover:text-gold",
  danger: "hover:border-red-500 hover:text-red-500",
};

export function StepButton({
  onClick,
  disabled,
  label,
  wide = false,
  pill = false,
  tone = "gold",
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      /* `wide` carries a word rather than a sign, so it takes its width from
         the text; `pill` rounds it all the way, for the purse's Take and Grant,
         which stand among capsules and would be the only square thing there.
         Every half is written out for the scanner's sake. */
      className={
        `grid shrink-0 cursor-pointer place-items-center border ` +
        `${pill ? "rounded-full" : "rounded-lg"} ` +
        `border-gold/20 bg-surface/30 leading-none text-ink/70 ` +
        `transition-colors duration-300 ` +
        `${TONES[tone] ?? TONES.gold} ` +
        `disabled:cursor-not-allowed disabled:opacity-40 ` +
        (wide
          ? "h-9 px-3 font-display text-xs font-semibold tracking-wide"
          : "size-9 text-lg")
      }
    >
      {children}
    </button>
  );
}

/**
 * A whole number between `min` and `max`, with a button at either end.
 *
 * Controlled from outside but with a draft of its own: a field that wrote
 * straight through could not be emptied to retype, since the empty string
 * clamps to `min` and puts the old digit back under the cursor. `onChange` is
 * only ever handed a clamped number.
 *
 * The buttons commit at once — this is the control a Dungeon Master takes an
 * item away with, and a press that waited for a blur would read as broken.
 */
export default function QuantityStepper({
  value,
  min = 0,
  max,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  disabled = false,
}) {
  const [draft, setDraft] = useState(String(value));
  const [agreed, setAgreed] = useState(value);

  /* Adjusted DURING the render rather than in an effect: React re-runs this
     before touching the DOM, so the field never paints the old digit. `agreed`
     is what makes it a comparison rather than a loop — the draft is left alone
     on every render where `value` has not moved, which is every render while
     somebody is typing into it. */
  if (agreed !== value) {
    setAgreed(value);
    setDraft(String(value));
  }

  function clamp(number) {
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function commit(typed) {
    const number = Number(String(typed).trim());
    const next =
      Number.isFinite(number) && typed !== "" ? clamp(number) : value;

    setDraft(String(next));

    if (next !== value) {
      onChange(next);
    }
  }

  function nudge(by) {
    const next = clamp(value + by);

    if (next !== value) {
      onChange(next);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <StepButton
        onClick={() => nudge(-1)}
        disabled={disabled || value <= min}
        label={decreaseLabel}
      >
        −
      </StepButton>

      {/* The width is on the wrapper, not the input: `controlClasses` already
          carries `w-full`, and two width utilities on one element are settled
          by the order Tailwind emits them rather than the order written. */}
      <div className="w-16 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            }
          }}
          disabled={disabled}
          aria-label={label}
          className={controlClasses({
            className: "no-spin px-2 py-1.5 text-center tabular-nums",
          })}
        />
      </div>

      <StepButton
        onClick={() => nudge(1)}
        disabled={disabled || value >= max}
        label={increaseLabel}
      >
        +
      </StepButton>
    </div>
  );
}
