/**
 * A chess pawn — the mark for the Dungeon Master's hand of pieces, built to the
 * rule the chest, the cogs and the blades follow: solid artwork filled with
 * `currentColor` and nothing behind it. `fillRule` is the source's own: the
 * collar and the base are separate rings, and `evenodd` keeps them apart.
 *
 * Derived from `/assets/icons/token.svg`, which is not committed. Its viewBox
 * is already the drawing's bounds.
 */
export default function TokensMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 104.38 122.88"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      className={className}
    >
      <path d="M35.73,32.57a20.45,20.45,0,1,1,32.91,0Zm35.06,3.88a7.1,7.1,0,0,1,6.17,7h0a7.11,7.11,0,0,1-6.61,7.06H34a7.1,7.1,0,0,1-6.6-7.06h0a7.1,7.1,0,0,1,6.17-7ZM63.33,54.4c.91,14.57,6,26.07,18.75,31.85V91.6H22.3V86.25c12-3.8,17.68-15,18.73-31.85ZM82.39,95.45a14.39,14.39,0,0,1,12.67,14.23v.22H9.32v-.22A14.39,14.39,0,0,1,22,95.45l.31,0H82.08l.31,0ZM94.9,113.77a12,12,0,0,1,9.48,9.11H0a12,12,0,0,1,9.47-9.11Z" />
    </svg>
  );
}
