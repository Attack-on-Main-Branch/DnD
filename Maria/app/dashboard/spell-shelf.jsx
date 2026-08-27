/**
 * One shelf of a spellbook: the level's heading, and the rows under it.
 *
 * A heading rather than a tab strip, because a caster reads DOWN their list and
 * a tab would hide five shelves to show one. Shared by both drawers and by the
 * Spells tab on a character sheet; the rows arrive as children, since what can
 * be done to a spell differs and where it sits does not.
 */
export default function Shelf({ label, count, children }) {
  return (
    <section aria-label={label} className="mt-4">
      <div className="flex items-baseline gap-2">
        <h3 className="shrink-0 font-display text-xs font-semibold tracking-[0.16em] text-gold/80 uppercase">
          {label}
        </h3>

        <span className="shrink-0 font-mono text-[10px] text-ink/40 tabular-nums">
          {count}
        </span>

        <span
          aria-hidden="true"
          className="h-px flex-1 bg-linear-to-r from-gold/35 to-transparent"
        />
      </div>

      {/* Three across, so a full book is a page to scan and not a column. */}
      <ul className="mt-2.5 grid grid-cols-3 gap-2">{children}</ul>
    </section>
  );
}
