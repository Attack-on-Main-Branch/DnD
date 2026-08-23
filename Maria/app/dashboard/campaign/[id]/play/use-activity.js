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
 * Its own transition, not the caller's: the drawers dim themselves while their
 * own action is in flight, and a log entry is not something to wait on.
 */
export function useActivityLog(campaignId) {
  const { send } = useTableWire();

  return useCallback(
    (actorCharacterId, entry) => {
      startTransition(async () => {
        if (await recordActivity(campaignId, actorCharacterId, entry)) {
          send({ kind: "log" });
        }
      });
    },
    [campaignId, send],
  );
}
