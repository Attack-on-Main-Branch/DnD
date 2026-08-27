"use client";

import { useState } from "react";

import { reviveDownedCharacter } from "./actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * One hit point, and everything the card is wearing taken off with it.
 *
 * THE HEAD OF THE TABLE'S ALONE, and `revive_character` is where that is
 * decided rather than here: it asks `owns_campaign` instead of the predicate
 * every other deed at this card uses, so a player cannot undo their own death
 * by reaching PostgREST directly. The card only decides whether to draw it.
 *
 * Emerald, which at this table is the colour of a bar filling: the experience
 * bar wears it, and so does the rest that puts everybody back on their feet.
 */
export default function ReviveButton({ campaignId, characterId, name }) {
  const [busy, setBusy] = useState(false);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  function revive() {
    if (busy) {
      return;
    }

    setBusy(true);

    /* Painted on the press, unlike the death save beside it: this one cannot
       be refused by any rule the browser does not already know — the seat is
       the head of the table and the character is on the rail — so the card
       coming back at once is the answer, and a refusal puts it back. */
    store.setCondition(characterId, {
      hitPoints: 1,
      isDead: false,
      deathSaves: { successes: 0, failures: 0 },
    });

    run({
      work: () => reviveDownedCharacter(campaignId, characterId),

      tell: (result) => {
        store.setCondition(characterId, {
          hitPoints: result.hitPoints,
          isDead: result.isDead,
          deathSaves: result.deathSaves,
        });

        send({
          kind: "condition",
          characterId,
          hitPoints: result.hitPoints,
          isDead: result.isDead,
          successes: result.deathSaves.successes,
          failures: result.deathSaves.failures,
        });
      },

      want: { party: true, activity: true },
    }).finally(() => setBusy(false));
  }

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={revive}
        disabled={busy}
        aria-label={`Revive ${name} at one hit point`}
        className="w-full cursor-pointer rounded-lg border border-emerald-400 bg-emerald-500/20 px-3 py-1.5 font-display text-[11px] font-semibold tracking-[0.16em] text-emerald-300 uppercase transition duration-300 hover:bg-emerald-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Revive
      </button>
    </div>
  );
}
