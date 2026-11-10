"use client";

import Image from "next/image";

import useBannerRenderer from "./use-banner-renderer";
import flag from "./banner-art/wings-of-freedom/flag.webp";
import still from "./banner-art/wings-of-freedom/still.webp";
import styles from "./wings-of-freedom-banner.module.css";

const loadRenderer = () =>
  Promise.all([import("three"), import("@/lib/flag-cloth.mjs")]).then(
    ([THREE, { createFlagCloth }]) =>
      (canvas) =>
        createFlagCloth(THREE, canvas, flag.src),
  );

export default function WingsOfFreedomBanner({ animated = true, sizes }) {
  const ref = useBannerRenderer(animated, loadRenderer);

  return (
    <span className={styles.surface}>
      <Image src={still} alt="" fill sizes={sizes} className={styles.still} />
      {animated && (
        <canvas ref={ref} className={styles.canvas} aria-hidden="true" />
      )}
      <span className={styles.shade} />
    </span>
  );
}
