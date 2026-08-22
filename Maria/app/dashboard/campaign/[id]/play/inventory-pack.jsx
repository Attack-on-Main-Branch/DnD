"use client";

import TravellingPack from "@/app/components/ui/travelling-pack";

import TablePopover from "./table-popover";

/**
 * The pack beside the scroll, and what is in it — which for now is nothing.
 * Items are not a table in the database yet, so this says so in the same words
 * the character sheet's Inventory tab uses.
 *
 * A Client Component only because TablePopover is one.
 */
export default function InventoryPack({ seat }) {
  return (
    <TablePopover
      icon={TravellingPack}
      label={`Inventory as ${seat.title}`}
      title={`${seat.title}\u2019s pack`}
    >
      <div className="px-5 py-8 text-center">
        <p className="font-display text-base font-medium tracking-wide text-ink/80">
          The pack is empty
        </p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-ink/50">
          Items, coin and equipment will live here once loot exists.
        </p>
      </div>
    </TablePopover>
  );
}
