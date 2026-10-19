"use client";

import { useCallback, useState } from "react";

import { pausePlayerDice } from "./actions";
import { usePlayerDicePaused, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

export function usePlayerDice(campaignId, canPause) {
  const paused = usePlayerDicePaused();
  const [pending, setPending] = useState(false);
  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  // The wire rings the doorbell; only the server decides whether dice are paused.
  useWireMessage("player-dice", () => resync({ combat: true }));

  const setPaused = useCallback(
    (next) => {
      if (!canPause || pending || typeof next !== "boolean") return;

      setPending(true);
      run({
        paint: () => store.setPlayerDicePaused(next),
        work: () => pausePlayerDice(campaignId, next),
        tell: () => send({ kind: "player-dice" }),
        want: { combat: true },
      }).finally(() => setPending(false));
    },
    [campaignId, canPause, pending, run, send, store],
  );

  return { paused, pending, setPaused };
}
