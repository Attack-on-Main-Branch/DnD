/**
 * Shared chrome for every form control, so a text input, a select and a
 * textarea are visually the same object. Imported by the field components in
 * this folder — components use these, screens use the components.
 *
 * A flat tint rather than `backdrop-filter`, on purpose. Controls are around
 * 40px tall and the glass blur has a kernel wider than that, so it would
 * average to a uniform colour anyway; and they sit inside cards that already
 * carry the filter, where a nested one has an empty backdrop to sample. The
 * look is identical and the compositor cost is nil.
 *
 * A field draws its OWN focus state and opts out of the app-wide ring — that is
 * what `outline-none` in BASE is for. A deliberate exception, not an oversight;
 * it was briefly removed on the theory that it was one.
 *
 * The global ring is a 2px gold outline at `outline-offset: 2px` over an
 * achromatic casing. On a button that is the whole indicator. On a field it
 * lands OUTSIDE a border that is already lighting up, giving three concentric
 * edges where the design has one. What a field does instead: the rim goes
 * `border-gold/20` to `border-gold/70` with a 1px ring and a 22px bloom behind.
 *
 * `surface` rather than `black` for the fill, per surface.js — about 4/255 off
 * the old `black/30`, which is why it looks identical.
 */

const BASE =
  "w-full rounded-lg border bg-surface/30 px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink/35 outline-none transition duration-300 " +
  "disabled:opacity-50";

const BORDER = {
  valid:
    "border-gold/20 hover:border-gold/35 focus:border-gold/70 " +
    "focus:shadow-[0_0_0_1px_rgba(255,223,156,0.25),0_0_22px_-6px_rgba(255,223,156,0.55)]",
  invalid:
    "border-red-400/60 focus:border-red-400 " +
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
 * these three utilities are the ONLY focus indicator those controls have —
 * which is why they are named here rather than retyped at each of the four
 * cards. Radius and padding stay at the call site; those differ per card shape.
 */
export const CHOICE_CARD_FOCUS_CLASSES =
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 " +
  "has-focus-visible:outline-gold";

/** The invalid state for a radio *group*, the counterpart to `BORDER.invalid`. */
export const INVALID_GROUP_CLASSES = "ring-2 ring-red-500/40";
