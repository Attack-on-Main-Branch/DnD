"use client";

import { useState } from "react";

import {
  alignmentLabel,
  characterHandle,
  MAX_CHARACTERS,
} from "./character-schema";
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
        <p className="text-xs text-neutral-500">
          {characters.length} of {MAX_CHARACTERS} slots used
        </p>
      </div>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <li key={character.id}>
            <CharacterSlot character={character} />
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

function CharacterSlot({ character }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h3 className="font-semibold tracking-tight">{character.name}</h3>
      <p className="font-mono text-xs text-neutral-500">
        #{character.discriminator}
      </p>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-neutral-500">Race</dt>
          <dd className="font-medium">{character.race}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-neutral-500">Alignment</dt>
          <dd className="font-medium">{alignmentLabel(character.alignment)}</dd>
        </div>
      </dl>

      {character.backstory && (
        <p className="mt-3 line-clamp-3 text-xs text-neutral-600 dark:text-neutral-400">
          {character.backstory}
        </p>
      )}

      <p className="mt-auto pt-4 font-mono text-[0.7rem] text-neutral-400">
        {characterHandle(character)}
      </p>
    </article>
  );
}

function EmptySlot({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 text-neutral-500 transition hover:border-indigo-500 hover:bg-indigo-500/5 hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/15 dark:hover:text-indigo-400"
    >
      <span aria-hidden="true" className="text-3xl leading-none font-light">
        +
      </span>
      <span className="text-xs font-medium">New character</span>
    </button>
  );
}
