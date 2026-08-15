/**
 * Central button styling for the whole app.
 *
 * Every button in the project should come from here so they stay visually
 * consistent and a change lands in one place. `buttonClasses` is exported
 * separately because elements that are not <button> — Next's <Link>, a plain
 * <a> — need the same look, and nesting a <button> inside an anchor is
 * invalid HTML.
 *
 * No `backdrop-filter` anywhere in here, deliberately. A button is under 48px
 * tall, and the glass blur radius has a kernel wider than that — every output
 * pixel would average the same neighbourhood and the result is a flat tint you
 * cannot tell from a solid fill. Buttons also usually sit inside a glass card,
 * and filtered-inside-filtered has an empty backdrop to sample. Both point the
 * same way: solid fills here, real glass on the few large surfaces.
 *
 * The focus ring is not declared per variant either — globals.css carries one
 * two-tone ring for the whole app, at zero specificity so a variant can still
 * override it if it ever needs to.
 */

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 text-sm font-medium " +
  "transition select-none disabled:cursor-not-allowed disabled:opacity-50";

/** Padding lives in the variant: `link` and `ghost` are text, not slabs. */
const VARIANT_CLASSES = {
  /* The gold is a lit rim and a wash, not a fill — a solid gold slab would
     shout louder than anything else on a page this dark.

     The display face is on this variant rather than in BASE_CLASSES: primary
     is the one action a screen is asking for, and the serif is what separates
     it from the row of secondary and ghost controls beside it. That also keeps
     the two auth submits — Sign In and Sign Up — matching each other. */
  primary:
    "rounded-full px-5 py-2.5 border border-gold/45 bg-gold/15 text-gold font-display tracking-wide " +
    "shadow-[inset_0_1px_0_rgba(255,223,156,0.18)] " +
    "hover:border-gold/80 hover:bg-gold/25 " +
    "hover:shadow-[inset_0_1px_0_rgba(255,223,156,0.28),0_0_24px_-4px_rgba(255,223,156,0.5)]",

  secondary:
    "rounded-full px-4 py-2 border border-gold/20 bg-surface/70 text-ink/90 " +
    "hover:border-gold/60 hover:text-gold " +
    "hover:shadow-[0_0_20px_-6px_rgba(255,223,156,0.45)]",

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
