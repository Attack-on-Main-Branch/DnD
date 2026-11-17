import SpellRow from "./spell-row";

export default function SpellShelves({ shelves, openSlug, onOpen }) {
  return shelves.map(({ level, label, spells }) => (
    <section key={level} aria-label={label} className="mt-4">
      <div className="flex items-baseline gap-2">
        <h3 className="shrink-0 font-display text-xs font-semibold tracking-[0.16em] text-gold/80 uppercase">
          {label}
        </h3>
        <span className="shrink-0 font-mono text-[0.625rem] text-ink/40 tabular-nums">
          {spells.length}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-linear-to-r from-gold/35 to-transparent"
        />
      </div>

      <ul className="mt-2.5 grid grid-cols-2 gap-2">
        {spells.map((spell) => (
          <li key={spell.slug} className="flex">
            <SpellRow
              spell={spell}
              open={openSlug === spell.slug}
              onOpen={() => onOpen(spell)}
            />
          </li>
        ))}
      </ul>
    </section>
  ));
}
