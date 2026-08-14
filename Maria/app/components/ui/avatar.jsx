import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

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
 */
export default function Avatar({
  name,
  colorTheme,
  size = "md",
  className = "",
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold tracking-wide text-white ring-2 ring-white/20 ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${avatarColorClass(colorTheme)} ${className}`}
    >
      {characterInitials(name)}
    </span>
  );
}
