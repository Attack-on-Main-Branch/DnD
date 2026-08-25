"use client";

import { CHOICE_CARD_FOCUS_CLASSES } from "./field-styles";
import { NESTED_CARD_CLASSES, NESTED_CARD_SELECTED_CLASSES } from "./surface";

/**
 * A labelled yes-or-no, drawn as the skill grid's choice cards are: the input
 * clipped to a 1px box and `CHOICE_CARD_FOCUS_CLASSES` standing in for the
 * app-wide ring, which would otherwise land somewhere invisible.
 *
 * A card and not a native checkbox for the reason SelectMenu exists: the browser
 * paints its own box in the OS palette, white on a page this dark.
 */
export default function CheckField({ label, checked, onChange, disabled }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition duration-300 has-disabled:cursor-not-allowed has-disabled:opacity-50 ${CHOICE_CARD_FOCUS_CLASSES} ${
        checked ? NESTED_CARD_SELECTED_CLASSES : NESTED_CARD_CLASSES
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />

      {/* Drawn rather than typed: a glyph sits a pixel low in a box this small. */}
      <span
        aria-hidden="true"
        className={`grid size-4 shrink-0 place-items-center rounded-sm border transition duration-300 ${
          checked ? "border-gold/70 bg-gold/20" : "border-gold/30"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 text-gold"
          >
            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
          </svg>
        )}
      </span>

      <span
        className={`font-display text-sm tracking-wide transition-colors duration-300 ${
          checked ? "text-gold" : "text-ink/85"
        }`}
      >
        {label}
      </span>
    </label>
  );
}
