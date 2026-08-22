"use client";

import { useState } from "react";

import { controlClasses } from "./field-styles";

/**
 * The two halves of a stepper, lifted out of play/health-strip.jsx — which is
 * where these classes were written and which still uses them, so the pack's
 * steppers and the hit-point one cannot drift apart.
 */
export function StepButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-gold/20 bg-surface/30 text-lg leading-none text-ink/70 transition-colors duration-300 hover:border-gold/45 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
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
