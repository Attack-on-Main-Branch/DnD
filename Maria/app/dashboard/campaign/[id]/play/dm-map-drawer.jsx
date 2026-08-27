"use client";

import MapCard from "../map-card";

import GridRibbon from "./grid-ribbon";

/**
 * The shelf, at the table. Two to a row, the one on the board wearing a lit
 * gold frame, and every card carrying its own `[Change]` so a picture can be
 * swapped mid-session without anybody leaving.
 *
 * The cards are the campaign sheet's own — see map-card.jsx. What differs here
 * is that pressing one does something: `onChoose` is what turns a listing into
 * a switcher, and it closes the drawer behind it because the answer to "which
 * map" is on the board, not in this panel.
 */
export default function DmMapDrawer({ campaignId, maps, activeId, onChoose }) {
  if (maps.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-sm text-ink/50 italic">
        No maps on the shelf. Hang some on the campaign sheet and they appear
        here.
      </p>
    );
  }

  return (
    <>
      {/* Above the shelf, because it rules whichever map is ON THE TABLE rather
          than whichever card is under the pointer. */}
      <GridRibbon />

      <div className="grid grid-cols-2 gap-4">
        {maps.map((map) => (
          <MapCard
            key={map.id}
            campaignId={campaignId}
            map={map}
            active={map.id === activeId}
            onChoose={() => onChoose(map)}
          />
        ))}
      </div>
    </>
  );
}
