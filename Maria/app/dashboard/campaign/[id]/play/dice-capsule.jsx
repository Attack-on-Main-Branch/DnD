"use client";

import { surfaceClasses } from "@/app/components/ui/surface";

import { diceCast, rollSentence } from "./dice-presentation";
import { HEAD_OF_TABLE, useDiceTable } from "./dice-table";

/**
 * What came up, beside the card of whoever rolled it — anybody at the table,
 * not only this browser. It slides out from under that card to the left and
 * slips back under when it is done; see `.dice-capsule` in globals.css for
 * both halves.
 *
 * One of these hangs on every card and each answers for its own character
 * alone, so a roll off the wire naming somebody who is not in this party
 * reaches nothing. A kept roll never arrives here at all — it is not on the
 * wire, so only the browser that made it has one to show.
 *
 * On the page from the first paint and empty until there is something to say:
 * rendered only when a result exists, it would arrive already at full strength
 * — an element cannot transition from a state it was never in.
 *
 * `variant: "solid"` and not glass: this comes out over the board, and a
 * translucent pill had the map reading straight through the number.
 */
export default function DiceCapsule({ characterId = null }) {
  const { results } = useDiceTable();

  const result = results[characterId ?? HEAD_OF_TABLE] ?? null;

  return (
    <span
      aria-hidden="true"
      className="dice-slot pointer-events-none absolute top-1/2 right-full z-10 -translate-y-1/2"
    >
      <span
        style={diceCast(result?.secret).style}
        data-away={!result || result.away ? "" : undefined}
        className={surfaceClasses({
          variant: "solid",
          className:
            "dice-capsule glass-unfiltered block rounded-full px-5 py-2 " +
            "border-(--cast-line) " +
            "shadow-[inset_0_1px_0_var(--cast-wash),0_0_32px_-8px_var(--cast-bloom),0_18px_44px_-20px_rgba(0,0,0,0.95)]",
        })}
      >
        <p className="font-display text-base font-semibold tracking-wide whitespace-nowrap text-(--cast-ink)">
          {result && rollSentence(result)}
        </p>
      </span>
    </span>
  );
}
