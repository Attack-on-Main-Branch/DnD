/**
 * A pack with its flap and a front pocket — the mark on the inventory control,
 * and the parchment scroll's neighbour. Built to the same rules: outline,
 * `currentColor`, and as few strokes as carry the shape at 36px. The loop at
 * the top is small on purpose — larger, the whole thing reads as a padlock.
 */
export default function TravellingPack({ className = "" }) {
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
      {/* The body: a rounded shoulder above, square-ish below. */}
      <path d="M6.5 14a6.5 6.5 0 0 1 6.5-6.5h6A6.5 6.5 0 0 1 25.5 14v8.5a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5Z" />

      {/* The carrying loop. */}
      <path d="M12.5 7.6V6.4a3.5 3.5 0 0 1 7 0v1.2" />

      {/* The flap's edge, and the pocket under it. */}
      <path d="M6.6 17h18.8" />
      <rect x="12.8" y="19.6" width="6.4" height="4.8" rx="1.6" />
    </svg>
  );
}
