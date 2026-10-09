"use client";

import { useCallback, useMemo } from "react";

import { useToast } from "@/app/components/ui/toast";

import { gatherReads } from "./read-table";
import { useTableStore } from "./table-state";
import { useTableWire } from "./table-wire";

/**
 * One deed at the table: paint it, write it, tell the room — and only the first
 * of the three happens before the next press can.
 *
 *   note      the lines to stand in the log while the round trip is in the
 *             air, shown to whoever pressed and thrown away when the real list
 *             lands.
 *   paint     moves the number in table-state.jsx, now, synchronously — and
 *             holds it there against every read until the write has answered.
 *   foretell  what the other chairs hear at once, beside the paint, for a deed
 *             whose whole point is being seen as it happens: a piece put down
 *             somewhere else should not wait on a round trip to get there.
 *   work      the Server Action, dispatched and not awaited by the caller — so a
 *             table calling four damage and then six does not queue the second
 *             press behind the first one's round trip.
 *   tell      what the other chairs hear once the server has taken it.
 *   retell    what they hear after a refusal, once the database has been asked
 *             what is really there — the correction to a foretelling.
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

/** One gatherer per table, however many pieces of it ask. */
const readers = new WeakMap();

function readerFor(store, campaignId) {
  let reader = readers.get(store);

  if (!reader) {
    reader = gatherReads(campaignId, (slices, askedAt) =>
      store.sync(slices, askedAt),
    );
    readers.set(store, reader);
  }

  return reader;
}

export function useTableDeed(campaignId) {
  const store = useTableStore();
  const { send, seat, head } = useTableWire();
  const { show } = useToast();

  /**
   * The database's own answer, for whichever slices the caller can be wrong
   * about. Resolves to whether it arrived; one that cannot leaves the numbers
   * where they are, and `useLiveRefresh`'s refocus backstop catches it after.
   */
  const resync = useCallback(
    (want) => readerFor(store, campaignId)(want),
    [campaignId, store],
  );

  const run = useCallback(
    ({ note, paint, foretell, work, tell, retell, want }) => {
      const answer = store.hold(paint);

      foretell?.();

      /* Stamped with the chair, so a line waiting on the database wears the
         same face as the row that replaces it. A caller may say otherwise. */
      const ticket = note?.length
        ? store.noteEntries(note.map((entry) => ({ seat, head, ...entry })))
        : null;

      const refused = () => {
        store.dropEntries(ticket);
        answer(false);
        resync(want).then((landed) => {
          if (landed) {
            retell?.();
          }
        });

        return null;
      };

      return Promise.resolve()
        .then(work)
        .then((result) => {
          if (result?.kind === "rejected") {
            show(result.message);
            return refused();
          }

          answer(true);

          /* The deeds whose entry the database writes for itself hand the fresh
             list back in the same response — see 20260830090000. An actor's
             name only ever comes off a row. */
          store.setActivity(result?.activity, ticket);

          tell?.(result);

          return result;
        })
        .catch(() => {
          show("That did not reach the table. Try again.");
          return refused();
        });
    },
    [head, resync, seat, show, store],
  );

  return useMemo(() => ({ run, resync, send }), [resync, run, send]);
}
