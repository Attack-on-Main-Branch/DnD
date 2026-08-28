"use client";

import { useCallback, useMemo } from "react";

import { useToast } from "@/app/components/ui/toast";

import { readTableSlice } from "./table-actions";
import { useTableStore } from "./table-state";
import { useTableWire } from "./table-wire";

/**
 * One deed at the table: paint it, write it, tell the room — and only the first
 * of the three happens before the next press can.
 *
 *   note   the lines to stand in the log while the round trip is in the air,
 *          shown to whoever pressed and thrown away when the real list lands.
 *   paint  moves the number in table-state.jsx, now, synchronously.
 *   work   the Server Action, dispatched and not awaited by the caller — so a
 *          table calling four damage and then six does not queue the second
 *          press behind the first one's round trip.
 *   tell   what the other chairs hear, sent only once the server has taken it.
 *
 * ONE TICKET PER DEED, because two presses can be in the air at once and can
 * answer in either order: a first answer must not take a second press's line
 * down with it.
 *
 * A refusal says so in a toast — by then the control that caused it has closed —
 * and then asks the database what is actually there rather than unpicking the
 * change, which cannot be done once later presses have stacked on top of it.
 *
 * Nothing here calls `router.refresh()`. See the head of table-state.jsx.
 */
export function useTableDeed(campaignId) {
  const store = useTableStore();
  const { send, seat, head } = useTableWire();
  const { show } = useToast();

  /** The database's own answer, for whichever slices the caller can be wrong about. */
  const resync = useCallback(
    (want) => {
      readTableSlice(campaignId, want).then(
        (slices) => store.sync(slices),
        // A reconciliation that cannot run leaves the numbers where they are;
        // `useLiveRefresh`'s refocus backstop catches it after that.
        () => {},
      );
    },
    [campaignId, store],
  );

  const run = useCallback(
    ({ note, paint, work, tell, want }) => {
      paint?.();

      /* Stamped with the chair, so a line waiting on the database wears the
         same face as the row that replaces it. A caller may say otherwise. */
      const ticket = note?.length
        ? store.noteEntries(note.map((entry) => ({ seat, head, ...entry })))
        : null;

      return Promise.resolve()
        .then(work)
        .then((result) => {
          if (result?.kind === "rejected") {
            show(result.message);
            store.dropEntries(ticket);
            resync(want);
            return null;
          }

          /* The deeds whose entry the database writes for itself hand the fresh
             list back in the same response — see 20260830090000. An actor's
             name only ever comes off a row. */
          store.setActivity(result?.activity, ticket);

          tell?.(result);

          return result;
        })
        .catch(() => {
          show("That did not reach the table. Try again.");
          store.dropEntries(ticket);
          resync(want);
          return null;
        });
    },
    [head, resync, seat, show, store],
  );

  return useMemo(() => ({ run, resync, send }), [resync, run, send]);
}
