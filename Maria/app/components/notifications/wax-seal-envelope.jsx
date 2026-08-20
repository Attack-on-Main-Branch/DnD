/**
 * A folded parchment envelope closed with a blob of wax — the mark on the
 * notification trigger.
 *
 * The parchment is drawn in `currentColor` so the whole envelope tracks the
 * button's text colour and lights up with it on hover; only the wax has a
 * colour of its own, and that comes from the `--color-ruby` and `--color-gold`
 * tokens by way of Tailwind's `fill-*` utilities rather than a literal.
 *
 * `aria-hidden`, always: the button around it carries the name, and that name
 * has to include the unread count, which a title inside the drawing cannot.
 */
export default function WaxSealEnvelope({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* The body, with the barest wash of the ink colour so it reads as paper
          rather than as an outline. */}
      <rect
        x="3.4"
        y="7.4"
        width="25.2"
        height="17.2"
        rx="2.4"
        fill="currentColor"
        fillOpacity="0.09"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="1.5"
      />

      {/* The flap, folded down to the middle. */}
      <path
        d="M4.6 8.6 16 17.3 27.4 8.6"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The two creases running back out to the bottom corners. Fainter, so
          the flap stays the line the eye follows. */}
      <path
        d="M4.6 23.4 12.4 16.4M27.4 23.4 19.6 16.4"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* The wax: a blob over the seam, one drip escaping down the right, and a
          pressed star where the signet went in.

          Deliberately small against the envelope — a seal is a dab of wax over
          a join, and at any larger a radius it stopped reading as a seal and
          started reading as a badge stuck on the front.

          Sat on the seam: the flap comes to its point at y=17.3, and the wax
          goes where the join is. Move the circle and the drip and the star go
          with it — all three are one blob and share its centre. */}
      <path
        d="M18.6 18.7c.8.4 1.1 1.2.6 1.7-.4.6-1.3.6-1.7 0"
        className="fill-ruby"
        fillOpacity="0.75"
      />
      <circle
        cx="16"
        cy="17"
        r="3.4"
        className="fill-ruby stroke-gold/70"
        strokeWidth="0.9"
      />
      <path
        d="M16 15.1 16.7 16.3 18.2 17 16.7 17.7 16 18.9 15.3 17.7 13.8 17 15.3 16.3Z"
        className="fill-gold"
        fillOpacity="0.85"
      />
    </svg>
  );
}
