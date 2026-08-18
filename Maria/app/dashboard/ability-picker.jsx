"use client";

import {
  ABILITIES,
  ABILITY_BUDGET,
  MAX_ABILITY,
  MIN_ABILITY,
  abilityPointsRemaining,
  abilityRaiseCost,
  canLowerAbility,
  canRaiseAbility,
  raceAbilityBonus,
} from "sina/rules/character";

import {
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";

import { abilityEmblem, withAlpha } from "./character-presentation";

/**
 * Point-buy for the six ability scores. The arithmetic lives in
 * `sina/rules/character` — the same functions price the `+` button and decide
 * whether the Server Action accepts the sheet, so the two cannot drift.
 *
 * The racial bonus is shown but never added: the stepper's number is the value
 * being *bought*, and folding the race in would make the next point's price
 * look wrong. Buttons rather than `<input type="number">`, which accepts typing
 * and pasting and so needs every keystroke validated and clamped mid-edit.
 */
export default function AbilityPicker({
  race,
  scores,
  onChange,
  disabled,
  invalidField,
}) {
  const remaining = abilityPointsRemaining(scores);

  // Any of the six, plus the whole-group overspend, land the highlight on the
  // grid — the mistake is the distribution, not one card in it.
  const invalid =
    invalidField === "abilities" ||
    ABILITIES.some((ability) => invalidField === `ability_${ability.id}`);

  function step(id, delta) {
    onChange({ ...scores, [id]: scores[id] + delta });
  }

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <legend className={LABEL_CLASSES}>Ability scores</legend>

        {/*
          `aria-live` because this is the number that answers "why is the plus
          greyed out", and it changes without the thing that changed it being
          announced. Polite, so it waits for the button press to finish.
        */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className="font-mono text-xs tracking-[0.16em] text-ink/60 uppercase"
        >
          Points remaining:{" "}
          <span
            className={
              remaining === 0 ? "font-semibold text-gold/70" : "text-gold"
            }
          >
            {remaining} / {ABILITY_BUDGET}
          </span>
        </p>
      </div>

      <div
        /*
          Two-up below `xl` for arithmetic rather than taste: at three columns
          a card leaves 69px for the name, and CONSTITUTION needs 119.
        */
        className={`mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${
          invalid ? `rounded-lg ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {ABILITIES.map((ability) => {
          const score = scores[ability.id];
          const bonus = raceAbilityBonus(race, ability.id);
          const raiseCost = abilityRaiseCost(score);
          const canRaise = canRaiseAbility(scores, ability.id);
          const canLower = canLowerAbility(scores, ability.id);
          const { accent, clip } = abilityEmblem(ability.id);

          return (
            <div
              key={ability.id}
              className={`flex items-center gap-2.5 rounded-lg border p-4 transition duration-300 ${NESTED_CARD_CLASSES}`}
            >
              {/*
                Sized to the card's content box rather than to the glyph in it,
                and measured rather than guessed: `self-stretch` takes the full
                height between the two `p-4` paddings, and `aspect-square` makes
                the width follow. A fixed `size-12` was two pixels short of the
                row, and would have been wrong again the moment the padding or
                the stepper changed.

                The disc no longer contributes an intrinsic height, so the row
                is still set by the stepper beside it — there is no circular
                sizing here.
              */}
              <span
                aria-hidden="true"
                className="grid aspect-square shrink-0 place-items-center self-stretch rounded-full border border-gold/15 bg-white/5"
              >
                <span
                  // Left at 20px as the disc grew. That is 42% of it, which is
                  // the proportion the class cards already use (28 in 64) — the
                  // ring reads as a setting for the mark, not a tight collar
                  // around it.
                  className="size-6"
                  style={{
                    background: accent,
                    clipPath: clip,
                    filter: `drop-shadow(0 0 7px ${withAlpha(accent, 0.35)})`,
                  }}
                />
              </span>

              {/*
                The full word, at a size chosen so CONSTITUTION — the longest
                of the six — fits beside the stepper rather than being cut. One
                step down from the path card's title, which is the concession
                that buys it.

                Name and badge share this box, so the badge sits against the
                word it modifies. Pushed to the right of the card, as it was, it
                read as a second column of its own and left CHARISMA looking
                like it had nothing.
              */}
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span
                  className="truncate font-display text-base font-semibold tracking-wide text-ink uppercase"
                  title={ability.name}
                >
                  {ability.name}
                </span>

                {/*
                  Shown only where there is one. A row of `+0` badges is six
                  pieces of furniture carrying no information, and it makes the
                  two that matter harder to find.
                */}
                {bonus > 0 && (
                  <span
                    className="shrink-0 rounded-full border border-gold/20 bg-gold/10 px-1.5 py-px font-mono text-xs leading-none text-gold/80"
                    title={`${race} grants +${bonus} ${ability.name}`}
                  >
                    +{bonus}
                  </span>
                )}
              </span>

              {/* `items-center`, so the price sits under the middle of the
                  stepper rather than under its right-hand edge. */}
              <span className="flex shrink-0 flex-col items-center gap-1">
                <span
                  role="group"
                  aria-label={ability.name}
                  className="flex items-center gap-1.5"
                >
                  <StepButton
                    label={`Lower ${ability.name}`}
                    disabled={!canLower}
                    onClick={() => step(ability.id, -1)}
                  >
                    &minus;
                  </StepButton>

                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="w-6 text-center font-display text-base font-semibold text-ink tabular-nums"
                  >
                    <span className="sr-only">{ability.name}: </span>
                    {score}
                  </span>

                  <StepButton
                    label={`Raise ${ability.name}`}
                    disabled={!canRaise}
                    onClick={() => step(ability.id, 1)}
                  >
                    +
                  </StepButton>
                </span>

                {/*
                  Dimmed when the next point exists but cannot be afforded, so
                  the greyed-out `+` has a reason attached to it rather than
                  just being dead.
                */}
                <span
                  // 10px, the one size on this screen outside the four-step
                  // scale. It is the smallest thing on the card by intent —
                  // a price tag under a control, not a label of its own — and
                  // at `text-xs` it competed with the ability's name.
                  className={`font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase ${
                    raiseCost !== null && !canRaise
                      ? "text-ink/30"
                      : "text-ink/50"
                  }`}
                >
                  {nextLabel(score, raiseCost)}
                </span>
              </span>

              {/*
                What actually submits. The stepper is the control; this is the
                value, kept beside it so the two cannot get out of step.
              */}
              <input
                type="hidden"
                name={`ability_${ability.id}`}
                value={score}
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * `Max` at the ceiling, `Min` at the floor, the next point's price in between.
 * The floor deliberately shows no price: the `+` being live says that already.
 */
function nextLabel(score, raiseCost) {
  if (score >= MAX_ABILITY) {
    return "Max";
  }

  if (score <= MIN_ABILITY) {
    return "Min";
  }

  return `Next: ${raiseCost} pt${raiseCost === 1 ? "" : "s"}`;
}

function StepButton({ label, disabled, onClick, children }) {
  return (
    <button
      // Inside a form, and `submit` is the default. Without this every `+`
      // would try to create the character.
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      // The box stays small; the glyph inside it does not. A 28px control with
      // a 12px sign in it reads as a hairline — 20px fills it without the
      // button itself growing and pushing the card off one line. That is the
      // one size on this screen above the four-step scale, and it is a symbol
      // rather than type: `+` and `−` have no descenders and no x-height to
      // match, so they read a size smaller than the number beside them.
      className="grid size-7 cursor-pointer place-items-center rounded-md border border-gold/20 bg-surface/60 font-display text-xl leading-none text-ink/80 transition duration-200 hover:border-gold/50 hover:bg-surface/40 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70 disabled:cursor-not-allowed disabled:border-gold/10 disabled:bg-surface/30 disabled:text-ink/25 disabled:hover:border-gold/10 disabled:hover:text-ink/25"
    >
      {children}
    </button>
  );
}
