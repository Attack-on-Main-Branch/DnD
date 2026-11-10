"use client";

import Image from "next/image";

import useBannerRenderer from "./use-banner-renderer";
import still from "./banner-art/topography.webp";

import styles from "./topography-banner.module.css";

const loadRenderer = () =>
  Promise.all([import("three"), import("@/lib/topography.mjs")]).then(
    ([THREE, { createTopography }]) =>
      (canvas) =>
        createTopography(THREE, canvas),
  );

export default function TopographyBanner({ animated = true, sizes }) {
  const ref = useBannerRenderer(animated, loadRenderer);

  return (
    <span className={styles.surface}>
      <Image src={still} alt="" fill sizes={sizes} className={styles.terrain} />
      {animated && (
        <canvas ref={ref} className={styles.canvas} aria-hidden="true" />
      )}
    </span>
  );
}
