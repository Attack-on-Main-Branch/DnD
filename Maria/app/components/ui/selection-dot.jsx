/**
 * The circle in a choosable card's corner. The cards already show selection
 * with a gold rim and a tint, which is a difference in colour alone; the dot
 * adds shape and position, so the answer survives a monochrome display.
 *
 * `aria-hidden`: the radio input inside the label carries the checked state.
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
