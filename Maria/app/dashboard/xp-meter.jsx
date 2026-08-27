import { MAX_LEVEL } from "sina/rules/level";
import { xpFraction } from "sina/rules/xp";

import PlasmaBar from "@/app/components/ui/plasma-bar";

import { XP_BAR_CLASS, xpReadout, xpValueText } from "./xp-presentation";

/**
 * What a character has earned towards their next level, drawn from two numbers
 * and nothing else. A read-out everywhere it appears: the presses that move it
 * are the session panel's, at the table.
 *
 * No `"use client"` and no hooks, which is the point of it being here rather
 * than in play/xp-bar.jsx — the character sheet renders this on the server, and
 * that neighbour wraps it in the browser's own copy of the figure. Two drawings
 * of one bar would have drifted the first time either was touched.
 *
 * `compact` is for a panel that writes its own heading over the whole section —
 * the scores sheet at the table does, the sheet's Overview tab does not.
 *
 * THE BAR IS THE HEALTH BAR — `PlasmaBar` with `.hp-verdant` under it, since
 * everything that makes that one breathe is a custom property.
 */
export default function XpMeter({ xp, level, name, compact = false }) {
  const readout = xpReadout(xp, level);

  return (
    <section aria-label={`${name}’s experience`}>
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
        label={`${name}’s experience`}
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
