"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { DEFAULT_FOG_BRUSH, readFogSettings } from "sina/rules/fog";
import { readGridSettings } from "sina/rules/grid";

import { activateCampaignMap } from "@/app/actions/campaign-maps";
import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import { useToast } from "@/app/components/ui/toast";

import { ruleMapGrid } from "./actions";
import { paintMapFog, switchMapFog } from "./fog-actions";
import { readTableSlice } from "./table-actions";
import { useFogMask } from "./use-fog";
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
  isWorldMap: false,
  choose: () => {},
  grid: { enabled: false, size: 48, luminance: 1 },
  ruleGrid: () => {},
  commitGrid: () => {},
  holding: null,
  hold: () => {},
  fog: { enabled: true, maskUrl: null },
  brush: null,
  takeBrush: () => {},
  fogSize: DEFAULT_FOG_BRUSH,
  sizeBrush: () => {},
  switchFog: () => {},
  paintFog: () => {},
  mask: null,
  reportNatural: () => {},
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

  /**
   * WHAT IS HELD OVER THE BOARD, null for an empty hand. Here because the
   * palette is on the rail and the hexes are on the map.
   *
   * One of three shapes: `{ kind: "party" }`, `{ kind: "character",
   * characterId }`, or `{ kind: "template", templateId, ringColor }`. Which of
   * them a map will actually take is use-map-tokens.js's rule and the
   * migration's — this only carries what was picked up.
   */
  const [holding, setHolding] = useState(null);

  /* The brush in the other hand: `"reveal"`, `"hide"`, or null. Here for the
     reason `holding` is — the control that picks it up is in the drawer off the
     rail and the board it paints is on the far side of the map. */
  const [brush, setBrush] = useState(null);
  const [fogSize, setFogSize] = useState(DEFAULT_FOG_BRUSH);

  /* The picture's own size, reported up by the board. It is the RATIO the mask
     needs: a circle painted into a canvas of the wrong shape is an ellipse. */
  const [natural, setNatural] = useState(null);

  const reportNatural = useCallback((size) => {
    setNatural((standing) =>
      standing?.width === size?.width && standing?.height === size?.height
        ? standing
        : (size ?? null),
    );
  }, []);

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
  const fog = readFogSettings(active);
  const world = active ? active.is_world_map : true;

  /* ------------------------------------------------------------------------
   * The fog.
   * --------------------------------------------------------------------- */

  /* The mask this browser last wrote, so the loader does not fetch back the
     pixels it has just painted. */
  const painted = useRef(null);

  /** Whether anything has been stamped since the mask last reached the bucket. */
  const unsaved = useRef(false);

  const mask = useFogMask({
    mapId: active?.id ?? null,
    maskUrl: fog.maskUrl,
    natural,
    own: painted,
  });

  /** One map row, patched on this screen alone. `ruleGrid`'s shape. */
  const ruleFog = useCallback((mapId, patch) => {
    setMaps((standing) =>
      standing.map((map) => (map.id === mapId ? { ...map, ...patch } : map)),
    );
  }, []);

  /* Believed only as far as its shape: `readFogSettings` bounds it. */
  useWireMessage(
    "fog",
    useCallback(
      (message) => {
        const asked = typeof message.mapId === "string" ? message.mapId : null;

        if (!asked) {
          return;
        }

        const settled = readFogSettings(message);

        ruleFog(asked, {
          fog_enabled: settled.enabled,
          fog_mask_url: settled.maskUrl,
        });
      },
      [ruleFog],
    ),
  );

  /** Says nothing about the mask — see the RPC. */
  const switchFog = useCallback(
    (enabled) => {
      if (!active) {
        return;
      }

      const asked = Boolean(enabled);

      ruleFog(active.id, { fog_enabled: asked });
      send({
        kind: "fog",
        mapId: active.id,
        fogEnabled: asked,
        maskUrl: fog.maskUrl,
      });

      switchMapFog(active.id, asked).then(
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
    [active, fog.maskUrl, resync, ruleFog, send, show],
  );

  /** The canvas takes every stamp; the bucket takes what is on it when both
      brushes are down. The other chairs are told the URL, not the pixels. */
  const settleFog = useCallback(async () => {
    if (!active) {
      return;
    }

    const blob = await mask.serialise();

    if (!blob) {
      show("That stroke could not be saved. Try again.");
      return;
    }

    const body = new FormData();

    body.append("mask", blob, "fog-mask");

    const answer = await paintMapFog(campaignId, active.id, body).catch(
      () => null,
    );

    if (!answer || answer.kind === "rejected") {
      show(answer?.message ?? "That did not reach the table. Try again.");
      resync();
      return;
    }

    painted.current = answer.maskUrl;
    ruleFog(active.id, { fog_mask_url: answer.maskUrl });
    send({
      kind: "fog",
      mapId: active.id,
      fogEnabled: fog.enabled,
      maskUrl: answer.maskUrl,
    });
  }, [active, campaignId, fog.enabled, mask, resync, ruleFog, send, show]);

  /** A stamp onto the canvas, and a note that the bucket is behind it. Nothing
      is written here — see `takeBrush`. */
  const paintFog = useCallback(
    (from, to, mode, brush) => {
      unsaved.current = true;
      mask.stroke(from, to, mode, brush);
    },
    [mask],
  );

  /**
   * BOTH BRUSHES DOWN IS THE WRITE. Swapping one for the other is still
   * painting — opening a room and trimming its edge back is one act — so a swap
   * changes what the next stroke does and writes nothing.
   *
   * Read out of `brush` and not a `setBrush` updater: an updater must be pure,
   * React runs them more than once, and a second run would upload twice.
   */
  const takeBrush = useCallback(
    (next) => {
      if (brush && !next && unsaved.current) {
        unsaved.current = false;
        settleFog();
      }

      setBrush(next);
    },
    [brush, settleFog],
  );

  /** THE BRUSH GOES DOWN FIRST: the mask holds THIS map's light, and a switch
      replaces those pixels with the next map's. */
  const choose = useCallback(
    (mapId) => {
      const asked = mapId ?? null;

      takeBrush(null);
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
    [campaignId, resync, send, show, takeBrush],
  );

  return (
    <MapsContext.Provider
      value={{
        maps,
        activeId: active?.id ?? null,
        // `campaign_table` resolves the same fallback on the server.
        activeUrl: active?.url ?? worldUrl ?? null,
        /* WHICH KIND OF BOARD THIS IS, which is the whole of what may be put
           down on it: the world map takes the party's marker alone and every
           other map takes the faces and the invented pieces. A table with no
           shelf at all is showing its world map — see `activeUrl` above. */
        isWorldMap: world,
        choose,
        grid,
        ruleGrid,
        commitGrid,
        holding,
        hold: setHolding,

        /* The fog. `mask` is the canvas — see use-fog.js. */
        fog,
        brush,
        takeBrush,
        fogSize,
        sizeBrush: setFogSize,
        switchFog,
        paintFog,
        mask,
        reportNatural,
      }}
    >
      {children}
    </MapsContext.Provider>
  );
}
