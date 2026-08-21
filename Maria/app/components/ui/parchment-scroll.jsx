/**
 * A parchment on its rods — the mark on the notes control at the table.
 * Outline and `currentColor` throughout, so it tracks the button's text colour.
 * Four lines of writing and not six: past four they close up into a grey block
 * at the size this is used. `aria-hidden`: the button carries the name.
 */
export default function ParchmentScroll({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* The upper rod, and the ends of it. */}
      <rect x="6" y="3.2" width="20" height="5" rx="2.2" />
      <path d="M3.6 5.7h2.4M26 5.7h2.4" />

      {/* The sheet's two sides. Its top and bottom are the rods. */}
      <path d="M9 8.2v15.6M23 8.2v15.6" />

      {/* The writing. Thinner than the outline, so the shape stays the thing
          the eye reads first. */}
      <path
        d="M11.8 11.4h8.4M11.8 14.4h8.4M11.8 17.4h8.4M11.8 20.4h8.4"
        strokeWidth="1.5"
      />

      {/* The lower rod. */}
      <rect x="6" y="23.8" width="20" height="5" rx="2.2" />
      <path d="M3.6 26.3h2.4M26 26.3h2.4" />
    </svg>
  );
}
