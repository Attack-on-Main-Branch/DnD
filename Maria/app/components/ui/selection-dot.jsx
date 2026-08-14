/**
 * The small circle in the top-right corner of a choosable card, saying whether
 * this is the one that is chosen.
 *
 * These cards already show selection with a gold rim and a tint, which is a
 * difference in colour alone. The dot adds a difference in shape and position,
 * so the answer to "which one is picked?" survives a monochrome display and
 * does not rest on telling two shades of a border apart.
 *
 * `aria-hidden` throughout: the real radio input inside the label carries the
 * checked state, and announcing a decorative circle after it would only repeat
 * what the control already said.
 */
export default function SelectionDot({ selected }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 size-3.5 shrink-0 rounded-full border transition duration-300 ${
        selected
          ? "border-gold bg-gold shadow-[0_0_10px_-1px_rgba(255,223,156,0.9)]"
          : "border-ink/25 bg-transparent"
      }`}
    />
  );
}
