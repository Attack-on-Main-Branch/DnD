/**
 * An eye, open or struck through. The password field's reveal button drew it
 * first; the table's veil switch says the same thing about a roll, so it is one
 * drawing in one place rather than two that drift.
 *
 * Outline and `currentColor`, unlike the solid marks around it — this one is a
 * state rather than a subject, and it reads at 12px where a filled shape does
 * not. `aria-hidden`: whatever holds it carries the name.
 */
export default function EyeIcon({ crossedOut = false, className = "size-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {crossedOut ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A9.3 9.3 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.2 3.9" />
          <path d="M6.4 8.1A16.7 16.7 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 3.6-.7" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3.2" />
        </>
      )}
    </svg>
  );
}
