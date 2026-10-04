import { DICE_POUCH_SLUG } from "sina/rules/dice-pouch";

/**
 * A Dice Pouch as it is written into a pack. The slug is Sina's and reserved —
 * `guard_dice_pouch` lets only the head of the table add one — and the words
 * are this app's, copied into the row when it is handed over.
 */
export const DICE_POUCH_ITEM = {
  slug: DICE_POUCH_SLUG,
  name: "Dice Pouch",
  category: "Dice",
  description:
    "A drawstring pouch holding one set of dice you have not found yet. Open it to see which.",
  isCustom: false,
  facts: {},
};
