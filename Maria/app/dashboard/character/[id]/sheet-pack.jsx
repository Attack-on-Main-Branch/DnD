"use client";

import { useMemo, useState } from "react";

import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import CoinPiles from "@/app/dashboard/campaign/[id]/play/coin-piles";
import { CONTAINER_CARD_CLASSES } from "@/app/dashboard/container-presentation";
import ContainerToggle from "@/app/dashboard/container-toggle";
import DetailOverlay from "@/app/dashboard/detail-overlay";
import { EmptyPack } from "@/app/dashboard/empty-catalogue";
import {
  itemsByContainer,
  rowItem,
} from "@/app/dashboard/inventory-presentation";
import ItemDetail from "@/app/dashboard/item-detail";
import ItemRow from "@/app/dashboard/item-row";

export default function SheetPack({ items, containers, chestItems }) {
  const [reading, setReading] = useState(null);
  const [openContainer, setOpenContainer] = useState(null);
  const [openCoin, setOpenCoin] = useState(null);

  const carried = useMemo(() => itemsByContainer(items), [items]);
  const loose = carried.get(null) ?? [];

  function contentsOf(containerId) {
    return carried.get(containerId) ?? chestItems[containerId] ?? [];
  }

  const open = reading
    ? contentsOf(reading.containerId).find((row) => row.id === reading.id)
    : null;

  if (items.length === 0 && containers.length === 0) {
    return (
      <EmptyPack description="What you are given or pick up at a table will be here." />
    );
  }

  function rows(held, containerId = null) {
    return (
      <ul className="grid grid-cols-2 gap-2">
        {held.map((row) => (
          <li key={row.id} className="flex">
            <ItemRow
              item={rowItem(row)}
              quantity={row.quantity}
              inHand={row.in_hand}
              open={
                reading?.containerId === containerId && reading.id === row.id
              }
              onOpen={() => setReading({ id: row.id, containerId })}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Carried">
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-ink/45 uppercase">
          {loose.length} carried
        </p>
        <div className="mt-2.5">
          {loose.length > 0 ? (
            rows(loose)
          ) : (
            <p className="text-xs text-ink/50 italic">
              Nothing loose — it is all in the bags below.
            </p>
          )}
        </div>
      </section>

      {containers.map((container) => {
        const inside = contentsOf(container.id);
        const unfolded = openContainer === container.id;
        const coinPiles = Object.values(container.purse ?? {}).filter(
          Boolean,
        ).length;

        return (
          <section
            key={container.id}
            aria-label={container.name}
            className={`transition duration-300 ${CONTAINER_CARD_CLASSES} ${
              unfolded ? NESTED_CARD_SELECTED_CLASSES : ""
            }`}
          >
            <ContainerToggle
              container={container}
              count={inside.length + coinPiles}
              open={unfolded}
              onClick={() => {
                setOpenCoin(null);
                setOpenContainer((standing) =>
                  standing === container.id ? null : container.id,
                );
              }}
            />

            {unfolded && (
              <div className="mt-3 flex flex-col gap-3 border-t border-gold/15 pt-3">
                {coinPiles > 0 && (
                  <CoinPiles
                    purse={container.purse}
                    open={openCoin}
                    onSelect={setOpenCoin}
                  />
                )}
                {inside.length > 0
                  ? rows(inside, container.id)
                  : coinPiles === 0 && (
                      <p className="text-xs text-ink/50 italic">
                        {container.type === "chest"
                          ? "Empty. Somebody has been here before you."
                          : "Nothing in it yet."}
                      </p>
                    )}
              </div>
            )}
          </section>
        );
      })}

      <DetailOverlay title={open?.name} onClose={() => setReading(null)}>
        {open && <ItemDetail item={rowItem(open)} quantity={open.quantity} />}
      </DetailOverlay>
    </div>
  );
}
