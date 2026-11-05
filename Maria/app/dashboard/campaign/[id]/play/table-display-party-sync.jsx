"use client";

import { useCallback } from "react";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import { useRouteRefresh } from "@/app/components/use-route-refresh";

import { useWireMessage } from "./table-wire";
import { useTableDeed } from "./use-table-deed";

export default function TableDisplayPartySync({ campaignId, faces }) {
  const refresh = useRouteRefresh();
  const { resync } = useTableDeed(campaignId);
  const reread = useCallback(() => resync({ party: true }), [resync]);

  useWireMessage("seat", ({ characterId }) => {
    if (
      characterId &&
      !faces.some((face) => face.characterId === characterId)
    ) {
      refresh();
    }
  });
  useWireMessage("health", reread);
  useWireMessage("conditions", reread);
  useWireMessage("rest", reread);

  useLiveRefresh({
    channel: `party:${campaignId}`,
    table: "campaign_members",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });
  useLiveRefresh({
    channel: `health:${campaignId}`,
    table: "characters",
    onChange: reread,
  });

  return null;
}
