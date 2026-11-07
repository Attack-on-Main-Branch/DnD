"use client";

import { useCallback, useEffect, useRef } from "react";

import { useDiceLooks, useHeadDiceLook } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

export function useDiceAppearance({
  campaignId,
  characterId,
  enabled,
  display,
}) {
  const looks = useDiceLooks();
  const head = useHeadDiceLook();
  const { resync, send } = useTableDeed(campaignId);
  const announced = useRef(null);
  const appearance = characterId ? looks[characterId] : head;
  const color = appearance?.color ?? null;
  const skin = appearance?.skin ?? null;

  const reread = useCallback(() => {
    if (enabled) resync({ party: true, combat: true });
  }, [enabled, resync]);

  useWireMessage("dice", reread);
  useWireMessage("seat", reread);

  useEffect(() => {
    if (!enabled || display) return;
    const next = `${color}:${skin}`;
    const previous = announced.current;
    announced.current = next;
    if (previous !== null && previous !== next) send({ kind: "dice" });
  }, [color, display, enabled, send, skin]);

  return {
    appearance,
    skins: [
      head?.skin,
      ...Object.values(looks).map((look) => look?.skin),
    ].filter(Boolean),
  };
}
