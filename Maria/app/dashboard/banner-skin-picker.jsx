"use client";

import { isBannerSkinUnlocked } from "sina/rules/dice-pouch";

import { BANNER_SKIN_GROUPS } from "./banner-presentation";
import BannerSkinArt from "./banner-skin-art";
import SkinPicker from "./skin-picker";

export default function BannerSkinPicker({ diceColor, ...props }) {
  return (
    <SkinPicker
      {...props}
      name="bannerSkin"
      label="Banner style"
      groups={BANNER_SKIN_GROUPS}
      isUnlocked={isBannerSkinUnlocked}
      gridClassName="grid-cols-2 sm:grid-cols-3"
      flushPicture
      renderPicture={(option, locked) => (
        <span
          aria-hidden="true"
          className="relative isolate block aspect-banner w-full overflow-hidden bg-surface [content-visibility:auto]"
        >
          <BannerSkinArt
            skin={option.value}
            diceColor={diceColor}
            animated={false}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 400px"
            className={`transition duration-300 ${locked ? "scale-110 opacity-40 blur-xl brightness-50 grayscale" : "motion-safe:group-hover:scale-105"}`}
          />
        </span>
      )}
    />
  );
}
