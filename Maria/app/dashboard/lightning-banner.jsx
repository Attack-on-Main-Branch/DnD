import Image from "next/image";

import {
  LIGHTNING_STRIKES,
  LIGHTNING_FRAME,
  LIGHTNING_INTERVAL,
} from "@/lib/lightning-art.mjs";
import BannerMotion from "./banner-motion";
import StormRain from "./storm-rain";

import background from "./banner-art/lightning/background.webp";
import styles from "./lightning-banner.module.css";

const { width, height } = LIGHTNING_FRAME;
const STILL_STRIKES = LIGHTNING_STRIKES.slice(0, 1);
const STORM_STYLE = {
  "--strike-cycle": `${LIGHTNING_STRIKES.length * LIGHTNING_INTERVAL}s`,
  "--storm-interval": `${LIGHTNING_INTERVAL}s`,
};

export default function LightningBanner({ animated, sizes }) {
  const strikes = animated ? LIGHTNING_STRIKES : STILL_STRIKES;
  return (
    <BannerMotion
      className={`${styles.surface} ${animated ? "" : styles.still}`}
      disabled={!animated}
      style={STORM_STYLE}
    >
      <Image
        src={background}
        alt=""
        fill
        sizes={sizes}
        className={styles.clouds}
      />
      <span className={styles.shade} />
      {animated && <span className={styles.illumination} />}
      <span className={styles.mist} />
      {animated && <StormRain className={styles.rain} />}
      {strikes.map(({ body, core }, index) => (
        <span
          key={index}
          className={`${styles.strike} ${index === 0 ? styles.primary : ""}`}
          style={{ "--strike-delay": `${index * LIGHTNING_INTERVAL - 1.2}s` }}
        >
          <svg
            className={styles.bolts}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={body} className={styles.halo} />
            <path d={core} className={styles.core} />
          </svg>
        </span>
      ))}
      <span className={styles.vignette} />
    </BannerMotion>
  );
}
