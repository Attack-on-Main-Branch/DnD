"use client";

import { useCallback } from "react";
import { parseMarkPoint } from "sina/rules/campaign";

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
 * A POINT AND A FACE ARE DIFFERENT THINGS, and this file is where they meet. The
 * points are held in table-state.jsx; every one is drawn from `faces`, which the
 * server resolved, so a token naming somebody who is not at this table draws
 * nothing whether it came off the socket or out of the database.
 *
 * The wire puts a token down at once. The Postgres subscription under it is the
 * backstop for a socket that dropped, and it re-reads the marks alone.
 */
export function useTableMarks({ campaignId, faces, seat, canSweep }) {
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

    if (message.point === null) {
      store.setMark(message.characterId, null);
      return;
    }

    const point = parseMarkPoint(message.point?.x, message.point?.y);

    if (point) {
      store.setMark(message.characterId, point);
    }
  });

  useLiveRefresh({
    channel: `marks:${campaignId}`,
    table: "campaign_marks",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: useCallback(() => resync({ marks: true }), [resync]),
  });

  const place = useCallback(
    (point) => {
      if (!seat) {
        return;
      }

      run({
        // Under the pointer before the write is even sent.
        paint: () => store.setMark(seat.characterId, point),

        work: () => placeTableMark(campaignId, seat.characterId, point),

        // Only once it is written: a token told to the table before the
        // database has taken it is one that might yet be refused.
        tell: () =>
          send({ kind: "mark", characterId: seat.characterId, point }),

        want: { marks: true },
      });
    },
    [campaignId, run, seat, send, store],
  );

  const clear = useCallback(
    (characterId) => {
      run({
        paint: () => store.setMark(characterId, null),

        work: () => clearTableMark(campaignId, characterId),
        tell: () => send({ kind: "mark", characterId, point: null }),
        want: { marks: true },
      });
    },
    [campaignId, run, send, store],
  );

  return {
    /*
     * Two different questions. `mine` is the one token the board rims in gold;
     * a Dungeon Master may lift any at their table without one being theirs.
     * The database decides whether a lift actually happens.
     */
    marks: laid(points, faces).map((mark) => {
      const mine = Boolean(seat) && mark.characterId === seat.characterId;

      return { ...mark, mine, removable: canSweep || mine };
    }),
    place: seat ? place : null,
    clear: seat ? clear : null,
  };
}

/**
 * Every point that has a face to wear. A token belonging to somebody who has
 * left the party draws nothing — the migration's trigger clears those on
 * leaving, and this covers the moment before that reaches this browser.
 */
function laid(points, faces) {
  const drawn = [];

  for (const [characterId, point] of points) {
    const face = faces.find((one) => one.characterId === characterId);

    if (face) {
      drawn.push({ ...face, x: point.x, y: point.y });
    }
  }

  return drawn;
}
