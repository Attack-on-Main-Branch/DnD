"use client";

import { useState } from "react";
import { DEATH_SAVE_DIE, DEATH_SAVE_TARGET } from "sina/rules/death";

import DieGlyph from "./dice-glyphs";
import { useDiceTable } from "./dice-table";
import { killCharacter, rollDeathSaveFor } from "./actions";
import { useDeathSaves, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * Three saves and three failures, in place of a bar that has nothing left to
 * draw. It stands where the hit points were the moment they reach zero and
 * leaves again the moment somebody is on their feet — see card-health.jsx,
 * which cross-fades the two.
 *
 * THE DIE IS THE TABLE'S. Pressing Roll throws the board's own d20, which every
 * chair sees land, and the face it comes to rest on is what travels to
 * `roll_death_save`. The rules are applied there and nowhere else: this
 * component paints the pip it expects and lays the answer over it, exactly as
 * the bar does with a hit point.
 *
 * IT IS A QUIET ROLL. The dice fly and the pill comes out from under the card,
 * but the log line is the database's — "rolled a 17 on a death save
 * (stabilised)" says everything a second `dice_roll` entry would.
 *
 * WHO ROLLS IS THE PLAYER, AND ONLY THE PLAYER. Those three saves are the one
 * thing a dying character still gets to do, and handing the dice to the other
 * side of the screen takes the only tension in the rule with it — so the head of
 * the table gets `Kill` instead: the decision, said out loud, rather than a die
 * thrown on somebody else's behalf. `roll_death_save` and `kill_character` each
 * ask again.
 */
const PIP_BASE = "block size-2.5 rounded-full transition duration-300";

const PIP_EMPTY = "border border-ink/25 bg-black/30";

const PIP_SUCCESS = "bg-emerald-400 shadow-[0_0_6px_#34d399]";

const PIP_FAILURE = "bg-rose-500 shadow-[0_0_6px_#f43f5e]";

export default function DeathSaves({
  campaignId,
  characterId,
  name,
  seatCharacterId,
  canRoll,
  canKill,
}) {
  const saves = useDeathSaves(characterId);
  const [busy, setBusy] = useState(false);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);
  const { roll, throwing } = useDiceTable();

  /** The head of the table finishing somebody already down. */
  function finish() {
    if (busy) {
      return;
    }

    setBusy(true);

    run({
      work: () => killCharacter(campaignId, characterId),

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

  function throwOne() {
    if (busy || throwing) {
      return;
    }

    setBusy(true);

    /* The roller refuses a throw while one is already in the air, and refusing
       is silent: it returns without ever landing. Without this the button would
       stay disabled for the rest of the session. */
    let landed = false;

    roll(DEATH_SAVE_DIE, 1, {
      // The board still throws for everybody; the sentence is the database's.
      quiet: true,
      onLanded: (face) => {
        landed = true;

        run({
          work: () =>
            rollDeathSaveFor(campaignId, characterId, face, seatCharacterId),

          /* Nothing is painted ahead of this one. Every other deed at this
             table paints first, but a death save decides whether a card goes
             dark — and a card that went dark and came back because the server
             disagreed is the one wrong answer worth waiting a round trip to
             avoid. The dice are the wait. */
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
      },
    }).then(() => {
      if (!landed) {
        setBusy(false);
      }
    });
  }

  return (
    <div className="mt-2.5 flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Tally
          label="Success"
          plural="successes"
          filled={saves.successes}
          toneClass={PIP_SUCCESS}
          name={name}
        />
        <Tally
          label="Failure"
          plural="failures"
          filled={saves.failures}
          toneClass={PIP_FAILURE}
          name={name}
        />
      </div>

      {canKill && (
        <button
          type="button"
          onClick={finish}
          disabled={busy}
          aria-label={`Kill ${name}`}
          className="shrink-0 cursor-pointer rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 font-display text-[12px] font-semibold tracking-[0.14em] text-rose-300 uppercase transition duration-300 hover:bg-rose-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {/* Letter-spacing is added AFTER the last letter too, so a tracked
              word sits 0.14em left of the centre it was padded into. Taking
              that one gap back off the end is what centres it. */}
          <span className="-mr-[0.14em] block">Kill</span>
        </button>
      )}

      {canRoll && (
        <button
          type="button"
          onClick={throwOne}
          disabled={busy || throwing}
          aria-label={`Roll a death save for ${name}`}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-display text-[11px] font-semibold tracking-[0.14em] text-gold uppercase transition duration-300 hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DieGlyph die={DEATH_SAVE_DIE} className="size-4" />
          Roll
        </button>
      )}
    </div>
  );
}

/**
 * One row of three. The word is the label; the pips are the value.
 *
 * `plural` is spelled out rather than an `s` on the end of the label: "success"
 * does not pluralise that way, and a screen reader saying "successs" is what
 * happens when it is assumed to.
 */
function Tally({ label, plural, filled, toneClass, name }) {
  return (
    <p className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-[9px] tracking-[0.14em] text-ink/45 uppercase">
        {label}
      </span>

      <span aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: DEATH_SAVE_TARGET }, (_, index) => (
          <span
            key={index}
            className={`${PIP_BASE} ${index < filled ? toneClass : PIP_EMPTY}`}
          />
        ))}
      </span>

      <span className="sr-only">
        {name}: {filled} of {DEATH_SAVE_TARGET} death save{" "}
        {filled === 1 ? label.toLowerCase() : plural}
      </span>
    </p>
  );
}
