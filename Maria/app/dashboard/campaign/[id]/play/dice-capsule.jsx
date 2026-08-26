"use client";

import { surfaceClasses } from "@/app/components/ui/surface";

import DieGlyph from "./dice-glyphs";
import { diceCast, ROLLING_LABEL, rollSentence } from "./dice-presentation";
import { HEAD_OF_TABLE, useDiceTable } from "./dice-table";

/**
 * What is being rolled and what came up, beside the card of whoever is rolling
 * it — anybody at the table, not only this browser. It slides out from under
 * that card to the left and slips back under when it is done; see
 * `.dice-capsule` in globals.css for both halves.
 *
 * `under` turns that quarter round for the ONE chair with no card: the head of
 * the table's comes out from under the board they threw onto. Same mechanism
 * either way — a slot that clips, and a pill that travels out of it.
 *
 * It comes out as the die leaves the hand rather than as it lands: a table
 * watching a board light up with nothing beside it could not tell whose roll it
 * was. The same pill then takes the number, so the announcement and the answer
 * are one object rather than two.
 *
 * One of these hangs on every card and each answers for its own character
 * alone, so a roll off the wire naming somebody who is not in this party
 * reaches nothing. A kept roll never arrives here at all — it is not on the
 * wire, so only the browser that made it has one to show. That a roll is
 * HAPPENING is on the wire even when kept, and then the pill says so without a
 * die beside it.
 *
 * On the page from the first paint and empty until there is something to say:
 * rendered only when a result exists, it would arrive already at full strength
 * — an element cannot transition from a state it was never in.
 *
 * `variant: "solid"` and not glass: this comes out over the board, and a
 * translucent pill had the map reading straight through the number.
 */
export default function DiceCapsule({ characterId = null, under = false }) {
  const { flying, results } = useDiceTable();

  const key = characterId ?? HEAD_OF_TABLE;
  const flight = flying[key] ?? null;
  const result = results[key] ?? null;

  // A die in the air speaks over the last number this chair rolled, which is
  // very likely still standing beside it.
  const die = flight ? flight.die : result?.die;
  const away = flight ? false : !result || result.away;

  return (
    <span
      aria-hidden="true"
      className={
        under
          ? "dice-slot-under pointer-events-none absolute top-full left-1/2 z-10 -translate-x-1/2"
          : "dice-slot pointer-events-none absolute top-1/2 right-full z-10 -translate-y-1/2"
      }
    >
      <span
        style={diceCast(flight ? flight.secret : result?.secret).style}
        data-away={away ? "" : undefined}
        className={surfaceClasses({
          variant: "solid",
          className:
            "dice-capsule glass-unfiltered block rounded-full px-5 py-2 " +
            (under ? "dice-capsule-under " : "") +
            "border-(--cast-line) " +
            "shadow-[inset_0_1px_0_var(--cast-wash),0_0_32px_-8px_var(--cast-bloom),0_18px_44px_-20px_rgba(0,0,0,0.95)]",
        })}
      >
        <p className="flex items-center gap-2 font-display text-base font-semibold tracking-wide whitespace-nowrap text-(--cast-ink)">
          {die && <DieGlyph die={die} className="size-5 shrink-0" />}
          {/* How many of that one glyph are on their way. A landed roll says it
              in the sentence instead — "3d6 ➔ 14". */}
          {flight?.count > 1 && <span>×{flight.count}</span>}
          {flight ? ROLLING_LABEL : result && rollSentence(result)}
        </p>
      </span>
    </span>
  );
}
