"use client";

import { readSpellSlots } from "sina/rules/spellcasting";

import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";
import { slotPipClasses } from "@/app/dashboard/spell-presentation";
import SpellSlotBar from "@/app/dashboard/spell-slot-bar";

import { moveSpellSlot } from "./spell-actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The slot bar at the foot of the book, always in view. The clusters and the
 * pips are SpellSlotBar's — the character sheet reads the same bar — and what is
 * here is the chair: whose slots, and whether this one may move them.
 *
 * It is pinned by LAYOUT and not by `position: sticky`, and the difference is
 * the whole reason it stopped reading as a dark slab. A sticky bar sits inside
 * the scroll box and needs a backdrop of its own to stop rows passing behind
 * it — and `--surface-96` laid over a panel that is already `--surface-96`
 * composites darker than either, in a full-width band with a hard edge. This
 * one is the drawer's second flex child, outside the scrolling area, so nothing
 * can pass behind it and it needs no backdrop at all.
 *
 * The rule above it reaches the panel's edges, as the header's does: the
 * drawers render this OUTSIDE their `px-5` column for exactly that.
 *
 * IT IS A READ-OUT FOR A PLAYER. Slots leave by being cast and come back from
 * the head of the table, and `restore_spell_slot` refuses an owner outright —
 * so this is not a UI decision a browser could talk its way out of. `editable`
 * is the Dungeon Master's chair.
 */
export default function SpellSlotTracker({
  campaignId,
  characterId,
  slots,
  classId,
  level,
  editable = false,
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
    <div>
      {/* The line that makes this the foot of the book. */}
      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      <SpellSlotBar
        shelves={shelves}
        className="mx-5 mt-4 mb-5"
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
    </div>
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
