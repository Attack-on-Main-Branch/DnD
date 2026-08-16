import Link from "next/link";
import { characterHandle, MAX_CHARACTERS } from "sina/rules/character";

import { surfaceClasses } from "@/app/components/ui/surface";

import CharacterCard from "./character-card";
import CharacterFacts from "./character-facts";

/**
 * The character roster, laid out as a fixed set of inventory slots: filled
 * ones show the character, empty ones are the way to create another. The slot
 * count *is* the account limit, so the ceiling is visible rather than being a
 * surprise error at the end.
 *
 * A Server Component. It used to carry `"use client"` for one `router.push`,
 * and the cost of that directive was not the push — it was the static import of
 * the creation panel below it, which pulled `PlayerCharacterForm` and
 * `ClassPicker` into the same client chunk. Everything in a Client Component's
 * module graph goes to the browser, so the entire creation flow was downloaded
 * by every visitor who did nothing but look at their roster.
 *
 * The branch that chose between roster and creation sheet lived here too, which
 * was the odd part: `dashboard/page.jsx` reads `?new` off the URL on the server
 * and already knows the answer. It decides now, and this file only ever renders
 * the grid.
 */
export default function CharacterInventory({ characters }) {
  const emptySlots = Math.max(0, MAX_CHARACTERS - characters.length);

  // Two columns from `md` rather than `sm`. At the narrow end of the old range
  // a card was only ~284px wide, and 16:9 made it 160px tall — shorter than
  // the name, four facts and the corner row need.
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <li key={character.id}>
          <CharacterCard
            character={character}
            handle={characterHandle(character)}
            facts={<CharacterFacts character={character} />}
          />
        </li>
      ))}

      {Array.from({ length: emptySlots }, (_, index) => (
        <li key={`empty-${index}`}>
          <EmptySlot href="/dashboard?new" />
        </li>
      ))}
    </ul>
  );
}

/**
 * The same glass panel as a filled card and as the settings sections — only
 * the edge differs, dashed rather than solid, which is what reads as "empty
 * slot" without making it a different kind of object.
 */
function EmptySlot({ href }) {
  return (
    <Link
      href={href}
      className={surfaceClasses({
        glow: true,
        className:
          "group flex aspect-video min-h-58 w-full flex-col items-center justify-center gap-3 rounded-2xl border-dashed text-ink/50 hover:text-gold",
      })}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border border-gold/30 text-2xl leading-none font-light text-gold/70 transition duration-300 group-hover:border-gold/70 group-hover:text-gold group-hover:shadow-[0_0_24px_-4px_rgba(255,223,156,0.6)]"
      >
        +
      </span>
      <span className="font-display text-sm tracking-wide">New character</span>
    </Link>
  );
}
