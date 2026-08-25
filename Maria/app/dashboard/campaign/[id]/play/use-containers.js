"use client";

import { useCallback } from "react";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

/**
 * The shelf, kept fresh. Postgres changes are the honest half and the table's
 * wire the fast one, and both are DOORBELLS: no payload is read, because a row
 * off the socket has not been through Sina's `select()` lists.
 *
 * CALLED FROM EXACTLY ONE PLACE. A socket may not join a topic twice, so two
 * subscribers to `chest:<campaign>` would be one silent failure — and both
 * chairs mount the pack, where a Dungeon Master also mounts the rail.
 *
 * It asks for the packs alongside: a carried bag keeps its contents in pack
 * rows, so a chest emptied and a bag handed over are both changes to those.
 */
export function useContainerWire(campaignId, characterIds) {
  const { resync } = useTableDeed(campaignId);

  /* A string first: `useLiveRefresh` rebuilds its subscription whenever a
     dependency changes identity. */
  const watching = characterIds.join(",");

  const reread = useCallback(
    () =>
      resync({
        containers: true,
        inventory: true,
        activity: true,
        characterIds: watching ? watching.split(",") : [],
      }),
    [resync, watching],
  );

  useLiveRefresh({
    channel: `chest:${campaignId}`,
    table: "containers",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: reread,
  });

  /* No filter, because there is no column to filter on: `container_items`
     knows nothing of a campaign. RLS decides what may be delivered. */
  useLiveRefresh({
    channel: `chest-items:${campaignId}`,
    table: "container_items",
    onChange: reread,
  });

  useWireMessage("chest", reread);
}
