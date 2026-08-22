"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { parseMarkPoint } from "sina/rules/campaign";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import { clearTableMark, placeTableMark } from "./actions";
import { useTableWire, useWireMessage } from "./table-wire";

/**
 * The tokens on the board: whose they are, who may lift them, and the two
 * writes that move them.
 *
 * Keyed on the SEAT, the way everything else at this table is. At the head of
 * the table you place the party's gold token and may clear anybody's; sitting
 * as a character you place its face and may clear only that. The database is
 * asked the same question independently, in `my_seat_at_table`.
 *
 * Two ways of hearing. The wire carries the token itself and puts it down at
 * once; the Postgres subscription under it is the backstop — a socket that
 * dropped, a tab that was asleep — and it is also what reconciles, which is why
 * nothing here refreshes for itself.
 *
 * A token off the wire is an ID and a POINT. Its name and colour come out of
 * `faces`, resolved on the server, so one naming somebody who is not at this
 * table draws nothing.
 */
export function useTableMarks({ campaignId, marks, faces, seat, canSweep }) {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();
  const { send } = useTableWire();

  /*
   * The reducer takes the seat and where it went, `null` being lifted. Filtered
   * on the character rather than spliced by index, so moving a token and
   * placing the first one are the same line — and `null !== null` is false,
   * which is what carries the Dungeon Master's own chair through it.
   */
  const [shown, amend] = useOptimistic(marks, (base, change) => {
    const others = base.filter(
      (mark) => mark.characterId !== change.characterId,
    );

    return change.mark ? [...others, change.mark] : others;
  });

  /** What the wire said, and where the server had the token when it said it. */
  const [heard, setHeard] = useState(() => new Map());

  const standing = useMemo(
    () =>
      new Map(marks.map((mark) => [mark.characterId, `${mark.x},${mark.y}`])),
    [marks],
  );

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useWireMessage("mark", (message) => {
    const point =
      message.point === null
        ? null
        : parseMarkPoint(message.point?.x, message.point?.y);

    const known = faces.some(
      (face) => face.characterId === message.characterId,
    );

    if ((message.point !== null && !point) || !known) {
      return;
    }

    setHeard((current) =>
      new Map(current).set(message.characterId, {
        point,
        over: standing.get(message.characterId) ?? null,
      }),
    );
  });

  useLiveRefresh({
    channel: `marks:${campaignId}`,
    table: "campaign_marks",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });

  function run(work, told) {
    setError(null);

    startTransition(async () => {
      const result = await work();

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      // Only once it is written: a token told to the table before the database
      // has taken it is one that might yet be refused.
      send(told);
    });
  }

  function place(point) {
    if (!seat) {
      return;
    }

    run(
      async () => {
        amend({
          characterId: seat.characterId,
          mark: { ...seat, x: point.x, y: point.y },
        });

        return placeTableMark(campaignId, seat.characterId, point);
      },
      { kind: "mark", characterId: seat.characterId, point },
    );
  }

  function clear(characterId) {
    run(
      async () => {
        amend({ characterId, mark: null });

        return clearTableMark(campaignId, characterId);
      },
      { kind: "mark", characterId, point: null },
    );
  }

  return {
    /*
     * Two different questions. `mine` is the one token the board rims in gold;
     * a Dungeon Master may lift any at their table without one being theirs.
     * The database decides whether a lift actually happens.
     */
    marks: laid(shown, heard, standing, faces).map((mark) => {
      const mine = Boolean(seat) && mark.characterId === seat.characterId;

      return { ...mark, mine, removable: canSweep || mine };
    }),
    place: seat ? place : null,
    clear: seat ? clear : null,
    error,
  };
}

/**
 * The board the server sent, with what the wire has heard since laid over it.
 *
 * An entry counts only while the server still answers what it answered when the
 * message arrived, so the head start expires by itself and a token changed
 * where this wire does not reach is never hidden behind a stale one.
 */
function laid(shown, heard, standing, faces) {
  const moved = new Map();

  for (const [characterId, mark] of heard) {
    if ((standing.get(characterId) ?? null) === mark.over) {
      moved.set(characterId, mark.point);
    }
  }

  if (moved.size === 0) {
    return shown;
  }

  const kept = shown.filter((mark) => !moved.has(mark.characterId));

  for (const [characterId, point] of moved) {
    const face = point && faces.find((one) => one.characterId === characterId);

    if (face) {
      kept.push({ ...face, x: point.x, y: point.y });
    }
  }

  return kept;
}
