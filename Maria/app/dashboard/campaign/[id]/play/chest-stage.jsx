"use client";

import { useCallback } from "react";

import ChestMark from "@/app/components/ui/chest-mark";

import DmChestDrawer from "./dm-chest-drawer";
import RailTray from "./rail-tray";
import { POPOVER_BODY_CLASSES } from "./table-popover";
import { useChestItems, useContainers } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The containers, on the rail opposite the dice — AND THE HEAD OF THE TABLE'S
 * ALONE. What a player may reach is in the pack above the board.
 *
 * Beside the map rather than a mark above it: those belong to a SEAT, and the
 * shelf is the world's. The shelf's doorbells are in inventory-pack.jsx, the one
 * control both chairs mount.
 */
export default function ChestStage({ campaignId, members }) {
  const containers = useContainers();
  const chests = useChestItems();
  const { send } = useTableDeed(campaignId);

  /** What the other chairs hear once the server has taken a deed. */
  const told = useCallback(() => send({ kind: "chest" }), [send]);

  return (
    <RailTray
      mark={<ChestMark className="size-13" />}
      markLabel={`Bags and chests, ${containers.length}`}
      title="Bags and chests"
      meta={containers.length}
      dialogLabel="Containers at this table"
    >
      {/* The shelf can be long, so it scrolls at the same height the marks
          above the board hold their panels to. */}
      <div
        className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
      >
        <DmChestDrawer
          campaignId={campaignId}
          containers={containers}
          chests={chests}
          members={members}
          onTold={told}
        />
      </div>
    </RailTray>
  );
}
