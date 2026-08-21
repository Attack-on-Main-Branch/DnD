/**
 * A globe ruled with meridians and parallels — the third mark above the map.
 * Built to the same rules as the scroll and the pack: outline, `currentColor`,
 * and as few lines as carry the shape at 36px. Two parallels and one curved
 * meridian; a full grid of them closed into a hatched disc at that size.
 */
export default function WorldGlobe({ className = "" }) {
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
      {/* The world's edge. */}
      <circle cx="16" cy="16" r="12.6" />

      {/* The meridian seen side-on, which is what makes the disc a sphere. */}
      <ellipse cx="16" cy="16" rx="5.4" ry="12.6" />

      {/* The equator and the axis. */}
      <path d="M3.4 16h25.2" />
      <path d="M16 3.4v25.2" />

      {/* One parallel either side of the equator. Chords, so they stop at the
          edge rather than running past it. */}
      <path d="M6.3 8.5h19.4M6.3 23.5h19.4" />
    </svg>
  );
}
