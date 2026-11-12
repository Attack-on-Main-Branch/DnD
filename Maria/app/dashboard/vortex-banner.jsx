"use client";

import Image from "next/image";

import { diceColorHex } from "./character-presentation";
import useBannerRenderer from "./use-banner-renderer";

import art from "./banner-art/vortex.webp";
import styles from "./vortex-banner.module.css";

const loadRenderer = () =>
  import("@/lib/vortex-canvas.mjs").then(({ loadVortexRenderer }) =>
    loadVortexRenderer(art.src),
  );

export default function VortexBanner({ animated = true, diceColor }) {
  const ref = useBannerRenderer(animated, loadRenderer);

  return (
    <span
      className={styles.surface}
      style={{ "--vortex-color": diceColorHex(diceColor) }}
    >
      {animated && (
        <canvas ref={ref} className={styles.canvas} aria-hidden="true" />
      )}
      <Image
        src={art}
        alt=""
        fill
        unoptimized
        loading={animated ? "eager" : "lazy"}
        className={styles.still}
      />
      <span className={styles.shade} />
    </span>
  );
}
