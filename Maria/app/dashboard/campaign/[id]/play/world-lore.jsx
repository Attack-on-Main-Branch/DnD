"use client";

import { useMemo } from "react";

import WorldGlobe from "@/app/components/ui/world-globe";

import CampaignMap from "../campaign-map";
import TablePopover, { POPOVER_BODY_CLASSES } from "./table-popover";
import { usePlacedTokens } from "./table-state";

/**
 * The globe above the map, and the world behind it: what the Dungeon Master
 * wrote on the creation sheet, and the world map itself under it.
 *
 * THE SAME MAP THE CAMPAIGN SHEET PRINTS, in the same component — preview,
 * vignette, "click for full resolution", and the frame that grows out of it.
 * There is no second version of that to drift from this one.
 *
 * IT IS THIS CHAIR'S ALONE. Every other way to look at a map at this table
 * changes what the TABLE is looking at: the shelf on the rail broadcasts a
 * switch to every chair, and only the Dungeon Master has it. This one is a
 * player opening a picture on their own screen — nothing is sent, nothing is
 * written, and the board behind it goes on showing whatever the session is on.
 * Which is the point: the world map is the thing you want to check mid-fight
 * without taking the fight off the table.
 *
 * ALWAYS THE WORLD MAP, and never the active one. `campaign_table` hands this
 * route `map_url` already resolved to whatever is ON the table — see
 * 20260920090000 — so the world map is read off the shelf instead. page.jsx
 * does that.
 *
 * AND THE PARTY IS STANDING ON IT, off the same row the board reads — which is
 * the point of it: this panel is how a player checks where the party is while
 * the table is looking at a battle map.
 *
 * WHAT LOADS, AND WHEN. The preview goes through `next/image`, so what the page
 * fetches is a 640px re-encode of it rather than the megabytes the board is
 * drawing; the full-resolution picture is not fetched at all until somebody
 * reaches for the preview, and once fetched it stays mounted. So the panel opens
 * on a picture that is already there, and opening it a second time costs
 * nothing. See `prepare` in campaign-map.jsx.
 */
export default function WorldLore({ title, lore, mapId, mapUrl }) {
  const placed = usePlacedTokens();

  const party = useMemo(() => standingOn(placed, mapId), [mapId, placed]);

  return (
    <TablePopover
      icon={WorldGlobe}
      label={`World lore of ${title}`}
      title={`The world of ${title}`}
    >
      {/* The shared height once there is a map to hold — the same one every
          other mark on this strip stands at, so moving between them does not
          resize the box. Without one it keeps the short panel it always had:
          a campaign with no map and no lore should not open onto a screenful
          of nothing. */}
      <div
        className={`scroll-gold overflow-y-auto ${
          mapUrl ? POPOVER_BODY_CLASSES : "max-h-80"
        }`}
      >
        <div className="flex flex-col gap-5 px-5 py-4">
          {lore ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink/80">
              {lore}
            </p>
          ) : (
            <div className="py-4 text-center">
              <p className="font-display text-base font-medium tracking-wide text-ink/80">
                Nothing is known of this world
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink/50">
                No lore was written for this campaign.
              </p>
            </div>
          )}

          {mapUrl && (
            <section>
              <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
                World map
              </h3>

              <div className="mt-3">
                <CampaignMap url={mapUrl} title={title} mark={party} />
              </div>
            </section>
          )}
        </div>
      </div>
    </TablePopover>
  );
}

/**
 * Matched on the MAP as well as the marker: the store holds every map's pieces.
 * A hidden marker is in no player's store at all — the SELECT policy withholds
 * the row — so it only ever answers on the Dungeon Master's own screen.
 */
function standingOn(placed, mapId) {
  if (!mapId) {
    return null;
  }

  for (const token of placed.values()) {
    if (token.mapId === mapId && token.isPartyMarker) {
      return { x: token.x, y: token.y, isHidden: token.isHidden };
    }
  }

  return null;
}
