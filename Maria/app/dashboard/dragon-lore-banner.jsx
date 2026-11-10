"use client";

import Image from "next/image";
import { useId } from "react";

import BannerMotion from "./banner-motion";
import dragonLore from "./banner-art/dragon-lore.webp";
import { DRAGON_LORE_LIGHT } from "./dragon-lore-light-settings";

import styles from "./dragon-lore-light.module.css";

const EDGE_STEPS = 6;
const BEAM_COLORS = [
  { name: "ray", color: "var(--color-gold)" },
  { name: "glow", color: "var(--color-crit-gold)" },
];

const { width, height } = dragonLore;
const settings = DRAGON_LORE_LIGHT;
const count = Math.max(0, Math.trunc(settings.rayCount));
const rayWidth = Math.max(1, settings.rayWidth);
const gap = Math.max(0, settings.rayGap);
const softness = Math.max(0.01, Math.min(1, settings.raySoftness));
const sweepSeconds = Math.max(0.1, settings.sweepSeconds);
const cycleSeconds = sweepSeconds + Math.max(0, settings.pauseSeconds);
const fadeInSeconds = Math.min(
  sweepSeconds / 2,
  Math.max(0, settings.fadeInSeconds),
);
const fadeOutSeconds = Math.min(
  sweepSeconds / 2,
  Math.max(0, settings.fadeOutSeconds),
);
const projection = (width + height) * Math.SQRT1_2;
const glowWidth = rayWidth * 1.6;
const trainWidth = (count - 1) * (rayWidth + gap) + glowWidth;
const distance = (projection + trainWidth) / 2;
const edges = Array.from({ length: EDGE_STEPS + 1 }, (_, index) => {
  const progress = index / EDGE_STEPS;
  return {
    offset: (progress * softness) / 2,
    opacity: Math.sin((progress * Math.PI) / 2) ** 2,
  };
});
const stops = [
  ...edges,
  ...edges
    .toReversed()
    .map(({ offset, opacity }) => ({ offset: 1 - offset, opacity })),
];
const sweepStyle = {
  "--sweep-duration": `${cycleSeconds}s`,
  "--fade-in": `${(fadeInSeconds / cycleSeconds) * 100}%`,
  "--fade-out": `${((sweepSeconds - fadeOutSeconds) / cycleSeconds) * 100}%`,
  "--sweep-end": `${(sweepSeconds / cycleSeconds) * 100}%`,
  "--travel-x": `${((distance * Math.SQRT1_2) / width) * 100}%`,
  "--travel-y": `${((distance * Math.SQRT1_2) / height) * 100}%`,
};
const centers = Array.from(
  { length: count },
  (_, index) => (index - (count - 1) / 2) * (rayWidth + gap),
);

function DragonLoreLight() {
  const id = useId();

  return (
    <BannerMotion className={styles.surface} style={sweepStyle}>
      <span className={styles.flight}>
        <svg
          className={styles.beams}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {BEAM_COLORS.map(({ name, color }) => (
              <linearGradient
                key={name}
                id={`${id}-${name}`}
                x1="0"
                x2="1"
                y1="0"
                y2="0"
              >
                {stops.map(({ offset, opacity }, index) => (
                  <stop
                    key={index}
                    offset={offset}
                    stopColor={color}
                    stopOpacity={opacity}
                  />
                ))}
              </linearGradient>
            ))}
          </defs>
          <g transform={`translate(${width / 2} ${height / 2}) rotate(45)`}>
            {centers.map((center) => (
              <g key={center}>
                <rect
                  x={center - glowWidth / 2}
                  y={-projection / 2}
                  width={glowWidth}
                  height={projection}
                  fill={`url(#${id}-glow)`}
                  opacity={settings.glowIntensity}
                />
                <rect
                  x={center - rayWidth / 2}
                  y={-projection / 2}
                  width={rayWidth}
                  height={projection}
                  fill={`url(#${id}-ray)`}
                  opacity={settings.rayIntensity}
                />
              </g>
            ))}
          </g>
        </svg>
      </span>
    </BannerMotion>
  );
}

export default function DragonLoreBanner({ animated, sizes }) {
  return (
    <>
      <Image
        src={dragonLore}
        alt=""
        fill
        sizes={sizes}
        className="object-fill"
      />
      {animated && <DragonLoreLight />}
    </>
  );
}
