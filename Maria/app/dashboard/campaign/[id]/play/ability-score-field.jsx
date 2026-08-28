"use client";

import { useState } from "react";
import { parseAbilityTotal } from "sina/rules/ability-scores";

import { useRouteRefresh } from "@/app/components/use-route-refresh";

import { setAbilityScore } from "./actions";
import { useTableDeed } from "./use-table-deed";

/**
 * One of the six scores as a field rather than a figure — the shield's
 * arrangement exactly, and armor-badge.jsx says why it is not a button.
 *
 * IT REFRESHES THE ROUTE, which almost nothing at this table does. A score is
 * the top of a tree — the modifier, the save, every skill that reads it,
 * passive perception, initiative, a caster's DC, and for Constitution the bar
 * the database recomputes in the same statement — and page.jsx prints all of
 * them on the server. The level award next door does the same for the same
 * reason. `sheet` on the wire is how the other chairs hear about it.
 */
export default function AbilityScoreField({
  campaignId,
  characterId,
  ability,
  name,
  total,
}) {
  const refresh = useRouteRefresh();
  const { run, send } = useTableDeed(campaignId);

  /** What is half-typed, and null whenever nothing is. */
  const [typed, setTyped] = useState(null);

  /* What the server took, held until the route render catches up: without it
     the figure flashes back to the old one for the length of the refresh.
     Reconciled during render, the way level-ring.jsx rides its number. */
  const [written, setWritten] = useState(null);
  const [agreed, setAgreed] = useState(total);

  if (agreed !== total) {
    setAgreed(total);
    setWritten(null);
  }

  const shown = written ?? total;

  function commit() {
    const next = parseAbilityTotal(typed);

    setTyped(null);

    if (next === null || next === shown) {
      return;
    }

    setWritten(next);

    run({
      work: () => setAbilityScore(campaignId, characterId, ability.id, next),

      tell: (result) => {
        // What LANDED: the subtraction runs against the row the database locks.
        setWritten(result.total);
        send({ kind: "sheet", characterId });
        refresh();
      },

      want: { party: true },
    });
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      value={typed ?? String(shown)}
      onChange={(event) => setTyped(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }

        /* Put back, and the caret left where it is. Blurring here would hand
           the half-typed figure to `commit` — this render's closure still holds
           it, whatever was just set. */
        if (event.key === "Escape") {
          event.preventDefault();
          setTyped(null);
        }
      }}
      aria-label={`${name} ${ability.name.toLowerCase()}`}
      className="no-spin w-10 shrink-0 border-none bg-transparent p-0 text-right font-display text-xl font-semibold text-ink shadow-none tabular-nums outline-none"
    />
  );
}
