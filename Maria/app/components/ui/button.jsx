/**
 * Central button styling. `buttonClasses` is exported separately because
 * non-button elements — Next's <Link>, a plain <a> — need the same look, and a
 * <button> inside an anchor is invalid HTML.
 *
 * No `backdrop-filter`: a button is under 48px tall, so the blur kernel is
 * wider than the element and averages to a flat tint, and buttons usually sit
 * inside a glass card, where a nested filter has an empty backdrop to sample.
 *
 * The focus ring comes from globals.css — a gold outline over an achromatic
 * casing, which carries the contrast, since gold alone measures 1.29:1 against
 * the brightest part of the plume. `box-shadow` is ONE property and utilities
 * sit in a later layer, so any `shadow-*` here replaces the casing wholesale.
 * Each shadow-carrying state therefore restates it, plus a compound
 * `hover:focus-visible:` for the overlap — the single variants tie on
 * specificity, so emit order would decide it otherwise.
 */

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 text-sm font-medium " +
  "transition select-none disabled:cursor-not-allowed disabled:opacity-50";

/** Padding lives in the variant: `link` and `ghost` are text, not slabs. */
const VARIANT_CLASSES = {
  /* A lit rim and a wash rather than a fill: a solid gold slab shouts on a
     page this dark. The display face is on this variant rather than in
     BASE_CLASSES, so the serif separates the primary action from the
     secondary and ghost controls beside it. */
  primary:
    "rounded-full px-5 py-2.5 border border-gold/45 bg-gold/15 text-gold font-display tracking-wide " +
    "shadow-[inset_0_1px_0_rgba(255,223,156,0.18)] " +
    "hover:border-gold/80 hover:bg-gold/25 " +
    "hover:shadow-[inset_0_1px_0_rgba(255,223,156,0.28),0_0_24px_-4px_rgba(255,223,156,0.5)] " +
    // Same shadows again, plus the ring casing this variant would otherwise
    // overwrite. Resting and hovered are separate because they differ.
    "focus-visible:shadow-[inset_0_1px_0_rgba(255,223,156,0.18),0_0_0_6px_rgba(10,8,6,0.9)] " +
    "hover:focus-visible:shadow-[inset_0_1px_0_rgba(255,223,156,0.28),0_0_24px_-4px_rgba(255,223,156,0.5),0_0_0_6px_rgba(10,8,6,0.9)]",

  secondary:
    "rounded-full px-4 py-2 border border-gold/20 bg-surface/70 text-ink/90 " +
    "hover:border-gold/60 hover:text-gold " +
    "hover:shadow-[0_0_20px_-6px_rgba(255,223,156,0.45)] " +
    // Only the hovered state needs restating here: at rest this variant sets no
    // shadow at all, so the base rule's casing reaches it untouched.
    "hover:focus-visible:shadow-[0_0_20px_-6px_rgba(255,223,156,0.45),0_0_0_6px_rgba(10,8,6,0.9)]",

  ghost: "rounded-full px-3 py-2 text-ink/60 hover:text-gold hover:bg-gold/10",

  danger:
    "rounded-full px-4 py-2 border border-red-400/40 bg-red-500/15 text-red-200 " +
    "hover:border-red-400/70 hover:bg-red-500/25 hover:text-red-100",

  link: "rounded-sm text-gold underline underline-offset-4 hover:text-ink",
};

export function buttonClasses({
  variant = "primary",
  fullWidth = false,
  className = "",
} = {}) {
  return [
    BASE_CLASSES,
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * `type` defaults to "button" rather than the HTML default of "submit", so a
 * button dropped into a form cannot submit it by accident. Submit buttons opt
 * in explicitly with `type="submit"`.
 */
export default function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, fullWidth, className })}
      {...props}
    />
  );
}
