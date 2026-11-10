export default function LevelBadge({ children }) {
  return (
    <span
      aria-hidden="true"
      className="relative z-10 grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/30 bg-level font-display text-lg leading-none font-semibold text-gold tabular-nums"
    >
      {children}
    </span>
  );
}
