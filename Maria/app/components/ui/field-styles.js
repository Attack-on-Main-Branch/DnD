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
 * No focus ring here either — globals.css carries one for the whole app. What
 * these add is the gold rim lighting up, which reads as the field waking.
 */

const BASE =
  "w-full rounded-lg border bg-black/30 px-3 py-2 text-sm text-ink " +
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
