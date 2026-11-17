"use client";

import { DEATH_SAVE_DIE, DEATH_SAVE_TARGET } from "sina/rules/death";

import { ButtonContent } from "@/app/components/ui/button";
import { BANNER_SUBTITLE_CLASSES } from "@/app/dashboard/banner-identity";
import { SLOT_PIP_CLASSES } from "@/app/dashboard/spell-presentation";

import DieGlyph from "./dice-glyphs";
import { useDiceTable } from "./dice-table";
import { killCharacter, rollDeathSaveFor } from "./actions";
import ReviveButton, { CONDITION_BUTTON_CLASSES } from "./revive-button";
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
 * side of the screen takes the only tension in the rule with it.
 */
const PIP_EMPTY = "border border-gold/50 bg-surface/70";

const PIP_SUCCESS =
  "bg-emerald-400 shadow-[0_0_0.375rem] shadow-emerald-400/60";

const PIP_FAILURE = "bg-rose-500 shadow-[0_0_0.375rem] shadow-rose-500/60";

export default function DeathSaves({
  campaignId,
  characterId,
  name,
  seatCharacterId,
  canRoll,
  canKill,
  busy,
  setBusy,
}) {
  const saves = useDeathSaves(characterId);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);
  const { roll, throwing, rollingDisabled } = useDiceTable();

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
    if (busy || throwing || rollingDisabled) {
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex min-w-max flex-1 flex-col gap-1">
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
        <div className="ml-auto grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={finish}
            disabled={busy}
            aria-label={`Kill ${name}`}
            className={`${CONDITION_BUTTON_CLASSES} border-rose-400 text-rose-200 hover:bg-rose-400/15 focus-visible:outline-rose-400/70`}
          >
            <ButtonContent>Kill</ButtonContent>
          </button>
          <ReviveButton
            campaignId={campaignId}
            characterId={characterId}
            name={name}
            busy={busy}
            setBusy={setBusy}
          />
        </div>
      )}

      {canRoll && (
        <button
          type="button"
          onClick={throwOne}
          disabled={busy || throwing || rollingDisabled}
          aria-label={`Roll a death save for ${name}`}
          className={`${CONDITION_BUTTON_CLASSES} w-auto shrink-0 gap-1.5 border-gold text-gold hover:bg-gold/15 focus-visible:outline-gold/70`}
        >
          <DieGlyph
            die={DEATH_SAVE_DIE}
            className="size-4 shrink-0 scale-125 overflow-visible stroke-surface stroke-2 [paint-order:stroke_fill] [&_path]:[vector-effect:non-scaling-stroke]"
          />
          <ButtonContent>Roll</ButtonContent>
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
      <span
        className={`banner-label w-16 shrink-0 font-semibold [text-box:trim-both_cap_alphabetic] ${BANNER_SUBTITLE_CLASSES}`}
      >
        {label}
      </span>

      <span aria-hidden="true" className="flex items-center gap-1">
        {Array.from({ length: DEATH_SAVE_TARGET }, (_, index) => (
          <span
            key={index}
            className={`${SLOT_PIP_CLASSES} ${index < filled ? toneClass : PIP_EMPTY}`}
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
