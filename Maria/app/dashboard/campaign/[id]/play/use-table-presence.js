"use client";

import { useEffect, useState } from "react";

import { realtime } from "@/app/components/realtime";

/**
 * Which characters are at this table right now, as a set of their ids.
 *
 * Keyed on the SEAT and never on the account: somebody at the head of the table
 * announces no character, so their own card stays dark even where they own one
 * here. They are present, but not as that character.
 *
 * Nothing is trusted from the wire beyond the id. The rail only lights ids it
 * already has from the server, so a fabricated one lights nothing, and the
 * channel's policies in 20260821240000_table_presence.sql decide who may make
 * the claim at all.
 */
export function useTablePresence({ campaignId, seatId, seatCharacterId }) {
  const [seated, setSeated] = useState(() => new Set());

  useEffect(() => {
    // No chair, nothing to announce.
    if (!seatId) {
      return undefined;
    }

    let stop = null;
    let cancelled = false;

    realtime()
      .then(({ client, watchPresence }) => {
        if (cancelled) {
          return;
        }

        stop = watchPresence(client, {
          channel: `table:${campaignId}`,
          key: seatId,
          meta: { characterId: seatCharacterId },
          onChange: (chairs) =>
            setSeated(
              new Set(
                chairs
                  .map((chair) => chair.characterId)
                  .filter((id) => typeof id === "string"),
              ),
            ),
        });
      })
      // A table without a socket is still a table; the rail simply shows
      // nobody as arrived.
      .catch(() => {});

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [campaignId, seatId, seatCharacterId]);

  return seated;
}
