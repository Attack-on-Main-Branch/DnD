"use client";

import { useEffect, useMemo, useState } from "react";
import { isFogClearForDm } from "@/lib/fog-paint";

const REVEALED_ALPHA = 250;

export function useVisibleMapTokens(tokens, mask, enabled, canSweep) {
  const [revealed, setRevealed] = useState(() => new Set());
  const { maskRef, subscribe } = mask;

  useEffect(() => {
    if (!enabled || canSweep) return;

    function update() {
      const canvas = maskRef.current;
      const next = new Set();
      if (canvas) {
        const context = canvas.getContext("2d");
        for (const token of tokens) {
          if (token.mine) continue;
          const x = Math.min(
            canvas.width - 1,
            Math.round(token.x * canvas.width),
          );
          const y = Math.min(
            canvas.height - 1,
            Math.round(token.y * canvas.height),
          );
          const pixels = context.getImageData(x, y, 1, 1).data;
          if (isFogClearForDm(pixels, 0) && pixels[3] >= REVEALED_ALPHA) {
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
  }, [canSweep, enabled, maskRef, subscribe, tokens]);

  return useMemo(
    () =>
      !enabled || canSweep
        ? tokens
        : tokens.filter((token) => token.mine || revealed.has(token.id)),
    [canSweep, enabled, revealed, tokens],
  );
}
