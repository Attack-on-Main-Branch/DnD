"use client";

import { useId, useState } from "react";

import EyeIcon from "./eye-icon";
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
            <EyeIcon crossedOut={revealed} className="size-[18px]" />
          </button>
        )}
      </div>
    </div>
  );
}
