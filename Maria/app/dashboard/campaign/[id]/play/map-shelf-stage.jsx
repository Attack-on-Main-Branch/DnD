"use client";

import MapMark from "@/app/components/ui/map-mark";

import DmMapDrawer from "./dm-map-drawer";
import RailTray from "./rail-tray";
import { useRailMarks } from "./rail-marks";
import { POPOVER_BODY_CLASSES } from "./table-popover";
import { useTableMaps } from "./table-maps";

/**
 * The maps, on the rail above the chest — AND THE HEAD OF THE TABLE'S ALONE.
 * Which picture the party is looking at is the Dungeon Master's to decide, and
 * a player has no use for a shelf they cannot reach.
 *
 * Wider than the two trays under it, because what is in it is pictures: at the
 * rail's own 26rem a two-column grid of 16:9 cards is two stamps.
 */

/** A literal, or Tailwind's scanner never sees it. See rail-marks.jsx. */
const SHELF_WIDTH_CLASSES = "w-[min(42.5rem,calc(100vw-6rem))]";

export default function MapShelfStage({ campaignId }) {
  const { maps, activeId, choose } = useTableMaps();
  const { close } = useRailMarks();

  return (
    <RailTray
      mark={<MapMark className="size-12" />}
      markLabel={`Maps, ${maps.length}`}
      title="Maps"
      meta={maps.length}
      width={SHELF_WIDTH_CLASSES}
      dialogLabel="Maps at this table"
    >
      {/* The shelf can be long, so it scrolls at the height the trays under it
          hold their panels to. */}
      <div
        className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
      >
        <DmMapDrawer
          campaignId={campaignId}
          maps={maps}
          activeId={activeId}
          onChoose={(map) => {
            choose(map.id);

            /* Out of the way at once: the answer to "which map" is the board
               behind this panel, and a drawer left standing over it is the one
               thing between the Dungeon Master and what they just chose. */
            close();
          }}
        />
      </div>
    </RailTray>
  );
}
