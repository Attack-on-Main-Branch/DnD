/**
 * The party's own piece: a pin stuck in the world, drawn on the board, in the
 * hand it is dealt from, and on the world map under the lore.
 *
 * Derived from `/assets/icons/location.svg`, which is not committed. The viewBox
 * is the DRAWING's bounds — the source hangs it in a taller canvas for a credit
 * line. Solid artwork filled with `currentColor`, as map-mark.jsx is.
 *
 * ITS GLOW IS A FILTER AND NOT A BOX-SHADOW — see `.party-mark` in globals.css.
 * An outer box-shadow is clipped to the border BOX, so on a drawing with no
 * background it draws a rectangle instead of following the outline.
 */
export default function PartyMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      className={`party-mark text-gold ${className}`}
    >
      {/* The teardrop, hollow: an outer contour and an inner one. */}
      <path d="M16,26c-0.317,0-0.615-0.15-0.803-0.404C14.862,25.145,7,14.477,7,9c0-4.962,4.038-9,9-9c4.963,0,9,4.038,9,9c0,5.477-7.862,16.145-8.197,16.596C16.615,25.85,16.317,26,16,26z M16,2c-3.86,0-7,3.14-7,7c0,3.575,4.493,10.717,7,14.288C18.507,19.716,23,12.572,23,9C23,5.14,19.859,2,16,2z" />

      {/* The ring inside it. */}
      <path d="M16,13c-2.206,0-4-1.794-4-4s1.794-4,4-4c2.206,0,4,1.794,4,4S18.206,13,16,13z M16,7c-1.103,0-2,0.897-2,2s0.897,2,2,2c1.103,0,2-0.897,2-2S17.103,7,16,7z" />

      {/* The ground it stands on, which is what stops it reading as a balloon. */}
      <path d="M16,32c-6.302,0-13-1.952-13-5.571c0-1.795,1.686-3.349,4.746-4.377c0.524-0.173,1.091,0.106,1.266,0.63c0.176,0.523-0.106,1.091-0.629,1.267C5.886,24.786,5,25.809,5,26.429C5,27.885,9.285,30,16,30s11-2.115,11-3.571c0-0.62-0.887-1.643-3.384-2.481c-0.523-0.177-0.806-0.743-0.63-1.267c0.177-0.523,0.744-0.804,1.267-0.63C27.314,23.08,29,24.635,29,26.429C29,30.048,22.302,32,16,32z" />
    </svg>
  );
}
