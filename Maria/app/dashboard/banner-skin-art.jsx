"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

import { bannerSkinDetails } from "./banner-presentation";

const BANNER_FINISHES = {
  "dragon-lore": dynamic(() => import("./dragon-lore-banner")),
  printstream: dynamic(() => import("./printstream-banner")),
  "spider-lilies": dynamic(() => import("./spider-lily-banner")),
  sakura: dynamic(() => import("./sakura-banner")),
  lightning: dynamic(() => import("./lightning-banner")),
  splash: dynamic(() => import("./splash-banner")),
  topography: dynamic(() => import("./topography-banner")),
  "shattered-glass": dynamic(() => import("./shattered-glass-banner")),
  vignette: dynamic(() => import("./vignette-banner")),
  cyberpunk: dynamic(() => import("./cyberpunk-banner")),
  "carbon-fiber": dynamic(() => import("./carbon-fiber-banner")),
  stillwater: dynamic(() => import("./stillwater-banner")),
  "pixel-night": dynamic(() => import("./pixel-night-banner")),
  "black-hole": dynamic(() => import("./black-hole-banner")),
  "wings-of-freedom": dynamic(() => import("./wings-of-freedom-banner")),
  hexagon: dynamic(() => import("./hexagon-banner")),
  vortex: dynamic(() => import("./vortex-banner")),
};

function BannerSkinArt({
  skin,
  diceColor,
  className = "",
  animated = true,
  sizes = "(max-width: 640px) 100vw, 400px",
}) {
  const Finish = BANNER_FINISHES[bannerSkinDetails(skin).value];
  if (!Finish) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] ${className}`}
    >
      <Finish animated={animated} sizes={sizes} diceColor={diceColor} />
    </span>
  );
}

export default memo(BannerSkinArt);
