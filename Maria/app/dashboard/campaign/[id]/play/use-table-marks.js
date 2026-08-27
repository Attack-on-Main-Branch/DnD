"use client";

import { useCallback } from "react";
import { markKey, parseMarkPoint } from "sina/rules/campaign";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import { clearTableMark, placeTableMark } from "./actions";
import { useMarkPoints, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

/**
 * The tokens on the board: whose they are, who may lift them, and the two
 * writes that move them.
 *
 * Keyed on the SEAT, the way everything else at this table is. At the head of
 * the table you place the party's gold token and may clear anybody's; sitting
 * as a character you place its face and may clear only that. The database is
 * asked the same question independently, in `my_seat_at_table`.
 *
 * WHAT A RULED BOARD CHANGES is who may put a piece down. Off the grid every
 * chair keeps its own token; on it the Dungeon Master deals the pieces out and
 * a player may move their own but not take it off. That is `ruled`.
 *
 * A POINT AND A FACE ARE DIFFERENT THINGS, and this file is where they meet. The
 * points are held in table-state.jsx; every one is drawn from `faces`, which the
 * server resolved, so a token naming somebody who is not at this table draws
 * nothing whether it came off the socket or out of the database.
 *
 * The wire puts a token down at once. The Postgres subscription under it is the
 * backstop for a socket that dropped, and it re-reads the marks alone.
 *
 * ONE MAP'S TOKENS: the store holds every map's, and this hands back the ones
 * belonging to the picture in front of the party.
 */
export function useTableMarks({
  campaignId,
  mapId,
  ruled,
  faces,
  seat,
  canSweep,
}) {
  const points = useMarkPoints();
  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  /* Nothing off the wire is believed beyond its shape: the point goes through
     the same `parseMarkPoint` that bound the sender's own write, and the id only
     ever picks out a face this board already has from the server. */
  useWireMessage("mark", (message) => {
    const known = faces.some(
      (face) => face.characterId === message.characterId,
    );

    if (!known) {
      return;
    }

    const key = markKey(message.mapId ?? null, message.characterId);

    if (message.point === null) {
      store.setMark(key, null);
      return;
    }

    const point = parseMarkPoint(message.point?.x, message.point?.y);

    if (point) {
      store.setMark(key, {
        ...point,
        characterId: message.characterId,
        mapId: message.mapId ?? null,
        q: message.point.q ?? null,
        r: message.point.r ?? null,
      });
    }
  });

  useLiveRefresh({
    channel: `marks:${campaignId}`,
    table: "campaign_marks",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: useCallback(() => resync({ marks: true }), [resync]),
  });

  /**
   * `who` is whose token this is: the caller's own seat, or anybody's for the
   * Dungeon Master. `place_campaign_mark` asks again and decides.
   */
  const place = useCallback(
    (point, who = seat?.characterId) => {
      if (!seat) {
        return;
      }

      const key = markKey(mapId, who ?? null);
      const laid = { ...point, characterId: who ?? null, mapId: mapId ?? null };

      run({
        // Under the pointer before the write is even sent.
        paint: () => store.setMark(key, laid),

        work: () => placeTableMark(campaignId, who ?? null, mapId, point),

        // Only once it is written: a token told to the table before the
        // database has taken it is one that might yet be refused.
        tell: () =>
          send({
            kind: "mark",
            characterId: who ?? null,
            mapId: mapId ?? null,
            point,
          }),

        want: { marks: true },
      });
    },
    [campaignId, mapId, run, seat, send, store],
  );

  const clear = useCallback(
    (characterId) => {
      const key = markKey(mapId, characterId ?? null);

      run({
        paint: () => store.setMark(key, null),

        work: () => clearTableMark(campaignId, characterId ?? null, mapId),
        tell: () =>
          send({
            kind: "mark",
            characterId: characterId ?? null,
            mapId: mapId ?? null,
            point: null,
          }),
        want: { marks: true },
      });
    },
    [campaignId, mapId, run, send, store],
  );

  /* Three questions about one piece: `mine` is the one rimmed in gold,
     `movable` is whose hand may drag it, `removable` is whose may take it off.
     The database decides each of them again. */
  const shown = laid(points, faces, mapId).map((mark) => {
    const mine = Boolean(seat) && mark.characterId === seat.characterId;

    return {
      ...mark,
      mine,
      movable: canSweep || mine,
      removable: canSweep || (mine && !ruled),
    };
  });

  return {
    marks: shown,

    /** This chair's own piece on this map, or null for one not yet down. */
    ownMark: seat ? (shown.find((mark) => mark.mine) ?? null) : null,

    /** Whether a click on bare map puts this chair's own piece down. */
    mayPlaceOwn: Boolean(seat) && (canSweep || !ruled),

    place: seat ? place : null,
    clear: seat ? clear : null,
  };
}

/**
 * Every point that has a face to wear. A token belonging to somebody who has
 * left the party draws nothing — the migration's trigger clears those on
 * leaving, and this covers the moment before that reaches this browser.
 */
function laid(points, faces, mapId) {
  const drawn = [];

  for (const mark of points.values()) {
    // This map's alone.
    if ((mark.mapId ?? null) !== (mapId ?? null)) {
      continue;
    }

    const face = faces.find((one) => one.characterId === mark.characterId);

    if (face) {
      drawn.push({ ...face, x: mark.x, y: mark.y });
    }
  }

  return drawn;
}
