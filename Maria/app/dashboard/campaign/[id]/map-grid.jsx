"use client";

import { useState } from "react";

import MapCard from "./map-card";

/**
 * Every map this campaign keeps, two to a row: the world map first, then the
 * shelf under it in the order the sheet put them there.
 *
 * A client component because a `[Change]` has to show its result. The list
 * arrives rendered from the server and is held here from then on, so swapping a
 * picture repaints one card rather than the route — the same bargain the table
 * makes, and the reason `changeCampaignMap` revalidates nothing.
 */
export default function MapGrid({ campaignId, maps, activeMapId = null }) {
  const [shelf, setShelf] = useState(maps);

  if (shelf.length === 0) {
    return (
      <p className="text-sm text-ink/50 italic">
        No maps yet. The world map and up to ten more are set on the campaign
        sheet — open the pen at the end of the tab row.
      </p>
    );
  }

  function changed(id, url) {
    setShelf((standing) =>
      standing.map((map) => (map.id === id ? { ...map, url } : map)),
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {shelf.map((map) => (
        <MapCard
          key={map.id}
          campaignId={campaignId}
          map={map}
          // On this page "active" is a fact rather than a control: it says
          // which one the table would open on, and nothing here changes it.
          active={map.id === activeMapId}
          onChanged={(url) => changed(map.id, url)}
        />
      ))}
    </div>
  );
}
