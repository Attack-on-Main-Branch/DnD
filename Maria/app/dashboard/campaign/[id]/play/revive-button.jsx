"use client";

import { ButtonContent } from "@/app/components/ui/button";
import { reviveDownedCharacter } from "./actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

export const CONDITION_BUTTON_CLASSES =
  "inline-flex min-h-8 cursor-pointer items-center justify-center rounded-lg border bg-transparent px-2.5 py-1.5 font-display text-xs font-semibold tracking-[0.16em] uppercase shadow-[0_0_0_1px_var(--color-surface)] backdrop-blur-xs transition duration-300 focus-visible:shadow-[0_0_0_6px_var(--color-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-65";

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
export default function ReviveButton({
  campaignId,
  characterId,
  name,
  busy,
  setBusy,
}) {
  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  function revive() {
    if (busy) {
      return;
    }

    setBusy(true);

    run({
      paint: () =>
        store.setCondition(characterId, {
          hitPoints: 1,
          isDead: false,
          deathSaves: { successes: 0, failures: 0 },
        }),

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
    <button
      type="button"
      onClick={revive}
      disabled={busy}
      aria-label={`Revive ${name} at one hit point`}
      className={`${CONDITION_BUTTON_CLASSES} w-full border-emerald-400 text-emerald-200 hover:bg-emerald-400/15 focus-visible:outline-emerald-400/70`}
    >
      <ButtonContent>Revive</ButtonContent>
    </button>
  );
}
