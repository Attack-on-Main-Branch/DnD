"use client";

import { isDiceSkinUnlocked } from "sina/rules/dice-pouch";

import { DICE_SKIN_GROUPS, diceSkinPictures } from "./character-presentation";
import DicePicture from "./dice-picture";
import SkinPicker from "./skin-picker";

export default function DiceSkinPicker({ color, ...props }) {
  return (
    <SkinPicker
      {...props}
      name="diceSkin"
      label="Dice style"
      groups={DICE_SKIN_GROUPS}
      isUnlocked={isDiceSkinUnlocked}
      gridClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
      renderPicture={(option, locked) => (
        <DicePicture
          picture={diceSkinPictures(option.value).tile}
          color={color}
          className={`aspect-square w-full max-w-28 drop-shadow-[0_10px_12px_rgba(0,0,0,0.55)] transition duration-300 ${locked ? "opacity-75 blur-xs brightness-75 grayscale" : "motion-safe:group-hover:scale-105"}`}
        />
      )}
    />
  );
}
