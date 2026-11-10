"use client";

import { useCallback } from "react";

import {
  HEXAGON_FRAME,
  HEXAGON_GRID,
  HEXAGON_STILL,
} from "@/lib/hexagon-art.mjs";
import { diceColorHex } from "./character-presentation";
import useBannerRenderer from "./use-banner-renderer";

import styles from "./hexagon-banner.module.css";

export default function HexagonBanner({ animated = true, diceColor }) {
  const color = diceColorHex(diceColor);
  const loadRenderer = useCallback(
    () =>
      import("@/lib/hexagon-canvas.mjs").then(
        ({ createHexagonCanvas }) =>
          (canvas) =>
            createHexagonCanvas(canvas, color),
      ),
    [color],
  );
  const ref = useBannerRenderer(animated, loadRenderer);

  return (
    <span className={styles.surface} style={{ "--hex-color": color }}>
      {animated && (
        <canvas ref={ref} className={styles.canvas} aria-hidden="true" />
      )}
      <svg
        className={styles.still}
        viewBox={`0 0 ${HEXAGON_FRAME.width} ${HEXAGON_FRAME.height}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path className={styles.grid} d={HEXAGON_GRID} />
        <path className={styles.faces} d={HEXAGON_STILL.faces} />
        <path className={styles.lights} d={HEXAGON_STILL.lights} />
      </svg>
      <span className={styles.shade} />
    </span>
  );
}
