"use client";

import MapMark from "@/app/components/ui/map-mark";

import DmMapDrawer from "./dm-map-drawer";
import DmTray from "./dm-tray";
import { useDmMarks } from "./dm-marks";
import { useTableMaps } from "./table-maps";

/**
 * The maps, in the head of the table's box — AND THE HEAD OF THE TABLE'S
 * ALONE. Which picture the party is looking at is the Dungeon Master's to
 * decide, and a player has no use for a shelf they cannot reach.
 */
export default function MapShelfStage({ campaignId }) {
  const { maps, activeId, choose } = useTableMaps();
  const { close } = useDmMarks();

  return (
    <DmTray
      mark={<MapMark className="size-12" />}
      markLabel={`Maps, ${maps.length}`}
      title="Maps"
      meta={maps.length}
      panelLabel="Maps at this table"
    >
      {/* No height of its own: the box scrolls a long shelf. */}
      <div className="px-5 pt-4 pb-5">
        <DmMapDrawer
          campaignId={campaignId}
          maps={maps}
          activeId={activeId}
          onChoose={(map) => {
            choose(map.id);

            /* Folded away at once: the answer to "which map" is the board,
               and the log under this panel gets its room back. */
            close();
          }}
        />
      </div>
    </DmTray>
  );
}
