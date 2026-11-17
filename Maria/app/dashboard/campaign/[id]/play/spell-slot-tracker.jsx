"use client";

import { readSpellSlots } from "sina/rules/spellcasting";

import { slotPipClasses } from "@/app/dashboard/spell-presentation";
import SpellSlotBar from "@/app/dashboard/spell-slot-bar";

import { moveSpellSlot } from "./spell-actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

export default function SpellSlotTracker({
  campaignId,
  characterId,
  slots,
  classId,
  level,
  editable = false,
  className = "",
}) {
  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  /* The stored column, read against what this class and level actually grant —
     the maximum is derived here and the one in the column is a snapshot.
     `slots` comes out of table-state.jsx now, so a pip moved here or by the
     caster's own cast is the same number in the same place. */
  const shelves = readSpellSlots(slots, classId, level);

  if (shelves.length === 0) {
    return null;
  }

  /**
   * Which way it goes is which pip it was, so the bar has no mode to be in.
   *
   * Only the head of the table ever reaches this — `restore_spell_slot` refuses
   * a character's own owner outright — so a refusal is re-read from
   * `campaign_sheets`, which is the only thing that hands a Dungeon Master
   * somebody else's slots.
   */
  function toggle(shelf, index) {
    const by = index < shelf.remaining ? 1 : -1;

    run({
      paint: () => store.moveSlot(characterId, shelf.level, by),

      work: () => moveSpellSlot(campaignId, characterId, shelf.level, by),
      tell: () => send({ kind: "slots", characterId }),
      want: { sheets: true },
    });
  }

  return (
    <SpellSlotBar
      shelves={shelves}
      className={className}
      renderPip={
        editable
          ? (shelf, index) => (
              <Pip
                key={index}
                // Full-first, so the row empties from the right.
                available={index < shelf.remaining}
                level={shelf.level}
                onToggle={() => toggle(shelf, index)}
              />
            )
          : undefined
      }
    />
  );
}

/**
 * A real `<button>` only where it can be pressed: a disabled one still takes a
 * tab stop, which on thirty pips is thirty promises a player cannot keep — so
 * everybody else gets SpellSlotBar's own inert pip instead of this.
 */
function Pip({ available, level, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!available}
      className={`cursor-pointer ${slotPipClasses(available, true)}`}
      aria-label={
        available
          ? `Expend a level ${level} slot`
          : `Recover a level ${level} slot`
      }
    />
  );
}
