"use client";

import { useState } from "react";
import { MAX_ARMOR_CLASS, parseArmorClass } from "sina/rules/death";

import ArmorShield, {
  ARMOR_VALUE_CLASSES,
  ArmorValue,
} from "@/app/dashboard/armor-shield";

import { setArmorClass } from "./actions";
import { useArmorClass, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useTableWire } from "./table-wire";

export default function ArmorBadge({ campaignId, characterId, name, canEdit }) {
  const armorClass = useArmorClass(characterId);

  /* What is half-typed, and null whenever nothing is. The row's own figure
     shows through the moment a press is committed or abandoned, so a change
     made at another chair is not held off the card by a field nobody is in. */
  const [typed, setTyped] = useState(null);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);
  const { seat, head } = useTableWire();

  if (armorClass === null) {
    return null;
  }

  /** What was typed, or nothing at all if it is not a figure or has not moved. */
  function commit() {
    const next = parseArmorClass(typed);

    setTyped(null);

    if (next === null || next === armorClass) {
      return;
    }

    run({
      note: [
        {
          action: "armor_class_change",
          actor: head ? "Dungeon Master" : name,
          delta: next - armorClass,
          target: characterId === seat ? null : name,
        },
      ],
      paint: () => store.setArmor(characterId, next),
      work: () => setArmorClass(campaignId, characterId, next, seat),

      tell: (result) => {
        store.setArmor(characterId, result.armorClass);
        send({ kind: "armor", characterId, armorClass: result.armorClass });
      },

      want: { party: true, activity: true },
    });
  }

  return (
    <ArmorShield>
      {canEdit ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_ARMOR_CLASS}
          value={typed ?? String(armorClass)}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }

            /* Put back, and the caret left where it is. Blurring here would
               hand the half-typed figure to `commit`: this render's closure
               still holds it, whatever was just set. */
            if (event.key === "Escape") {
              event.preventDefault();
              setTyped(null);
            }
          }}
          aria-label={`${name} armour class`}
          className={`no-spin border-none bg-transparent p-0 shadow-none outline-none ${ARMOR_VALUE_CLASSES}`}
        />
      ) : (
        <ArmorValue value={armorClass} name={name} />
      )}
    </ArmorShield>
  );
}
