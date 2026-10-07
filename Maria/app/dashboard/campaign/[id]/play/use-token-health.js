"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readTokenHealth } from "@/app/actions/table-adjustments";
import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

export function useTokenHealth(campaignId, canEdit, tokenIds) {
  const [health, setHealth] = useState({});
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    if (!canEdit) return;
    const run = ++revision.current;
    const result = await readTokenHealth(campaignId).catch(() => null);
    if (run === revision.current && result?.kind === "success") {
      setHealth(
        Object.fromEntries(result.data.map((row) => [row.token_id, row])),
      );
    }
  }, [campaignId, canEdit]);

  useEffect(() => {
    refresh();
  }, [refresh, tokenIds]);
  useLiveRefresh({
    channel: `token-health:${campaignId}`,
    table: "map_token_health",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });
  return { health: canEdit ? health : {}, refresh };
}
