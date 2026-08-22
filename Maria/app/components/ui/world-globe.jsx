/**
 * A globe ruled with meridians and parallels — the third mark above the map.
 * Built to the same rule as the scroll and the pack: solid artwork filled with
 * `currentColor`.
 *
 * Derived from the source file in the repository's own `/assets/icons`, which
 * is not committed. See dice-glyphs.jsx for the rest of the set.
 */
export default function WorldGlobe({ className = "" }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
        <path
          d="M 45 90 C 20.187 90 0 69.813 0 45 C 0 20.187 20.187 0 45 0 c 24.813 0 45 20.187 45 45 C 90 69.813 69.813 90 45 90 z M 45 4 C 22.393 4 4 22.393 4 45 s 18.393 41 41 41 s 41 -18.393 41 -41 S 67.607 4 45 4 z"
          transform="matrix(1 0 0 1 0 0)"
        />
        <path
          d="M 45 90 c -1.104 0 -2 -0.896 -2 -2 V 2 c 0 -1.104 0.896 -2 2 -2 s 2 0.896 2 2 v 86 C 47 89.104 46.104 90 45 90 z"
          transform="matrix(1 0 0 1 0 0)"
        />
        <path
          d="M 45 90 c -13.622 0 -24.292 -19.767 -24.292 -45 c 0 -25.234 10.67 -45 24.292 -45 s 24.293 19.766 24.293 45 C 69.293 70.233 58.622 90 45 90 z M 45 4 C 34 4 24.708 22.776 24.708 45 C 24.708 67.225 34 86 45 86 c 11 0 20.293 -18.775 20.293 -41 C 65.293 22.776 56 4 45 4 z"
          transform="matrix(1 0 0 1 0 0)"
        />
        <path
          d="M 84.861 63.127 H 5.131 c -1.104 0 -2 -0.896 -2 -2 s 0.896 -2 2 -2 h 79.73 c 1.104 0 2 0.896 2 2 S 85.966 63.127 84.861 63.127 z"
          transform="matrix(1 0 0 1 0 0)"
        />
        <path
          d="M 84.867 30.873 H 5.137 c -1.104 0 -2 -0.896 -2 -2 s 0.896 -2 2 -2 h 79.73 c 1.104 0 2 0.896 2 2 S 85.972 30.873 84.867 30.873 z"
          transform="matrix(1 0 0 1 0 0)"
        />
      </g>
    </svg>
  );
}
