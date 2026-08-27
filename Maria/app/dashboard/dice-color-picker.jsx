"use client";

import { useEffect, useState } from "react";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

import { DICE_COLORS, diceColorHex } from "./character-presentation";
import {
  PREVIEW_STAGE_ID,
  releasePreviewDie,
  showPreviewDie,
} from "./preview-roller";

/**
 * The twelve, and a die wearing whichever one is chosen.
 *
 * The colour used to dress an initialled disc, which is why it was called an
 * avatar colour; a character carries a photograph now, so what is left for a
 * colour to say is WHOSE DICE THOSE ARE when six people are throwing at one
 * board. The label says so, and the preview beside the row is how the choice
 * is made against the thing it decides rather than against a dot.
 *
 * NOTHING PICKS FOR YOU. The colour used to follow the name as it was typed —
 * a hash over the code points — so that a sheet was never showing a placeholder
 * grey. That is the wrong bargain for a die: it changed the answer under
 * somebody who had already given one, every time they went back and fixed a
 * spelling. The field starts on the sheet's own default and moves when it is
 * pressed.
 */
export default function DiceColorPicker({
  value,
  onChange,
  disabled,
  invalid,
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className={LABEL_CLASSES}>Dice colour</legend>

      {/* The die takes the end of the row rather than a column of its own, so
          it sits in the space twelve swatches leave over. Below `sm` the two
          stack and it centres, where there is no space to sit in. */}
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between">
        <div
          className={`flex flex-wrap gap-2 ${
            invalid ? `rounded-lg p-1 ${INVALID_GROUP_CLASSES}` : ""
          }`}
        >
          {DICE_COLORS.map((option) => {
            const isSelected = value === option.value;

            return (
              <label
                key={option.value}
                title={option.label}
                className={`cursor-pointer rounded-full p-0.5 transition duration-300 ${CHOICE_CARD_FOCUS_CLASSES} ${
                  isSelected
                    ? "ring-2 ring-gold shadow-[0_0_8px_var(--gold-60)]"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="diceColor"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => onChange(option.value)}
                  className="sr-only"
                />
                <span
                  className={`block size-7 rounded-full ${option.className}`}
                />
                <span className="sr-only">{option.label}</span>
              </label>
            );
          })}
        </div>

        <PreviewDie color={value} />
      </div>
    </fieldset>
  );
}

/**
 * A d20 in the colour under consideration, thrown for real.
 *
 * THE SAME DIE THE TABLE THROWS: the same library, the same meshes, the same
 * numeral textures and the same light — see preview-roller.js, which is a
 * second instance of the roller rather than a second idea of what a die is. A
 * drawing of a die can only ever promise what the colour will look like; this
 * one shows it, lit and lettered exactly as it will be when it lands on a map.
 *
 * Costly, and knowingly: a megabyte of BabylonJS and ammo.wasm arrives with the
 * sheet. It is `import()`ed inside the roller, so no other page pays for it.
 *
 * Nothing is drawn for a reader who asked for stillness. A die exists here by
 * being thrown — the library has no way to place one at rest — and a physics
 * tumble is exactly what that setting is asking not to see. The gold ring on
 * the chosen swatch is the answer they keep.
 */
function PreviewDie({ color }) {
  const [still] = useState(() => prefersReducedMotion());

  const body = diceColorHex(color);

  useEffect(() => {
    if (still) {
      return undefined;
    }

    return () => releasePreviewDie();
  }, [still]);

  // The colour IS the throw: dice-box paints the body from `themeColor` as each
  // die is created, so a new colour is a new die rather than a repaint.
  useEffect(() => {
    if (!still) {
      showPreviewDie(body);
    }
  }, [body, still]);

  if (still) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => showPreviewDie(body)}
      aria-label="Throw the preview die again"
      className="dice-preview size-32 shrink-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {/* The roller writes its canvas in here on first use and leaves it
          there. Never a click target itself — the press belongs to the button
          around it. */}
      <span
        id={PREVIEW_STAGE_ID}
        aria-hidden="true"
        className="block size-full"
      />
    </button>
  );
}
