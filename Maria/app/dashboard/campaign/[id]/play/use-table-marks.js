"use client";

import { useRouter } from "next/navigation";
import { useCallback, useOptimistic, useState, useTransition } from "react";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import { clearTableMark, placeTableMark } from "./actions";

/**
 * The tokens on the board: whose they are, who may lift them, and the two
 * writes that move them.
 *
 * Keyed on the SEAT, the way everything else at this table is. At the head of
 * the table you place the party's gold token and may clear anybody's; sitting
 * as a character you place its face and may clear only that. The database is
 * asked the same question independently, in `my_seat_at_table`.
 *
 * `useOptimistic` rather than local state seeded from the props: the marks
 * change under us when somebody else marks the map, and a refusal reverts by
 * itself. The subscription is what makes the board shared — a mark that only
 * arrived on the next reload would be said to nobody.
 */
export function useTableMarks({ campaignId, marks, seat, canSweep }) {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();

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

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useLiveRefresh({
    channel: `marks:${campaignId}`,
    table: "campaign_marks",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });

  function run(work) {
    setError(null);

    startTransition(async () => {
      const result = await work();

      if (result?.kind === "rejected") {
        setError(result.message);
      }
    });
  }

  function place(point) {
    if (!seat) {
      return;
    }

    run(async () => {
      amend({
        characterId: seat.characterId,
        mark: { ...seat, x: point.x, y: point.y },
      });

      return placeTableMark(campaignId, seat.characterId, point);
    });
  }

  function clear(characterId) {
    run(async () => {
      amend({ characterId, mark: null });

      return clearTableMark(campaignId, characterId);
    });
  }

  return {
    /*
     * Two different questions. `mine` is the one token the board rims in gold;
     * a Dungeon Master may lift any at their table without one being theirs.
     * The database decides whether a lift actually happens.
     */
    marks: shown.map((mark) => {
      const mine = Boolean(seat) && mark.characterId === seat.characterId;

      return { ...mark, mine, removable: canSweep || mine };
    }),
    place: seat ? place : null,
    clear: seat ? clear : null,
    error,
  };
}
