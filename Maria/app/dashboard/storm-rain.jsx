"use client";

import useBannerRenderer from "./use-banner-renderer";

const loadRenderer = () =>
  import("@/lib/storm-rain.mjs").then(
    ({ createStormRain }) =>
      (canvas) =>
        createStormRain(canvas, getComputedStyle(canvas).color),
  );

export default function StormRain({ className }) {
  const ref = useBannerRenderer(true, loadRenderer);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
