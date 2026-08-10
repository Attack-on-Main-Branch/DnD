/**
 * Central error banner for forms. `role="alert"` makes a screen reader
 * announce the message as soon as it appears, without moving focus.
 *
 * Renders nothing when there is no message, so callers can pass a possibly
 * undefined value straight through.
 */
export default function FormAlert({ id, children }) {
  if (!children) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
    >
      {children}
    </p>
  );
}
