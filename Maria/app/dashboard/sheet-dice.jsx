"use client";

import { useState, useTransition } from "react";

import Button from "@/app/components/ui/button";
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

/**
 * The Dice tab: what this sheet's dice are made of and the colour they come
 * in, tried on a real die before anything is written. The pickers fill the
 * page; the die stands beside them, any of the set thrown on demand.
 *
 * Saved by a button rather than on every change: a drag across the colour field
 * is a hundred colours, and only the one it stops on is a decision.
 */
export default function SheetDice({
  diceColor,
  diceSkin,
  unlocked,
  allUnlocked = false,
  saveDice,
}) {
  const stored = { color: diceColorHex(diceColor), skin: diceSkin };

  const [color, setColor] = useState(stored.color);
  const [skin, setSkin] = useState(stored.skin);
  const [die, setDie] = useState(PREVIEW_DIE);
  const [note, setNote] = useState(null);
  const [saving, startSaving] = useTransition();

  /* The route renders again after a save, or after the sheet's editor; what it
     brings back is the new resting point, adjusted during render. */
  const [adopted, setAdopted] = useState(stored);

  if (adopted.color !== stored.color || adopted.skin !== stored.skin) {
    setAdopted(stored);
    setColor(stored.color);
    setSkin(stored.skin);
  }

  const changed = color !== stored.color || skin !== stored.skin;

  // A word about the last save stops being true the moment anything moves.
  function edit(set) {
    return (value) => {
      setNote(null);
      set(value);
    };
  }

  function save() {
    setNote(null);

    startSaving(async () => {
      const result = await saveDice({
        diceColor: color,
        diceSkin: skin,
      });

      setNote(
        result?.kind === "success"
          ? "Your dice are saved."
          : (result?.message ?? "Could not save the dice."),
      );
    });
  }

  const chosen = diceSkinDetails(skin);
  const pictures = diceSkinPictures(skin);
  const cell = DICE_TYPES.indexOf(die);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-8">
        <DiceColorPicker
          value={color}
          onChange={edit(setColor)}
          disabled={saving}
        />
        <DiceSkinPicker
          value={skin}
          color={color}
          unlocked={unlocked}
          allUnlocked={allUnlocked}
          onChange={edit(setSkin)}
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

        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={save} disabled={!changed || saving}>
            {saving ? "Saving…" : "Save dice"}
          </Button>

          {changed && !saving && (
            <Button
              variant="ghost"
              onClick={() => {
                setColor(stored.color);
                setSkin(stored.skin);
                setNote(null);
              }}
            >
              Undo
            </Button>
          )}
        </div>

        <p role="status" className="min-h-4 text-center text-xs text-gold/75">
          {note}
        </p>
      </aside>
    </div>
  );
}
