/**
 * A folded map — the mark on the rail above the chest, built to the rule the
 * chest, the scroll and the dice follow: solid artwork filled with
 * `currentColor` and nothing behind the strokes.
 *
 * A component and not a file under `public/`, like every other mark here: a
 * file cannot take `currentColor`, so it could not answer the rail's hover.
 */
export default function MapMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* The fold pattern a map keeps once it has been opened. */}
      <path d="M8 26 L35 16 L65 30 L92 20 L92 74 L65 84 L35 70 L8 80 Z" />

      {/* The folds, shorter than the panels, or it reads as three cards. */}
      <path d="M35 16 L35 70" />
      <path d="M65 30 L65 84" />

      {/* The road across it. */}
      <path
        d="M22 62 C34 48, 44 58, 52 46 C58 37, 70 42, 80 34"
        strokeWidth="4"
        strokeDasharray="7 7"
      />
    </svg>
  );
}
