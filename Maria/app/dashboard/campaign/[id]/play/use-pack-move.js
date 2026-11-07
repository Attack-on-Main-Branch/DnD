"use client";

import { useCallback } from "react";

import { stowPackItem } from "./pack-actions";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

export function usePackMove(campaignId) {
  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  return useCallback(
    (characterId, item, quantity, from, to) =>
      run({
        paint: () => {
          store.movePack(characterId, item, -quantity, from);
          store.movePack(characterId, item, quantity, to);
        },
        work: () => stowPackItem(characterId, item, quantity, from, to),
        tell: () => send({ kind: "pack", characterId }),
        want: { inventory: true, characterIds: [characterId] },
      }),
    [run, send, store],
  );
}
