"use client";

import { useState } from "react";
import { castableSlots } from "sina/rules/spellcasting";
import { CANTRIP_LEVEL } from "sina/rules/spells";

import { levelBadge } from "@/app/dashboard/spell-presentation";

import { Action } from "./pack-controls";

/**
 * `[Cast]`, and the slot it is cast from — one row, at the foot of the open
 * spell. A cantrip goes at once: it costs nothing, so there is nothing to ask.
 *
 * A levelled spell lays its slots to the LEFT of the button. Just the level on
 * each: how many are left is the bar's job, and repeating it here made buttons
 * that had to be read rather than aimed at. A spent level keeps its place and
 * is greyed out — an empty 3rd is what the caster is looking for when they
 * reach for their 4th.
 *
 * The levels are `Action`s, the same control Cast itself is, so the row cannot
 * change height when they appear. A bordered chip is two pixels taller than a
 * text button, and in a centred row those two pixels moved every control beside
 * it — including the one that had just been pressed.
 */
export default function SpellCastControl({
  spell,
  slots,
  classId,
  level,
  disabled,
  onCast,
}) {
  const [choosing, setChoosing] = useState(false);

  const cantrip = spell.level === CANTRIP_LEVEL;
  const offered = castableSlots(spell.level, slots, classId, level);

  /* A 3rd-level spell in a 3rd-level Wizard's book: readable, not castable.
     Said outright rather than left as a dead button. */
  const unreachable = !cantrip && offered.length === 0;

  function fire(slotLevel) {
    setChoosing(false);
    onCast(slotLevel);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {unreachable && (
        <p className="mr-auto text-[11px] text-ink/40">No slot that high</p>
      )}

      {choosing &&
        !cantrip &&
        offered.map((slot) => (
          <Action
            key={slot.level}
            onClick={() => fire(slot.level)}
            disabled={disabled || slot.remaining <= 0}
            tone="gold"
            label={`Cast at level ${slot.level}, ${slot.remaining} of ${slot.max} left`}
          >
            {levelBadge(slot.level)}
          </Action>
        ))}

      <Action
        onClick={() => (cantrip ? fire(CANTRIP_LEVEL) : setChoosing(!choosing))}
        disabled={disabled || unreachable}
        pressed={choosing}
        label={
          cantrip ? `Cast ${spell.name}` : `Choose a slot for ${spell.name}`
        }
      >
        Cast
      </Action>
    </div>
  );
}
