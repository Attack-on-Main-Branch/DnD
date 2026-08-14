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
        {hint && <span className="text-xs text-ink/50">{hint}</span>}
      </div>

      {/*
        `scroll-gold` belongs on the textarea itself rather than in
        `controlClasses`: that constant is shared with the single-line input
        and the select's trigger button, neither of which ever scrolls.

        Same class the race menu's popup uses, so the two match — which in
        Chromium means a thin gold-on-transparent bar. Since Chrome 121,
        setting `scrollbar-color` opts the element out of the older
        ::-webkit-scrollbar styling, so the 8px rounded thumb in that rule now
        only appears in Safari. The race menu is under the identical rule, so
        they still agree with each other everywhere.
      */}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={controlClasses({
          invalid,
          className: ["scroll-gold resize-y", className]
            .filter(Boolean)
            .join(" "),
        })}
        {...props}
      />
    </div>
  );
}
