/**
 * One step up from the sizes that came before. Cinzel sets a smaller apparent
 * size than a sans at the same nominal one — its capitals are narrower and its
 * cap height sits lower in the em box — so matching the old visual weight
 * needs the number to go up, not just the family to change.
 */
const SIZE_CLASSES = {
  sm: "size-10 text-base",
  md: "size-14 text-xl",
  lg: "size-20 text-3xl",
};

/**
 * Initials on a solid colour, standing in for a portrait until characters can
 * carry a real image.
 *
 * `aria-hidden` because the character's name is always rendered next to it —
 * announcing "DV" before "Darth Vader" is noise, not information.
 *
 * Takes the initials and the colour class ready-made rather than deriving them.
 * It used to import both from `app/dashboard/character-presentation`, which made
 * this the one file in `components/ui/` reaching into a route folder — so a
 * primitive could not be reused outside the dashboard, and that route file could
 * not move without breaking it. The rule the rest of the folder follows:
 * `components/` never imports from a route directory.
 */
export default function Avatar({
  initials,
  colorClass,
  size = "md",
  className = "",
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold tracking-wide text-white ring-2 ring-white/20 ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${colorClass} ${className}`}
    >
      {initials}
    </span>
  );
}
