/**
 * Shared chrome for every form control, so a text input, a select and a
 * textarea are visually the same object. Components use these, screens use the
 * components.
 *
 * A flat tint rather than `backdrop-filter`: controls are ~40px tall, so the
 * blur kernel is wider than the element, and they sit inside cards that already
 * carry the filter.
 *
 * `outline-none` in BASE is deliberate, not an oversight — a field draws its
 * own focus state. The app-wide ring sits at `outline-offset: 2px`, which on a
 * field lands outside a border that is already lighting up, giving three
 * concentric edges where the design has one.
 */

const BASE =
  "w-full rounded-lg border bg-surface/30 px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink/35 outline-none transition duration-300 " +
  "disabled:opacity-50";

/** The one invalid red, for controls that want the colour without the field. */
export const INVALID_BORDER_CLASSES = "border-red-400/60";

const BORDER = {
  valid:
    "border-gold/20 hover:border-gold/35 focus:border-gold/70 " +
    "focus:shadow-[0_0_0_1px_rgba(255,223,156,0.25),0_0_22px_-6px_rgba(255,223,156,0.55)]",
  invalid:
    `${INVALID_BORDER_CLASSES} focus:border-red-400 ` +
    "focus:shadow-[0_0_20px_-6px_rgba(248,113,113,0.55)]",
};

export function controlClasses({ invalid = false, className = "" } = {}) {
  return [BASE, invalid ? BORDER.invalid : BORDER.valid, className]
    .filter(Boolean)
    .join(" ");
}

export const LABEL_CLASSES =
  "font-display text-sm font-medium tracking-wide text-ink/85";

/**
 * Focus chrome for a <label> standing in for an `sr-only` radio. The real input
 * is clipped to a 1px box, so the app-wide ring lands somewhere invisible and
 * these are the ONLY focus indicator those controls have.
 */
export const CHOICE_CARD_FOCUS_CLASSES =
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 " +
  "has-focus-visible:outline-gold";

/** The invalid state for a radio *group*, the counterpart to `BORDER.invalid`. */
export const INVALID_GROUP_CLASSES = "ring-2 ring-red-500/40";

/**
 * How tall a six-row prose field stands, for the drop zones under the campaign
 * sheet's world lore to match it: six lines of `text-sm` at its 1.25rem
 * line-height, plus BASE's `py-2` and the 1px rim on each edge. 138px.
 *
 * A MEASUREMENT AND NOT A GUESS, which is why it is here rather than written
 * out at each zone — change the field's padding or type scale and this is the
 * one place that has to follow. A literal, or Tailwind's scanner never sees it.
 */
export const PROSE_FIELD_HEIGHT_CLASS = "min-h-[138px]";
