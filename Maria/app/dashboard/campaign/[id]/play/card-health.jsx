"use client";

import { useOptimistic, useState, useTransition } from "react";
import { healthFraction, healthTier, MAX_HP } from "sina/rules/health";

import { controlClasses } from "@/app/components/ui/field-styles";
import HealthBar from "@/app/components/ui/health-bar";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import { healthBarClass } from "@/app/dashboard/health-presentation";

import { setCharacterHealth } from "./actions";
import { useActivityLog } from "./use-activity";

/**
 * One party member's hit points, inside their own card on the rail — the health
 * band that used to run across the foot of the board.
 *
 * The seat decides which CARDS carry a bar: the Dungeon Master's every card, a
 * player's own alone. Who may WRITE is `set_character_health`'s to say, and it
 * says the same thing.
 *
 * `sina/rules/health` rather than `sina/rules/character`: this runs in the
 * browser, and that neighbour would bring the catalogues with it.
 */
export default function CardHealth({
  campaignId,
  member,
  seatCharacterId,
  canEdit,
  onWritten,
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  // This character's own ceiling, not the app's. MAX_HP covers a party list
  // read before `campaign_party` carried the column.
  const ceiling = member.max_hp ?? MAX_HP;

  // An amount rather than a target — seven damage, four healed. Both words
  // wait until there is one.
  const [amount, setAmount] = useState("");
  const step = Number(amount);
  const typed = amount.trim() !== "" && Number.isFinite(step) && step > 0;

  /**
   * The reducer takes the CHANGE, not the result: a finished total would be
   * computed against a row that has not moved yet, so two quick presses would
   * both aim at the same number instead of stacking.
   */
  const [current, adjust] = useOptimistic(member.current_hp, (base, delta) =>
    Math.min(ceiling, Math.max(0, base + delta)),
  );

  function apply(delta) {
    const next = Math.min(ceiling, Math.max(0, current + delta));

    // Already at the floor or the ceiling: the press did not happen.
    if (next === current) {
      return;
    }

    // What the bar actually moved by, which is not always what was typed: ten
    // damage against seven hit points is a change of seven.
    const moved = next - current;

    setError(null);

    // Shut on the press: the bar behind it has already moved, which is the
    // answer to "did that land".
    setOpen(false);

    startTransition(async () => {
      adjust(delta);

      const result = await setCharacterHealth(campaignId, member.id, next);

      if (result?.kind === "rejected") {
        // Back open: a card this narrow has nowhere else to say it.
        setError(result.message);
        setOpen(true);
        return;
      }

      // Only once it is written: a number told to the table before the database
      // has taken it is a number that might yet be refused.
      onWritten(member.id, result.hitPoints);

      // The seat that moved it and the bar that moved, both:
      // `record_campaign_activity` drops the second name when they are one.
      record(seatCharacterId, {
        action: "hp_change",
        delta: moved,
        targetCharacterId: member.id,
      });
    });
  }

  return (
    <div className={`mt-2.5 ${isPending ? "opacity-60" : ""}`}>
      <div className="relative">
        <HealthBar
          compact
          current={current}
          max={ceiling}
          fraction={healthFraction(current, ceiling)}
          tierClass={healthBarClass(healthTier(current, ceiling))}
          label={`${member.name} health`}
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
                ? `Stop editing ${member.name} hit points`
                : `Edit ${member.name} hit points`
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
          <div className="min-h-0 overflow-hidden">
            {/* How much, then which way. */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2.5">
              {/* Width on the wrapper, not the input: `controlClasses`
                  already carries `w-full`. */}
              <div className="w-14 shrink-0">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={ceiling}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={isPending}
                  /* The unit rather than a number: "10" read as a value already
                     in the field, and the purse's fields next door name what
                     they want the same way. */
                  placeholder="HP"
                  aria-label={`Hit points to take from or give to ${member.name}`}
                  className={controlClasses({
                    className: "no-spin px-1 py-1 text-center tabular-nums",
                  })}
                />
              </div>

              <StepButton
                wide
                tone="danger"
                onClick={() => apply(-step)}
                disabled={isPending || !typed || current === 0}
                label={`Take hit points from ${member.name}`}
              >
                Damage
              </StepButton>

              <StepButton
                wide
                onClick={() => apply(step)}
                disabled={isPending || !typed || current === ceiling}
                label={`Give hit points to ${member.name}`}
              >
                Heal
              </StepButton>
            </div>

            {error && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
