/**
 * One step up: Cinzel sets a smaller apparent size than a sans at the same
 * nominal one, so matching the old visual weight needs the number to go up.
 */
const SIZE_CLASSES = {
  /* The map's tokens: small enough that two side by side still leave the
     ground between them readable. */
  xs: "size-7 text-xs",
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
 * Takes the initials and the colour class ready-made rather than deriving them:
 * `components/` never imports from a route directory, or the primitive cannot
 * be reused outside the dashboard.
 *
 * `ring` is the pale edge that lifts a portrait off whatever it is standing on.
 * Off where the avatar IS an edge — a party pill's face sits flush in the
 * capsule's own outline, and a second ring inside it reads as two rims.
 */
export default function Avatar({
  initials,
  colorClass,
  size = "md",
  ring = true,
  className = "",
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold tracking-wide text-white ${
        ring ? "ring-2 ring-white/20" : ""
      } ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${colorClass} ${className}`}
    >
      {initials}
    </span>
  );
}
