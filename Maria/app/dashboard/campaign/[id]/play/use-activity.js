"use client";

import { useCallback } from "react";

import { recordActivity } from "./log-actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * "Put this up now, write it down, and tell the table it is written."
 *
 * The way into the activity log for everything the DATABASE cannot write for
 * itself: the dice, the purse, a spell cast, and a grant to the whole party.
 * Hit points, levels and a stack moving in one pack no longer come through here
 * at all — a trigger writes those, inside the deed's own transaction, and the
 * deed hands the fresh list back. See 20260830090000.
 *
 * `preview` is the line to show while that round trip is in the air, in the
 * shape `readActivity` hands the panel. Composed in the browser, which is
 * allowed only because it is shown to the person who pressed, on their screen
 * alone: it is never sent to another chair and never written down. The entry
 * that reaches the column is built by `record_campaign_activity` out of typed
 * arguments — see 20260823090000_campaign_activity_log.sql.
 *
 * A refusal must not reach the player, since the deed it describes has already
 * happened; it goes to `logFailure` and the pending line comes down.
 *
 * The promise NEVER REJECTS, and callers still await it where two quick presses
 * would race: the log keeps ten entries and the purse can write five at once.
 */
export function useActivityLog(campaignId) {
  const store = useTableStore();
  const { send, resync } = useTableDeed(campaignId);

  return useCallback(
    (actorCharacterId, entry, preview) => {
      const ticket = preview ? store.noteEntries([preview]) : null;

      return recordActivity(campaignId, actorCharacterId, entry).then(
        (result) => {
          if (!result) {
            // Nothing was written. Whatever is standing in the panel is a line
            // this browser drew, so take it down and ask the database what is
            // really there.
            store.dropEntries(ticket);
            resync({ activity: true });
            return false;
          }

          store.setActivity(result.activity, ticket);

          /* Only once the server has taken it. The other chairs answer this by
             re-reading the log rather than by rendering what was said — a name
             off the wire is not a name. */
          send({ kind: "log" });

          return true;
        },
        // Nothing above this may throw into a caller's handler.
        () => {
          store.dropEntries(ticket);
          resync({ activity: true });
          return false;
        },
      );
    },
    [campaignId, resync, send, store],
  );
}
