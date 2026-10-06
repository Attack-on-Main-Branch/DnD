"use client";

import { MAX_SCENES } from "sina/rules/scene";

import MapCard from "../map-card";

/**
 * The shelf, at the table. Two to a row, the one on the board wearing a lit
 * gold frame, and every card carrying its own `[Change]` so a picture can be
 * swapped mid-session without anybody leaving.
 *
 * The cards are the campaign sheet's own — see map-card.jsx. What differs here
 * is that pressing one does something: `onChoose` is what turns a listing into
 * a switcher, and it closes the drawer behind it because the answer to "which
 * map" is on the board, not in this panel.
 *
 * Painted scenes sit under the maps, in their own four slots. The grid and the
 * fog are not in here: they rule the map on the table, so they sit under the
 * board — see map-tools.jsx.
 */
export default function DmMapDrawer({ campaignId, maps, activeId, onChoose }) {
  const shelf = maps.filter((map) => !map.is_scene);
  const scenes = maps
    .filter((map) => map.is_scene)
    .sort((one, two) => one.created_at.localeCompare(two.created_at));

  if (shelf.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-sm text-ink/50 italic">
        No maps on the shelf. Hang some on the campaign sheet and they appear
        here.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {shelf.map((map) => (
          <MapCard
            key={map.id}
            campaignId={campaignId}
            map={map}
            active={map.id === activeId}
            onChoose={() => onChoose(map)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Scenes
        </h3>

        <p className="font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
          {scenes.length} of {MAX_SCENES}
        </p>
      </div>

      <p className="mt-1 mb-3 text-xs text-ink/50">
        {scenes.length < MAX_SCENES
          ? "Painted from the camera in the Scene tray."
          : "Full: the next scene replaces the oldest one not on the table."}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {scenes.map((map) => (
          <MapCard
            key={map.id}
            campaignId={campaignId}
            map={map}
            active={map.id === activeId}
            changeable={false}
            onChoose={() => onChoose(map)}
          />
        ))}

        {Array.from({ length: Math.max(0, MAX_SCENES - scenes.length) }).map(
          (_, at) => (
            <div
              key={`empty-${at}`}
              aria-hidden="true"
              className="aspect-video rounded-xl border border-dashed border-gold/20"
            />
          ),
        )}
      </div>
    </>
  );
}
