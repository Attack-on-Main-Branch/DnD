"use client";

import { useState } from "react";

import { parseQuantity } from "sina/rules/inventory";

import { controlClasses } from "@/app/components/ui/field-styles";
import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import {
  containerTagClasses,
  containerTypeLabel,
  CONTAINER_CARD_CLASSES,
} from "@/app/dashboard/container-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";

import { lootChestItem } from "./chest-actions";
import { Action } from "./pack-controls";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The chests a player may open, as sections of their own pack.
 *
 * IN THE PACK AND NOT ON THE RAIL: the rail beside the map is the head of the
 * table's, and what comes out of a chest lands in this very drawer — so a chest
 * is one more place a stack of theirs can be.
 *
 * The list is already decided before it reaches here: the SELECT policy,
 * `canOpenContainer` and `take_chest_item` each ask the same question.
 *
 * TAKING IS ONE PRESS AND A NUMBER, not a confirmation: nothing is destroyed,
 * unlike using or dropping, which is why those two ask first.
 */
export default function PlayerChestDrawer({
  campaignId,
  characterId,
  actorName,
  chests,
  contents,
  onTold,
}) {
  const store = useTableStore();
  const { run } = useTableDeed(campaignId);

  const [open, setOpen] = useState(null);

  /* How many, per row rather than per drawer: two stacks open at once are two
     amounts, and a field shared between them would answer for the wrong one. */
  const [typed, setTyped] = useState({});

  function take(container, row) {
    const item = rowItem(row);
    const wanted = parseQuantity(typed[row.id]) ?? 1;
    const quantity = Math.min(Math.max(1, wanted), row.quantity);

    setTyped((held) => ({ ...held, [row.id]: "" }));

    run({
      /* Shown until the real list lands; `take_chest_item` builds the kept
         one, and its names come from rows. */
      note: [
        {
          action: "chest_looted",
          actor: actorName,
          container: container.name,
          item: item.name,
          quantity,
        },
      ],

      paint: () => {
        store.moveChest(container.id, item, -quantity);
        // Into the pack and never into a bag, exactly as the function does it.
        store.movePack(characterId, item, quantity, null);
      },

      work: () =>
        lootChestItem(campaignId, container.id, row.id, characterId, quantity),

      tell: onTold,

      want: {
        containers: true,
        inventory: true,
        activity: true,
        characterIds: [characterId],
      },
    });
  }

  // Nothing rather than an empty state: the pack above already has one.
  if (chests.length === 0) {
    return null;
  }

  return (
    <>
      {chests.map((container) => {
        const expanded = open === container.id;
        const inside = contents[container.id] ?? [];

        return (
          <section
            key={container.id}
            aria-label={container.name}
            /* The open one is lit, as a chosen tile is in the character
               creator: the list below belongs to this card and no other. */
            className={`mt-3 transition duration-300 ${CONTAINER_CARD_CLASSES} ${
              expanded ? NESTED_CARD_SELECTED_CLASSES : ""
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setOpen((standing) =>
                  standing === container.id ? null : container.id,
                )
              }
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-ink">
                {container.name}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-ink/45 tabular-nums">
                  {inside.length}
                </span>

                <span className={containerTagClasses(container.type)}>
                  {containerTypeLabel(container.type)}
                </span>
              </span>
            </button>

            {expanded && (
              <div className="mt-3 border-t border-gold/15 pt-3">
                {inside.length === 0 ? (
                  <p className="text-xs text-ink/50 italic">
                    Empty. Somebody has been here before you.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {inside.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-2 rounded-lg border border-gold/15 bg-surface/50 px-2.5 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate font-display text-xs tracking-wide text-ink/85">
                          {row.name}
                        </span>

                        <span className="shrink-0 font-mono text-[10px] text-ink/45 tabular-nums">
                          of {row.quantity}
                        </span>

                        {/* Width on the wrapper: `controlClasses` carries
                            `w-full`. */}
                        <div className="w-14 shrink-0">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={typed[row.id] ?? ""}
                            placeholder="1"
                            onChange={(event) =>
                              setTyped((held) => ({
                                ...held,
                                [row.id]: event.target.value,
                              }))
                            }
                            aria-label={`How many ${row.name} to take`}
                            className={controlClasses({
                              className: "px-2 py-1 text-center tabular-nums",
                            })}
                          />
                        </div>

                        <Action
                          onClick={() => take(container, row)}
                          tone="gold"
                          label={`Take ${row.name} from ${container.name}`}
                        >
                          Take
                        </Action>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
