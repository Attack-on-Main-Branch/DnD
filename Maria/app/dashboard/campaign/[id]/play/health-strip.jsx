"use client";

import { useOptimistic, useState, useTransition } from "react";
import { healthFraction, healthTier, MAX_HP } from "sina/rules/health";

import { controlClasses } from "@/app/components/ui/field-styles";
import HealthBar from "@/app/components/ui/health-bar";
import { healthBarClass } from "@/app/dashboard/health-presentation";

import { setCharacterHealth } from "./actions";
import { HEALTH_CLASSES, healthEntrance } from "./entrance";

/**
 * Health, as a band across the bottom of the board.
 *
 * A player sees the one bar they are sitting as; the Dungeon Master sees the
 * whole party and may set any of it, because damage is called out by whoever is
 * running the session. Keyed on the SEAT and never on ownership — filtering by
 * "is this mine" showed an account that owns both the campaign and characters
 * in it every bar whichever chair it had sat down in.
 *
 * The seat is a view, not a boundary: `set_character_health` decides what may
 * actually be written.
 *
 * `sina/rules/health` rather than `sina/rules/character`: this arithmetic runs
 * in the browser, and that neighbour would bring the catalogues with it.
 */
export default function HealthStrip({
  campaignId,
  members,
  isDungeonMaster,
  seatCharacterId,
}) {
  const shown = isDungeonMaster
    ? members
    : members.filter((member) => member.id === seatCharacterId);

  if (shown.length === 0) {
    return null;
  }

  return (
    <section
      className={`w-full ${HEALTH_CLASSES}`}
      style={healthEntrance()}
      data-slide="down"
      aria-label={isDungeonMaster ? "Party health" : "Your health"}
    >
      {/* Three across on a wide screen and six in two rows, which keeps a
          full party inside 1080p without shrinking the bars. One bar takes no
          grid at all: in the first cell of three it sat hard against the left
          edge of the page. */}
      <ul
        className={
          shown.length === 1
            ? "mx-auto w-full max-w-4xl"
            : "grid gap-x-10 gap-y-4 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {shown.map((member) => (
          <li key={member.id}>
            <HealthRow
              campaignId={campaignId}
              member={member}
              // The Dungeon Master holds the pen over the whole table; a
              // player over the character they are sitting as, alone.
              canEdit={isDungeonMaster || member.id === seatCharacterId}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HealthRow({ campaignId, member, canEdit }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  /**
   * What one press of − or + is worth. An amount rather than a target, because
   * that is the sentence said out loud at a table: seven damage, four healed.
   * Empty to begin with, and both buttons wait until there is one.
   */
  const [amount, setAmount] = useState("");
  const step = Number(amount);
  const typed = amount.trim() !== "" && Number.isFinite(step) && step > 0;

  /**
   * The bar moves on the press and the server catches up behind it, reverting
   * by itself if the write is refused.
   *
   * The reducer takes the CHANGE, not the result: a finished total would be
   * computed against a row that has not moved yet, so two quick presses would
   * both aim at the same number instead of stacking.
   */
  const [current, adjust] = useOptimistic(member.current_hp, (base, delta) =>
    Math.min(MAX_HP, Math.max(0, base + delta)),
  );

  function apply(delta) {
    const next = Math.min(MAX_HP, Math.max(0, current + delta));

    // Already at the floor or the ceiling: nothing to send.
    if (next === current) {
      return;
    }

    setError(null);

    startTransition(async () => {
      adjust(delta);

      const result = await setCharacterHealth(campaignId, member.id, next);

      if (result?.kind === "rejected") {
        setError(result.message);
      }
    });
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <HealthBar
            current={current}
            max={MAX_HP}
            fraction={healthFraction(current, MAX_HP)}
            tierClass={healthBarClass(healthTier(current, MAX_HP))}
            heading={member.name}
            label={`${member.name} health`}
          />
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing((was) => !was)}
            aria-expanded={editing}
            aria-label={
              editing
                ? `Stop editing ${member.name} hit points`
                : `Edit ${member.name} hit points`
            }
            // `glow-mark` owns the ink, the glow and both their transitions;
            // `glow-bloom-small` swaps its ring of light for a bloom that
            // fills. No `transition-*` utility — one would replace what those
            // declare.
            className="glow-mark glow-bloom-small relative mb-0.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink/60 hover:text-gold focus-visible:text-gold"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {/* Mounted either way so it can unfold rather than appear: a height
          cannot interpolate from `auto`, so `grid-rows-[0fr]` to `[1fr]` is
          what animates a box of unknown height. `inert` keeps the closed one
          out of the tab order. */}
      <div
        inert={!editing || undefined}
        className={`tray-fold ${editing ? "" : "tray-folded"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            <StepButton
              onClick={() => apply(-step)}
              disabled={isPending || !typed || current === 0}
              label={`Take hit points from ${member.name}`}
            >
              −
            </StepButton>

            {/* The field's width is `w-20` on the wrapper, not on the input:
                `controlClasses` already carries `w-full`, and two width
                utilities on one element are settled by the order Tailwind
                emits them rather than the order they are written in. */}
            <div className="w-20 shrink-0">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_HP}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isPending}
                placeholder="10"
                aria-label="Hit points to give or take"
                className={controlClasses({
                  className: "no-spin text-center tabular-nums",
                })}
              />
            </div>

            <StepButton
              onClick={() => apply(step)}
              disabled={isPending || !typed || current === MAX_HP}
              label={`Give hit points to ${member.name}`}
            >
              +
            </StepButton>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The two halves of the stepper, so − and + cannot drift apart. */
function StepButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-gold/20 bg-surface/30 text-lg leading-none text-ink/70 transition-colors duration-300 hover:border-gold/45 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * An ordinary pencil, for the one control that writes on the sheet. The viewBox
 * is cropped to the drawing rather than left at `0 0 24 24`, where three units
 * of padding on every side rendered it at two thirds of the box it was given.
 */
function PencilIcon() {
  return (
    <svg
      viewBox="2.6 2.6 18.8 18.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-6"
    >
      {/* The ferrule's band, and the point of the nib. */}
      <path d="M17.8 3.4 20.6 6.2M4 20.6 3.2 20.8 3.4 20 4 20.6Z" />

      {/* The body, from the sharpened end to the ferrule. */}
      <path d="M15.9 5.3 18.7 8.1 7.5 19.3 3.6 20.4 4.7 16.5Z" />

      {/* The eraser end, past the band. */}
      <path d="M15.9 5.3 17.6 3.6a2 2 0 0 1 2.8 0l0 0a2 2 0 0 1 0 2.8l-1.7 1.7" />

      {/* Where the shaved wood meets the graphite. */}
      <path d="M4.7 16.5 7.5 19.3" />
    </svg>
  );
}
