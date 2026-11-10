import { POUCH_SLUG } from "sina/rules/dice-pouch";

/**
 * A Pouch as it is written into a pack. The slug is Sina's and reserved —
 * `guard_dice_pouch` lets only the head of the table add one — and the words
 * are this app's, copied into the row when it is handed over.
 */
export const POUCH_ITEM = {
  slug: POUCH_SLUG,
  name: "Pouch",
  category: "Skins",
  summary: "A dice or banner skin you have not found yet.",
  description:
    "A drawstring pouch holding one dice or banner skin you have not found yet. Open it to see which.",
  isCustom: false,
  facts: {},
};
