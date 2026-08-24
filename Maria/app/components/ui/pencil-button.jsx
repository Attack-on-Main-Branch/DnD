"use client";

import PencilIcon from "./pencil-icon";

/**
 * The pen in the corner of a sheet — one component, so the character's and the
 * campaign's cannot drift apart.
 *
 * No plate behind it: a bordered disc read as a control among the tabs beside
 * it. The mark alone lights gold, by `drop-shadow` rather than `box-shadow` so
 * what glows is the pen and not a ring around it — and with no box-shadow of
 * its own, the app-wide focus ring lands intact with nothing here to restate.
 *
 * `onPrepare` fires as a pointer or the keyboard reaches the button. The sheet
 * behind it is loaded on demand, and this is the head start that makes the
 * press open something rather than go and fetch it.
 */
export default function PencilButton({
  label,
  onClick,
  onPrepare = null,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onPrepare ?? undefined}
      onFocus={onPrepare ?? undefined}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        "grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg " +
        "text-ink/70 transition duration-300 " +
        "hover:text-gold hover:drop-shadow-[0_0_8px_rgba(255,223,156,0.35)] " +
        "focus-visible:text-gold " +
        "disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <PencilIcon className="size-5" />
    </button>
  );
}
