"use client";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { isDiceSkinUnlocked } from "sina/rules/dice-pouch";

import SelectionDot from "@/app/components/ui/selection-dot";

import { DICE_SKINS, diceSkinPictures } from "./character-presentation";
import DicePicture from "./dice-picture";

const LOCKED_NOTE = "Not found yet — open a Dice Pouch at the table";

/**
 * What the dice are made of, as a wall of pictures — each a d20 in the style,
 * painted in the colour under consideration, framed in its rarity and listed
 * commonest first. Pictures, not rollers: the live die beside the wall shows
 * the one that is chosen.
 *
 * A set not yet found keeps its place and its rarity's frame, greyed, blurred
 * and unnamed, and cannot be chosen — `guard_dice_skin` refuses it regardless.
 */
export default function DiceSkinPicker({
  value,
  color,
  unlocked,
  onChange,
  disabled,
  invalid,
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className={LABEL_CLASSES}>Dice style</legend>

      {unlocked && (
        <p className="mt-0.5 text-xs text-ink/50">
          {unlocked.length} of {DICE_SKINS.length} found. The rest are in Dice
          Pouches, which your Dungeon Master hands out.
        </p>
      )}

      <div
        className={`mt-1.5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 ${
          invalid ? `rounded-lg ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {DICE_SKINS.map((option) => {
          const isSelected = value === option.value;
          const locked = !isDiceSkinUnlocked(option.value, unlocked);

          return (
            <label
              key={option.value}
              title={locked ? LOCKED_NOTE : option.description}
              className={`group relative isolate flex flex-col items-center gap-2 rounded-xl border px-3 pt-4 pb-3 transition duration-300 select-none ${CHOICE_CARD_FOCUS_CLASSES} ${
                locked
                  ? `cursor-not-allowed bg-surface/60 ${option.rarity.edge}`
                  : isSelected
                    ? `cursor-pointer bg-surface/75 ${option.rarity.edgeSelected}`
                    : `cursor-pointer bg-surface/60 hover:bg-surface/50 ${option.rarity.edge} ${option.rarity.edgeHover}`
              }`}
            >
              <input
                type="radio"
                name="diceSkin"
                value={option.value}
                checked={isSelected}
                disabled={locked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />

              {/* Behind the content, so the glow never washes over the name. */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-300 ${
                  isSelected ? option.rarity.glowSelected : option.rarity.glow
                }`}
              />

              {!locked && (
                <span className="absolute top-2.5 right-2.5 flex">
                  <SelectionDot selected={isSelected} />
                </span>
              )}

              <DicePicture
                picture={diceSkinPictures(option.value).tile}
                color={color}
                className={`aspect-square w-full max-w-28 drop-shadow-[0_10px_12px_rgba(0,0,0,0.55)] transition duration-300 ${
                  locked
                    ? "opacity-75 blur-xs brightness-75 grayscale"
                    : "motion-safe:group-hover:scale-105"
                }`}
              />

              {locked ? (
                <span className="text-center font-display text-sm font-semibold tracking-wide text-ink/45">
                  <span aria-hidden="true">???</span>
                  <span className="sr-only">Locked</span>
                </span>
              ) : (
                <span
                  className={`text-center font-display text-sm font-semibold tracking-wide transition-colors duration-300 ${
                    isSelected ? "text-gold" : "text-ink/85"
                  }`}
                >
                  {option.label}
                </span>
              )}

              <span
                className={`-mt-1.5 font-mono text-[10px] tracking-[0.16em] uppercase ${option.rarity.text}`}
              >
                {option.rarity.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
