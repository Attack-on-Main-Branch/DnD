"use client";

import { useId } from "react";

import { controlClasses, LABEL_CLASSES } from "./field-styles";

/** Labelled multi-line input, for the longer prose fields. */
export default function TextAreaField({
  label,
  hint,
  invalid = false,
  rows = 4,
  className = "",
  ...props
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={LABEL_CLASSES}>
          {label}
        </label>
        {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      </div>

      <textarea
        id={id}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={controlClasses({
          invalid,
          className: ["resize-y", className].filter(Boolean).join(" "),
        })}
        {...props}
      />
    </div>
  );
}
