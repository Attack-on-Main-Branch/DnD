"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDying } from "sina/rules/death";
import {
  readTokenHealth,
  readTokenHealthStates,
} from "@/app/actions/table-adjustments";
import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import { useWireMessage } from "./table-wire";
import { useIsDying } from "./table-state";

export function useIsTokenKnocked(token) {
  const characterKnocked = useIsDying(token.characterId);
  if (token.isDead) return false;
  if (token.characterId) return characterKnocked;
  return Number.isFinite(token.health?.current_hp)
    ? isDying(token.health.current_hp, false)
    : Boolean(token.health?.is_dying);
}

export function useTokenHealth(campaignId, canEdit, tokenIds) {
  const [health, setHealth] = useState({});
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const run = ++revision.current;
    const read = canEdit ? readTokenHealth : readTokenHealthStates;
    const result = await read(campaignId).catch(() => null);
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
  useWireMessage("token-health", refresh);
  return { health, refresh };
}
