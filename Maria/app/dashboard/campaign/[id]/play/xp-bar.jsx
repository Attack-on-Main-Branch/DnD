"use client";

import { useState } from "react";
import { MAX_LEVEL } from "sina/rules/level";
import { MAX_XP_AWARD, parseXpDelta, xpFraction } from "sina/rules/xp";

import { controlClasses } from "@/app/components/ui/field-styles";
import PlasmaBar from "@/app/components/ui/plasma-bar";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import {
  XP_BAR_CLASS,
  xpReadout,
  xpValueText,
} from "@/app/dashboard/xp-presentation";

import { adjustCharacterXp } from "./session-actions";
import {
  useCharacterLevel,
  useCharacterXp,
  useTableStore,
} from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * What a character has earned towards their next level. A read-out; the presses
 * that move it are `XpStepper` below, which only the session panel mounts.
 *
 * It stands under the skills on the scores sheet and again in that panel, which
 * is what `compact` is: there the heading is written over the whole section.
 *
 * THE BAR IS THE HEALTH BAR — `PlasmaBar` with `.hp-verdant` under it, since
 * everything that makes that one breathe is a custom property.
 */
export default function XpBar({ characterId, name, compact = false }) {
  const xp = useCharacterXp(characterId);
  const level = useCharacterLevel(characterId);

  const readout = xpReadout(xp, level);

  return (
    <section aria-label={`${name}'s experience`}>
      {!compact && (
        /* The scores sheet's own section heading, beside Ability scores and
           Skills — it stands among them and has to be read as one of them. */
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Experience
        </h3>
      )}

      <div
        className={`flex items-baseline justify-between gap-4 ${compact ? "" : "mt-3"}`}
      >
        <p className="min-w-0 truncate font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
          Level <span className="text-gold tabular-nums">{level}</span>
        </p>

        <p className="shrink-0 font-mono text-xs text-ink/50 tabular-nums">
          {readout ? (
            <>
              <span className="text-sm text-emerald-300">{readout.held}</span> /{" "}
              {readout.target} XP
            </>
          ) : (
            /* Nothing left to progress towards, and `12700 / 12700` would be a
               sentence about a threshold nobody can spend. */
            <span className="text-sm text-emerald-300">Maxed</span>
          )}
        </p>
      </div>

      <PlasmaBar
        fraction={xpFraction(xp, level)}
        toneClass={XP_BAR_CLASS}
        label={`${name}'s experience`}
        valueNow={xp}
        valueMax={readout?.target ?? xp}
        valueText={xpValueText(xp, level)}
        className="mt-2"
      />

      {level >= MAX_LEVEL && (
        <p className="mt-1.5 text-right text-[11px] text-ink/40">
          The top of the ladder.
        </p>
      )}
    </section>
  );
}

/**
 * How much, then which way — the purse's own shape. Take before Give, as Damage
 * sits before Heal: the press that costs something is never under the thumb.
 */
export function XpStepper({ campaignId, targets, whom, disabled, onLevelled }) {
  const [typed, setTyped] = useState("");

  const store = useTableStore();
  const { run, send, resync } = useTableDeed(campaignId);

  const amount = parseXpDelta(typed);

  function award(sign) {
    if (amount === null) {
      return;
    }

    setTyped("");

    /* What this press painted, per character, so the answer can be laid over
       the right one. A party award reaches every card the rail has, which is
       every card RLS handed this viewer. */
    const painted = new Map();

    for (const id of targets) {
      const landed = store.moveXp(id, sign * amount);

      if (landed) {
        painted.set(id, landed);
      }
    }

    run({
      work: () => adjustCharacterXp(campaignId, targets, amount, sign),

      tell: (result) => {
        const awarded = result.awarded ?? [];
        let agreed = awarded.length === painted.size;

        /* A rung that moved moved the hit points with it, and neither figure
           can be worked out from what was painted. */
        const frames = new Map(
          (result.party ?? []).map((member) => [
            member.id,
            { maxHp: member.max_hp, hitPoints: member.current_hp },
          ]),
        );

        for (const [id, frame] of frames) {
          store.setFrame(id, frame.maxHp, frame.hitPoints);
        }

        for (const landed of awarded) {
          const painting = painted.get(landed.id);

          /* Only while this press is still the last word: an older answer laid
             down here would rewind a bar somebody has since filled again. */
          if (painting && store.reconcileXp(landed.id, painting, landed)) {
            send({
              kind: "xp",
              characterId: landed.id,
              xp: landed.xp,
              level: landed.level,
              ...frames.get(landed.id),
            });
          } else {
            agreed = false;
          }
        }

        /* A rung MOVED is more than a number, whichever way it went: the scores
           sheet's panels are built on the server out of a proficiency bonus a
           level decides. */
        if (awarded.some((one) => one.levelsGained !== 0)) {
          onLevelled?.();
        }

        if (!agreed) {
          resync({ party: true });
        }
      },

      want: { party: true, activity: true },
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Width on the wrapper, not the input: `controlClasses` already carries
          `w-full`. */}
      <span className="block w-20 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_XP_AWARD}
          value={typed}
          disabled={disabled}
          onChange={(event) => setTyped(event.target.value)}
          /* The unit rather than a number: a figure already in the field reads
             as a value, and the purse names what it wants the same way. */
          placeholder="Qty"
          aria-label={`How much experience to move ${whom}`}
          className={controlClasses({
            className: "no-spin px-2 py-1 text-center tabular-nums",
          })}
        />
      </span>

      <StepButton
        wide
        tone="danger"
        onClick={() => award(-1)}
        disabled={disabled || amount === null}
        label={`Take experience ${whom}`}
      >
        Take
      </StepButton>

      <StepButton
        wide
        tone="emerald"
        onClick={() => award(1)}
        disabled={disabled || amount === null}
        label={`Give experience ${whom}`}
      >
        Give
      </StepButton>
    </div>
  );
}
