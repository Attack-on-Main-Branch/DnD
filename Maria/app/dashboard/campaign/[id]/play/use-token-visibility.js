"use client";

import { useEffect, useMemo, useState } from "react";
import { isFogClearForDm } from "@/lib/fog-paint";

const REVEALED_ALPHA = 250;

export function useVisibleMapTokens(tokens, mask, enabled, canSweep) {
  const [revealed, setRevealed] = useState(() => new Set());
  const { pixelsRef, subscribe } = mask;

  useEffect(() => {
    if (!enabled || canSweep) return;

    function update() {
      const pixels = pixelsRef.current;
      const next = new Set();
      if (pixels) {
        const { width, height, data } = pixels;
        for (const token of tokens) {
          if (token.mine) continue;
          const x = Math.min(width - 1, Math.round(token.x * width));
          const y = Math.min(height - 1, Math.round(token.y * height));
          const offset = (y * width + x) * 4;
          if (
            isFogClearForDm(data, offset) &&
            data[offset + 3] >= REVEALED_ALPHA
          ) {
            next.add(token.id);
          }
        }
      }
      setRevealed((current) =>
        current.size === next.size && [...next].every((id) => current.has(id))
          ? current
          : next,
      );
    }

    update();
    return subscribe(update);
  }, [canSweep, enabled, pixelsRef, subscribe, tokens]);

  return useMemo(
    () =>
      !enabled || canSweep
        ? tokens
        : tokens.filter((token) => token.mine || revealed.has(token.id)),
    [canSweep, enabled, revealed, tokens],
  );
}
