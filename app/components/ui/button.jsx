/**
 * Central button styling for the whole app.
 *
 * Every button in the project should come from here so they stay visually
 * consistent and a change lands in one place. `buttonClasses` is exported
 * separately because elements that are not <button> — Next's <Link>, a plain
 * <a> — need the same look, and nesting a <button> inside an anchor is
 * invalid HTML.
 */

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 text-sm font-semibold " +
  "transition select-none focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60";

/** Padding lives in the variant: `link` is inline text, not a hit target. */
const VARIANT_CLASSES = {
  primary: "rounded-lg px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500",
  secondary:
    "rounded-lg px-4 py-2.5 border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10",
  link: "rounded-sm text-indigo-600 underline underline-offset-4 hover:text-indigo-500 dark:text-indigo-400",
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
