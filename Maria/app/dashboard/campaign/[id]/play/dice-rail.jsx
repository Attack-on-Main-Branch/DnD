"use client";

import { DICE } from "sina/rules/dice";

import EyeIcon from "@/app/components/ui/eye-icon";

import DieGlyph from "./dice-glyphs";
import { diceCast } from "./dice-presentation";
import { RollAnnouncement, useDiceTable } from "./dice-table";
import { RAIL_CLASSES, railEntrance } from "./entrance";

/**
 * The dice, stacked down the rail beside the board, with the Dungeon Master's
 * veil under them.
 *
 * Marks and not buttons: no rim, no fill, nothing behind the drawing. A surface
 * around a 36px icon is a second object competing with the icon, and the
 * drawings are solid enough to carry themselves.
 *
 * The colour is not written into any of these classes. Every accent reads
 * `--cast-rest` or `--cast-ink` off whatever is set above it, so the whole rail
 * turns violet on the frame the veil closes — see dice-presentation.js. In the
 * open, `--cast-rest` is the same `text-ink/60` every other mark in the app
 * rests at.
 */

const MARK_CLASSES =
  "grid size-15 place-items-center rounded-full transition-colors duration-300 " +
  "text-(--cast-rest) hover:text-(--cast-ink) focus-visible:text-(--cast-ink) " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export default function DiceRail({ canKeepSecrets }) {
  const { stage, secret, setSecret, roll, warm } = useDiceTable();

  // The rail wears the veil's own colour whatever the rest of the table is
  // doing: it says what the NEXT roll will be, not what the last one was.
  const cast = diceCast(secret);
  const busy = stage !== "idle";

  return (
    <div
      /* Warmed on approach: the roller is a megabyte of BabylonJS, ammo.js and
         two workers, and fetching it when the pointer arrives rather than when
         the click does is the difference between a board that lights onto dice
         and one that lights onto nothing. */
      onPointerEnter={warm}
      onFocusCapture={warm}
      data-tuck="left"
      style={{ ...cast.style, ...railEntrance() }}
      className={`flex w-14 shrink-0 flex-col items-center gap-1 ${RAIL_CLASSES}`}
    >
      <ul className="flex flex-col items-center gap-1">
        {DICE.map((die) => (
          <li key={die.id}>
            <button
              type="button"
              onClick={() => roll(die.id)}
              disabled={busy}
              aria-label={
                secret ? `Roll a ${die.id} in secret` : `Roll a ${die.id}`
              }
              className={MARK_CLASSES}
            >
              <DieGlyph die={die.id} className="size-13" />
            </button>
          </li>
        ))}
      </ul>

      {canKeepSecrets && (
        <>
          {/* The header's and the changelog drawer's hairline, written out
              rather than taken from the shared one: theirs is gold, and this
              one sits under the switch that decides the colour. */}
          <div
            aria-hidden="true"
            className="my-2 h-px w-full bg-linear-to-r from-transparent via-(--cast-rule) to-transparent"
          />

          <VeilSwitch on={secret} onChange={setSecret} disabled={busy} />
        </>
      )}

      <RollAnnouncement />
    </div>
  );
}

/**
 * The veil, as a switch rather than another mark: it is the one control on this
 * rail that holds a state instead of doing a thing, and it should not look like
 * the seven that do.
 *
 * The knob carries the eye — open while the table may see, struck through while
 * it may not — and the track takes the roll's own colour behind it. The drawing
 * is the login page's, which is where this app first had to say "shown" or
 * "hidden" about anything.
 *
 * `translate` rather than `left`, so the slide is a compositor transform.
 */
function VeilSwitch({ on, onChange, disabled }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        aria-label="Keep your rolls from the table"
        className={`relative h-8 w-15 cursor-pointer rounded-full border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
          on
            ? "border-(--cast-rim) bg-(--cast-line) shadow-[0_0_16px_-4px_var(--cast-bloom)]"
            : "border-(--cast-line) bg-surface/80"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 left-0.5 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-(--cast-ink) text-surface transition-transform duration-300 ease-tray motion-reduce:transition-none ${
            on ? "translate-x-6.5" : "translate-x-0"
          }`}
        >
          <EyeIcon crossedOut={on} className="size-4.5" />
        </span>
      </button>

      {/* What the switch means, for anybody who has not watched it move.
          `aria-hidden`: the control above already says it, and says it as a
          state rather than as a word. */}
      <p
        aria-hidden="true"
        className="font-mono text-[9px] tracking-[0.12em] text-ink/45 uppercase"
      >
        {on ? "Secret" : "Open"}
      </p>
    </div>
  );
}
