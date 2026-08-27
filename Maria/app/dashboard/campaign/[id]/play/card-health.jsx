"use client";

import { useState } from "react";
import { isMassiveDamage } from "sina/rules/death";
import { healthFraction, healthTier, MAX_HP } from "sina/rules/health";

import { controlClasses } from "@/app/components/ui/field-styles";
import HealthBar from "@/app/components/ui/health-bar";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import { healthBarClass } from "@/app/dashboard/health-presentation";

import { changeCharacterHealth } from "./actions";
import { useHitPoints, useMaxHitPoints, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * One party member's hit points, inside their own card on the rail.
 *
 * The seat decides which CARDS carry a bar: the Dungeon Master's every card, a
 * player's own alone. Who may WRITE is `change_character_health`'s to say, and
 * it says the same thing.
 *
 * `sina/rules/health` rather than `sina/rules/character`: this runs in the
 * browser, and that neighbour would bring the catalogues with it.
 *
 * NOTHING WAITS FOR THE WRITE, and the controls are not disabled while one is in
 * flight: a table calls out four damage and then six, and the second press must
 * not queue behind the first one's round trip. Two presses stack because the
 * store takes a change rather than a total.
 *
 * A BLOW CAN ALSO END SOMEBODY, which is why the answer carries more than a hit
 * point now. `apply_damage` decides massive damage against the row it has
 * locked; `isMassiveDamage` is the same arithmetic here, so the card goes dark
 * on the press rather than a round trip later. The server's answer is laid over
 * it either way.
 */
export default function CardHealth({
  campaignId,
  characterId,
  name,
  seatCharacterId,
  actorName,
  canEdit,
}) {
  const [open, setOpen] = useState(false);

  const current = useHitPoints(characterId);
  const ceiling = useMaxHitPoints(characterId);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  // An amount rather than a target — seven damage, four healed. Both words
  // wait until there is one.
  const [amount, setAmount] = useState("");
  const step = Number(amount);
  const typed = amount.trim() !== "" && Number.isFinite(step) && step > 0;

  function apply(delta) {
    // Shut on the press: the bar behind it has already moved, which is the
    // answer to "did that land".
    setOpen(false);

    const moved = store.moveHealth(characterId, delta);

    // Already at the floor or the ceiling: the press did not happen.
    if (!moved) {
      return;
    }

    /* The overflow past zero, measured against the maximum — 5e's massive
       damage. Painted here so the card dims on the press; `apply_damage` reads
       it again off the locked row, which is the run that counts. */
    const killed =
      delta < 0 &&
      isMassiveDamage({ hitPoints: current, maxHp: ceiling, damage: -delta });

    if (killed) {
      store.setCondition(characterId, { isDead: true });
    }

    run({
      /* Shown to whoever pressed, until the real list lands. The entry that is
         KEPT is written by a trigger on the bar, and its names come from rows. */
      note: [
        {
          action: "hp_change",
          actor: actorName,
          // Moving your own bar names nobody, as `write_table_log` decides it.
          target: seatCharacterId === characterId ? null : name,
          delta: moved.moved,
        },
      ],

      /* THE BLOW, and not what the bar had left to give. Both are changes
         rather than totals — a total posted a round trip later undoes whatever
         else moved the bar in between — but they are different changes, and the
         difference is the whole of massive damage: twenty-four against a
         twelve-point bar moves it by twelve and kills outright, and sending the
         twelve would have `apply_damage` decide against a blow nobody struck.
         The clamped figure stays where it belongs, painting. */
      work: () =>
        changeCharacterHealth(campaignId, characterId, delta, seatCharacterId),

      tell: (result) => {
        // Only while this press is still the last word: an older answer laid
        // down here would rewind the bar on every screen at the table.
        const settled = store.reconcileHealth(
          characterId,
          moved.hitPoints,
          result.hitPoints,
        );

        /* The flag and the tallies are not reconciled the way the bar is:
           unlike a hit point they cannot stack, so the newest answer is simply
           the truth. `apply_damage` clears the tallies whenever the bar reaches
           zero, and `apply_heal` clears them whenever it leaves. */
        store.setCondition(characterId, {
          isDead: result.isDead,
          deathSaves: result.deathSaves,
        });

        if (settled) {
          send({
            kind: "condition",
            characterId,
            hitPoints: result.hitPoints,
            isDead: result.isDead,
            successes: result.deathSaves.successes,
            failures: result.deathSaves.failures,
          });
        }
      },

      want: { party: true, activity: true },
    });
  }

  return (
    <div className="mt-2.5">
      <div className="relative">
        <HealthBar
          compact
          current={current}
          max={ceiling}
          fraction={healthFraction(current, ceiling)}
          tierClass={healthBarClass(healthTier(current, ceiling))}
          label={`${name} health`}
        />

        {canEdit && (
          /* Laid OVER the bar rather than wrapped around it: a `<button>` may
             hold only phrasing content, and the bar is a section.

             NOTHING ON HOVER — a wash over the bar reads as a second, dimmer
             bar laid on the first. The cursor is the whole affordance. The
             focus ring stays; a keyboard has no cursor to change. */
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            aria-expanded={open}
            aria-label={
              open
                ? `Stop editing ${name} hit points`
                : `Edit ${name} hit points`
            }
            className="absolute -inset-x-1 -inset-y-0.5 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70"
          />
        )}
      </div>

      {/* Mounted either way so it can unfold rather than appear: a height
          cannot interpolate from `auto`. `inert` keeps the closed one out of
          the tab order. */}
      {canEdit && (
        <div
          inert={!open || undefined}
          className={`tray-fold ${open ? "" : "tray-folded"}`}
        >
          <div className="fold-body">
            {/* How much, then which way. */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2.5">
              {/* Width on the wrapper, not the input: `controlClasses`
                  already carries `w-full`. */}
              <div className="w-14 shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  /* The bar's own ceiling would be the wrong bound: a blow
                     large enough to kill outright is by definition larger than
                     what the bar holds. */
                  max={MAX_HP}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  /* The unit rather than a number: "10" read as a value already
                     in the field, and the purse's fields next door name what
                     they want the same way. */
                  placeholder="HP"
                  aria-label={`Hit points to take from or give to ${name}`}
                  className={controlClasses({
                    className: "no-spin px-1 py-1 text-center tabular-nums",
                  })}
                />
              </div>

              {/* Not disabled for a write in flight, only for a press that
                  could not move the bar. See the note at the head of the file. */}
              <StepButton
                wide
                tone="danger"
                onClick={() => apply(-step)}
                disabled={!typed || current === 0}
                label={`Take hit points from ${name}`}
              >
                Damage
              </StepButton>

              <StepButton
                wide
                onClick={() => apply(step)}
                disabled={!typed || current === ceiling}
                label={`Give hit points to ${name}`}
              >
                Heal
              </StepButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
