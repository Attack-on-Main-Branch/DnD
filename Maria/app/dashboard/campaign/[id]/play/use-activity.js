"use client";

import { startTransition, useCallback } from "react";

import { recordActivity } from "./log-actions";
import { useTableWire } from "./table-wire";

/**
 * "Write this down, and tell the table it is written."
 *
 * The one way into the activity log, shared by the four places that put
 * something in it: the dice, the health band and both pack drawers. Each of
 * those already does its own writing and its own error handling; this is the
 * line afterwards, and it deliberately reports nothing back.
 *
 * A log entry describes something that has ALREADY happened, so a refusal here
 * must not reach the player — there is nothing they could do about it and
 * nothing they did wrong. `recordActivity` logs it instead.
 *
 * The wire message is sent only once the server has taken the write, the way a
 * hit point and a pack change already are: it is a HEAD START on the Postgres
 * doorbell, never a substitute for it, and a message sent before the row exists
 * is a message answered by re-reading a table that has not changed yet.
 *
 * It runs in a transition of its own AND hands the promise back, which are for
 * two different callers.
 *
 * The dice and the health band do not wait: their control has already answered
 * and a line in the log is not something to hold it open for.
 *
 * The purse and the level ring DO wait — they `await` this inside their own
 * transition, so the control stays shut until the entry exists. That is not
 * politeness, it is the only thing standing between a quick second press and a
 * table that reads "granted 50 Gold" once for two grants: the log is capped at
 * ten entries and written asynchronously, so a press that lands before the
 * previous entry does can silently lose it.
 *
 * The promise NEVER REJECTS. A log entry describes something that has already
 * happened, so failing to write one must not fail the deed — and must not hang
 * the control that is waiting on it either. A refusal resolves `false` and goes
 * to `logFailure` inside `recordActivity`.
 */
export function useActivityLog(campaignId) {
  const { send } = useTableWire();

  return useCallback(
    (actorCharacterId, entry) => {
      const written = recordActivity(campaignId, actorCharacterId, entry).then(
        (kept) => {
          if (kept) {
            send({ kind: "log" });
          }

          return kept;
        },
        // Nothing above this may throw into a caller's transition.
        () => false,
      );

      startTransition(async () => {
        await written;
      });

      return written;
    },
    [campaignId, send],
  );
}
