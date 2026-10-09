"use client";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { isDiceSkinUnlocked } from "sina/rules/dice-pouch";

import SelectionDot from "@/app/components/ui/selection-dot";

import {
  DICE_SKINS,
  DICE_SKIN_GROUPS,
  diceSkinPictures,
} from "./character-presentation";
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
  allUnlocked = false,
  onChange,
  disabled,
  invalid,
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="w-full">
        <span className="flex items-baseline justify-between gap-3">
          <span className={LABEL_CLASSES}>Dice style</span>
          {!allUnlocked && unlocked && (
            <span className="text-xs text-ink/50">
              {unlocked.length} of {DICE_SKINS.length} found
            </span>
          )}
        </span>
      </legend>

      <div
        className={`mt-3 space-y-5 ${
          invalid ? `rounded-lg ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {DICE_SKIN_GROUPS.map((group) => (
          <div key={group.value} role="group" aria-label={group.rarity.label}>
            <p
              aria-hidden="true"
              className={`mb-2 flex items-center gap-3 font-mono text-xs tracking-wide uppercase ${group.rarity.text}`}
            >
              {group.rarity.label}
              <span className="h-px flex-1 bg-gold/10" />
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {group.skins.map((option) => {
                const isSelected = value === option.value;
                const locked =
                  !allUnlocked && !isDiceSkinUnlocked(option.value, unlocked);

                return (
                  <label
                    key={option.value}
                    title={locked ? LOCKED_NOTE : option.description}
                    className={`group relative isolate flex flex-col items-center gap-1.5 rounded-xl border px-3 pt-3 pb-2.5 transition duration-300 select-none ${CHOICE_CARD_FOCUS_CLASSES} ${
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
                        isSelected
                          ? option.rarity.glowSelected
                          : option.rarity.glow
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
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
