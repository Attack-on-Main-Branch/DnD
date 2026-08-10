"use client";

import { useId } from "react";

import { controlClasses, LABEL_CLASSES } from "./field-styles";

/**
 * Labelled <select>. `options` is a list of { value, label }; the order given
 * is the order shown, so callers control what sits at the top.
 */
export default function SelectField({
  label,
  options,
  invalid = false,
  className = "",
  ...props
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASSES}>
        {label}
      </label>

      <select
        id={id}
        aria-invalid={invalid || undefined}
        className={controlClasses({ invalid, className })}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
