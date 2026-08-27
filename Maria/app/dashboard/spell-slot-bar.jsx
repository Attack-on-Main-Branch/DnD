import { COIN_PANEL_CLASSES } from "./currency-presentation";
import { slotClusterLabel, slotPipClasses } from "./spell-presentation";

/**
 * The slot bar: one cluster per slot level the class and the rung grant, in the
 * purse's own box. A 5th-level Fighter gets no bar at all, which is what the
 * empty shelf list means — the caller draws nothing rather than an empty box.
 *
 * A READ-OUT BY DEFAULT, and that is the honest default: slots leave by being
 * cast and come back from the head of the table, and `restore_spell_slot`
 * refuses an owner outright. `renderPip` is how the Dungeon Master's chair puts
 * a real `<button>` in each socket — see play/spell-slot-tracker.jsx, which is
 * the only caller that passes one.
 *
 * No hooks and no `"use client"`: the character sheet renders this on the
 * server, and the tracker wraps it in the browser's own copy of the figures.
 */
export default function SpellSlotBar({ shelves, className = "", renderPip }) {
  const left = shelves.reduce((total, shelf) => total + shelf.remaining, 0);

  return (
    <section
      aria-label="Spell slots"
      className={`${COIN_PANEL_CLASSES} ${className}`}
    >
      <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
        Slots
        <span className="ml-2 text-gold/80 tabular-nums">{left}</span> left
      </h3>

      <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {shelves.map((shelf) => (
          <li key={shelf.level} className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-ink/50 tabular-nums">
              {slotClusterLabel(shelf.level)}
            </span>

            <span className="flex items-center gap-1">
              {Array.from({ length: shelf.max }, (_, index) =>
                renderPip ? (
                  renderPip(shelf, index)
                ) : (
                  <span
                    key={index}
                    aria-hidden="true"
                    // Full-first, so the row empties from the right.
                    className={slotPipClasses(index < shelf.remaining)}
                  />
                ),
              )}
            </span>

            <span className="sr-only">
              {shelf.remaining} of {shelf.max} remaining
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
