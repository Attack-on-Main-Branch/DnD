import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

const SIZE_CLASSES = {
  sm: "size-10 text-sm",
  md: "size-14 text-lg",
  lg: "size-20 text-2xl",
};

/**
 * Initials on a solid colour, standing in for a portrait until characters can
 * carry a real image.
 *
 * `aria-hidden` because the character's name is always rendered next to it —
 * announcing "DV" before "Darth Vader" is noise, not information.
 */
export default function Avatar({ name, colorTheme, size = "md", className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide text-white ring-2 ring-white/20 ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${avatarColorClass(colorTheme)} ${className}`}
    >
      {characterInitials(name)}
    </span>
  );
}
