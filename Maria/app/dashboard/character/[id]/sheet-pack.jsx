"use client";

import { useMemo, useState } from "react";

import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import {
  containerTagClasses,
  containerTypeLabel,
  CONTAINER_CARD_CLASSES,
} from "@/app/dashboard/container-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import ItemDetail from "@/app/dashboard/item-detail";
import ItemRow from "@/app/dashboard/item-row";
import { EmptyPack } from "@/app/dashboard/pack-item-card";

/**
 * The Inventory tab, drawn the way the pack above the map is: a name and a
 * count per line, the bags and the chests folded up under them, and whatever is
 * pressed read out in full at the foot.
 *
 * IT USED TO BE A GRID OF CARDS, which is a different thing entirely — a card
 * spends four lines describing one rope, so a full pack ran off the bottom of
 * the sheet and the same pack at the table fitted in a panel a third the width.
 * Two drawings of one pack meant nobody could carry what they had learnt from
 * one to the other, and the table's is the one people actually play out of.
 *
 * READ-ONLY, DELIBERATELY: an item is used, dropped or handed over at a table,
 * in front of whoever is running it. Every verb lives in the pack above the map;
 * what is here is the reading.
 *
 * A stack is keyed on `(character, slug, container)` in the database, so rope in
 * the Bag of Holding and rope in the pack are two lines and must never be shown
 * as one — which is why what is open is held as a slug AND the place it was read
 * from.
 */
export default function SheetPack({ items, containers, chestItems }) {
  const [reading, setReading] = useState(null);
  const [openContainer, setOpenContainer] = useState(null);

  /* The pack itself, then one list per bag, in one pass over the rows. */
  const carried = useMemo(() => {
    const loose = [];
    const inBags = new Map();

    for (const row of items) {
      if (row.container_id) {
        const held = inBags.get(row.container_id);

        if (held) {
          held.push(row);
        } else {
          inBags.set(row.container_id, [row]);
        }
      } else {
        loose.push(row);
      }
    }

    return { loose, inBags };
  }, [items]);

  const open = reading?.item ?? null;

  function show(item, containerId = null) {
    setReading((standing) =>
      standing?.item.slug === item.slug &&
      (standing.containerId ?? null) === containerId
        ? null
        : { item, containerId },
    );
  }

  /** Whether this line is the one being read out below. */
  function isOpen(item, containerId) {
    return (
      reading?.item.slug === item.slug &&
      (reading.containerId ?? null) === containerId
    );
  }

  if (items.length === 0 && containers.length === 0) {
    return (
      <EmptyPack description="What you are given or pick up at a table will be here." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Carried">
        <p className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
          {carried.loose.length} carried
        </p>

        {carried.loose.length === 0 ? (
          <p className="mt-2.5 text-xs text-ink/50 italic">
            Nothing in hand — it is all in the bags below.
          </p>
        ) : (
          <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {carried.loose.map((held) => {
              const item = rowItem(held);

              return (
                <li key={held.id} className="flex">
                  <ItemRow
                    item={item}
                    quantity={held.quantity}
                    open={isOpen(item, null)}
                    onOpen={() => show(item, null)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {containers.map((container) => {
        /* A bag's contents are rows of this character's own pack; a chest's are
           rows of the chest, which nobody is carrying. Two tables, one shape —
           see `rowItem`. */
        const inside =
          container.type === "bag"
            ? (carried.inBags.get(container.id) ?? [])
            : (chestItems[container.id] ?? []);

        const unfolded = openContainer === container.id;

        return (
          <section
            key={container.id}
            aria-label={container.name}
            /* The open one is lit, as a chosen tile is in the character
               creator: the list below belongs to this section and no other. */
            className={`transition duration-300 ${CONTAINER_CARD_CLASSES} ${
              unfolded ? NESTED_CARD_SELECTED_CLASSES : ""
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setOpenContainer((standing) =>
                  standing === container.id ? null : container.id,
                )
              }
              aria-expanded={unfolded}
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

            {unfolded && (
              <div className="mt-3 border-t border-gold/15 pt-3">
                {inside.length === 0 ? (
                  <p className="text-xs text-ink/50 italic">
                    {container.type === "chest"
                      ? "Empty. Somebody has been here before you."
                      : "Nothing in it yet."}
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {inside.map((held) => {
                      const item = rowItem(held);

                      return (
                        <li key={held.id} className="flex">
                          <ItemRow
                            item={item}
                            quantity={held.quantity}
                            open={isOpen(item, container.id)}
                            onOpen={() => show(item, container.id)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Under the whole list rather than under the section it came from: the
          panel is the same object wherever the press landed, which is how the
          table draws it. No children, so it ends at the description — the deeds
          it would carry are not this page's to offer. */}
      {open && (
        <ItemDetail
          item={open}
          quantity={quantityOf(reading, items, chestItems)}
        />
      )}
    </div>
  );
}

/**
 * How many of the open stack there are, read back out of the list rather than
 * kept beside it: the row is the truth, and a figure copied when it was pressed
 * would go stale under a page that refreshes.
 */
function quantityOf(reading, items, chestItems) {
  if (!reading) {
    return undefined;
  }

  const { item, containerId } = reading;

  const inPack = items.find(
    (row) =>
      row.item_slug === item.slug &&
      (row.container_id ?? null) === (containerId ?? null),
  );

  if (inPack) {
    return inPack.quantity;
  }

  return (chestItems[containerId] ?? []).find(
    (row) => row.item_slug === item.slug,
  )?.quantity;
}
