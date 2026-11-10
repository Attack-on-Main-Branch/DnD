"use client";

import { useState } from "react";

import AppearanceControls from "./appearance-controls";
import { useAppearanceDraft } from "./use-appearance-draft";
import {
  NESTED_CARD_CLASSES,
  NESTED_CARD_SELECTED_CLASSES,
} from "@/app/components/ui/surface";
import {
  diceColorHex,
  diceSkinDetails,
  diceSkinPictures,
  diceSkinTheme,
} from "@/app/dashboard/character-presentation";
import DiceColorPicker from "@/app/dashboard/dice-color-picker";
import DicePicture from "@/app/dashboard/dice-picture";
import DiceSkinPicker from "@/app/dashboard/dice-skin-picker";
import PreviewDie from "@/app/dashboard/preview-die";
import { PREVIEW_DIE, PREVIEW_SET } from "@/app/dashboard/preview-roller";
import { DICE_TYPES } from "@/lib/dice-themes";

export default function SheetDice({
  diceColor,
  diceSkin,
  unlocked,
  allUnlocked = false,
  saveDice,
}) {
  const appearance = useAppearanceDraft(
    { diceColor: diceColorHex(diceColor), diceSkin },
    saveDice,
    "dice",
  );
  const { diceColor: color, diceSkin: skin } = appearance.draft;
  const { saving } = appearance;
  const [die, setDie] = useState(PREVIEW_DIE);

  const chosen = diceSkinDetails(skin);
  const pictures = diceSkinPictures(skin);
  const cell = DICE_TYPES.indexOf(die);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-8">
        <DiceColorPicker
          value={color}
          onChange={appearance.edit("diceColor")}
          disabled={saving}
        />
        <DiceSkinPicker
          value={skin}
          color={color}
          unlocked={unlocked}
          allUnlocked={allUnlocked}
          onChange={appearance.edit("diceSkin")}
          disabled={saving}
        />
      </div>

      <aside
        aria-label="Preview"
        className={`order-first flex flex-col gap-4 rounded-2xl border p-4 lg:sticky lg:top-24 lg:order-none ${NESTED_CARD_SELECTED_CLASSES}`}
      >
        <div className="text-center">
          <p className="font-display text-lg font-semibold tracking-wide text-gold">
            {chosen.label}
          </p>
          <p className="mt-0.5 text-xs text-ink/55">{chosen.description}</p>
          <p
            className={`mt-1 font-mono text-[10px] tracking-[0.16em] uppercase ${chosen.rarity.text}`}
          >
            {chosen.rarity.label}
          </p>
        </div>

        <PreviewDie
          color={color}
          theme={diceSkinTheme(skin)}
          die={die}
          className="mx-auto aspect-square w-full max-w-60 lg:max-w-none"
          still={
            <DicePicture
              picture={pictures.set}
              color={color}
              cells={DICE_TYPES.length}
              cell={cell}
              className="mx-auto aspect-square w-full max-w-40"
            />
          }
        />

        <div
          role="group"
          aria-label="Die to throw"
          className="grid grid-cols-3 gap-2"
        >
          {PREVIEW_SET.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={die === type}
              onClick={() => setDie(type)}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-1 pt-1.5 pb-1 transition duration-300 ${
                die === type
                  ? NESTED_CARD_SELECTED_CLASSES
                  : NESTED_CARD_CLASSES
              }`}
            >
              <DicePicture
                picture={pictures.set}
                color={color}
                cells={DICE_TYPES.length}
                cell={DICE_TYPES.indexOf(type)}
                className="aspect-square w-full max-w-11"
              />
              <span
                className={`font-display text-xs tracking-wider uppercase ${
                  die === type ? "text-gold" : "text-ink/60"
                }`}
              >
                {type}
              </span>
            </button>
          ))}
        </div>

        <AppearanceControls subject="dice" {...appearance} />
      </aside>
    </div>
  );
}
