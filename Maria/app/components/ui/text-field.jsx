"use client";

import { useId, useState } from "react";

import { controlClasses, LABEL_CLASSES } from "./field-styles";

/**
 * Labelled text input, with an optional show/hide toggle for passwords.
 */
export default function TextField({
  label,
  type = "text",
  revealable = false,
  invalid = false,
  inputRef,
  className = "",
  ...props
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  const canReveal = revealable && type === "password";
  const resolvedType = canReveal && revealed ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASSES}>
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={resolvedType}
          aria-invalid={invalid || undefined}
          className={controlClasses({
            invalid,
            className: [canReveal ? "pr-11" : "", className]
              .filter(Boolean)
              .join(" "),
          })}
          {...props}
        />

        {canReveal && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            // Focusable, deliberately. It used to carry tabIndex={-1} on the
            // grounds that a screen reader still reaches it in browse mode —
            // true, and beside the point. Someone using a keyboard without a
            // screen reader has no browse mode and no other way to reveal what
            // they typed, so the control simply did not exist for them.
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-ink/50 transition hover:text-ink"
          >
            <EyeIcon crossedOut={revealed} />
          </button>
        )}
      </div>
    </div>
  );
}

function EyeIcon({ crossedOut }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {crossedOut ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A9.3 9.3 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.2 3.9" />
          <path d="M6.4 8.1A16.7 16.7 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.6-.7" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3.2" />
        </>
      )}
    </svg>
  );
}
