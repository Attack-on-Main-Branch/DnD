"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { readGridSettings } from "sina/rules/grid";

import { activateCampaignMap } from "@/app/actions/campaign-maps";
import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import { useToast } from "@/app/components/ui/toast";

import { ruleMapGrid } from "./actions";
import { readTableSlice } from "./table-actions";
import { useWireMessage, useTableWire } from "./table-wire";

/**
 * What the table is looking at, and the shelf it can be changed to.
 *
 * NOTHING HERE REFRESHES A ROUTE. A switch paints locally, goes out on the
 * table's channel, and is written — in that order, so it lands like a hand
 * moving a picture rather than a page load.
 *
 * AN ID TRAVELS, NEVER A URL: nothing off the wire has been through a
 * `select()` list, and an id only ever picks out a row this chair already has.
 * `campaigns` and `campaign_maps` are both published, so a chair that missed
 * the broadcast is told by Postgres and answers with `resync`.
 */

const RESTING = {
  maps: [],
  activeId: null,
  activeUrl: null,
  choose: () => {},
  grid: { enabled: false, size: 48, luminance: 1 },
  ruleGrid: () => {},
  commitGrid: () => {},
  holding: null,
  hold: () => {},
};

const MapsContext = createContext(RESTING);

export function useTableMaps() {
  return useContext(MapsContext);
}

export default function TableMaps({
  campaignId,
  maps: served,
  activeId: servedActive,
  worldUrl,
  children,
}) {
  const [maps, setMaps] = useState(served);
  const [activeId, setActiveId] = useState(servedActive ?? null);

  const { send } = useTableWire();
  const { show } = useToast();

  /* Whose token is held over the board, null for an empty hand. Here because
     the palette is on the rail and the hexes are on the map. */
  const [holding, setHolding] = useState(null);

  /** The database's own answer, for a chair that cannot be sure. */
  const resync = useCallback(() => {
    readTableSlice(campaignId, { maps: true }).then(
      (slices) => {
        if (slices?.maps) {
          setMaps(slices.maps);
        }

        if (slices?.activeMapId !== undefined) {
          setActiveId(slices.activeMapId);
        }
      },
      () => {},
    );
  }, [campaignId]);

  /* A map ruled. Believed only as far as its shape; `readGridSettings` bounds
     every value on the way in. */
  useWireMessage(
    "grid",
    useCallback((message) => {
      const asked = typeof message.mapId === "string" ? message.mapId : null;

      if (!asked) {
        return;
      }

      setMaps((standing) =>
        standing.map((map) =>
          map.id === asked
            ? {
                ...map,
                grid_enabled: Boolean(message.enabled),
                grid_size: message.size,
                grid_luminance: message.luminance,
              }
            : map,
        ),
      );
    }, []),
  );

  /* Somebody reached for a different map. An id this chair has no row for
     changes nothing; null is the world map put back. */
  useWireMessage(
    "map",
    useCallback(
      (message) => {
        const asked = typeof message.mapId === "string" ? message.mapId : null;

        if (asked === null || maps.some((map) => map.id === asked)) {
          setActiveId(asked);
          return;
        }

        // A map added since this page rendered: the shelf is what is stale.
        resync();
      },
      [maps, resync],
    ),
  );

  /* Doorbells, not payloads: a row off the socket has not been through a
     `select()` list, so the answer is to go and ask. */
  useLiveRefresh({
    channel: `maps:${campaignId}`,
    table: "campaign_maps",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: resync,
  });

  useLiveRefresh({
    channel: `table-map:${campaignId}`,
    table: "campaigns",
    filter: `id=eq.${campaignId}`,
    onChange: resync,
  });

  const choose = useCallback(
    (mapId) => {
      const asked = mapId ?? null;

      setActiveId(asked);
      send({ kind: "map", mapId: asked });

      activateCampaignMap(campaignId, asked).then(
        (answer) => {
          if (answer?.kind === "rejected") {
            show(answer.message);
            resync();
          }
        },
        () => {
          show("That did not reach the table. Try again.");
          resync();
        },
      );
    },
    [campaignId, resync, send, show],
  );

  /* What is actually on the board: a campaign nobody has switched has no
     `active_map_id` and is showing its world map. */
  const active =
    maps.find((map) => map.id === activeId) ??
    maps.find((map) => map.is_world_map) ??
    null;

  /**
   * The grid as the sliders move it, on this screen alone. DEFERRED COMMIT: a
   * drag is two hundred frames, so it paints locally and the release is what
   * reaches the database and the other chairs.
   */
  const ruleGrid = useCallback(
    (patch) => {
      if (!active) {
        return;
      }

      setMaps((standing) =>
        standing.map((map) =>
          map.id === active.id ? { ...map, ...patch } : map,
        ),
      );
    },
    [active],
  );

  /**
   * `patch` is for the toggle, which changes and commits in one breath: `active`
   * is this render's row, so reading it after `ruleGrid` would write back the
   * value being replaced. The sliders commit on release and pass nothing.
   */
  const commitGrid = useCallback(
    (patch = null) => {
      if (!active) {
        return;
      }

      const settled = readGridSettings({ ...active, ...patch });

      send({
        kind: "grid",
        mapId: active.id,
        enabled: settled.enabled,
        size: settled.size,
        luminance: settled.luminance,
      });

      ruleMapGrid(active.id, settled).then(
        (answer) => {
          if (answer?.kind === "rejected") {
            show(answer.message);
            resync();
          }
        },
        () => {
          show("That did not reach the table. Try again.");
          resync();
        },
      );
    },
    [active, resync, send, show],
  );

  const grid = readGridSettings(active);

  // An empty hand the moment there are no cells to place into.
  if (!grid.enabled && holding !== null) {
    setHolding(null);
  }

  return (
    <MapsContext.Provider
      value={{
        maps,
        activeId: active?.id ?? null,
        // `campaign_table` resolves the same fallback on the server.
        activeUrl: active?.url ?? worldUrl ?? null,
        choose,
        grid,
        ruleGrid,
        commitGrid,
        holding,
        hold: setHolding,
      }}
    >
      {children}
    </MapsContext.Provider>
  );
}
