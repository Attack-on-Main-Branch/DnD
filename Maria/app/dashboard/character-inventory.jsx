"use client";

import { useState } from "react";

import CharacterCard from "./character-card";
import { MAX_CHARACTERS } from "sina/rules/character";
import CreateCharacterPanel from "./create-character-panel";

/**
 * The character roster, laid out as a fixed set of inventory slots: filled
 * ones show the character, empty ones are the way to create another. The slot
 * count *is* the account limit, so the ceiling is visible rather than being a
 * surprise error at the end.
 */
export default function CharacterInventory({ characters }) {
  const [creating, setCreating] = useState(false);

  const emptySlots = Math.max(0, MAX_CHARACTERS - characters.length);

  if (creating) {
    return <CreateCharacterPanel onClose={() => setCreating(false)} />;
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Characters</h2>
        <p className="text-xs text-neutral-400">
          {characters.length} of {MAX_CHARACTERS} slots used
        </p>
      </div>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <li key={character.id}>
            <CharacterCard character={character} />
          </li>
        ))}

        {Array.from({ length: emptySlots }, (_, index) => (
          <li key={`empty-${index}`}>
            <EmptySlot onClick={() => setCreating(true)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptySlot({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 text-neutral-400 transition hover:border-indigo-500 hover:bg-indigo-500/5 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/15 dark:hover:text-indigo-400"
    >
      <span aria-hidden="true" className="text-3xl leading-none font-light">
        +
      </span>
      <span className="text-xs font-medium">New character</span>
    </button>
  );
}
