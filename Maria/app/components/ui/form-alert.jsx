/**
 * Central feedback banner for forms. `role="alert"` makes a screen reader
 * announce the message as soon as it appears, without moving focus.
 *
 * Renders nothing when there is no message, so callers can pass a possibly
 * undefined value straight through.
 */

const TONE_CLASSES = {
  error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export default function FormAlert({ id, tone = "error", children }) {
  if (!children) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className={`rounded-lg border px-3 py-2 text-sm ${TONE_CLASSES[tone] ?? TONE_CLASSES.error}`}
    >
      {children}
    </p>
  );
}
