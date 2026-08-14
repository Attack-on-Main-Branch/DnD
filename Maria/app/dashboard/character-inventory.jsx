"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_CHARACTERS } from "sina/rules/character";

import { surfaceClasses } from "@/app/components/ui/surface";

import CharacterCard from "./character-card";
import CreateCharacterPanel from "./create-character-panel";

/**
 * The character roster, laid out as a fixed set of inventory slots: filled
 * ones show the character, empty ones are the way to create another. The slot
 * count *is* the account limit, so the ceiling is visible rather than being a
 * surprise error at the end.
 *
 * Whether the creation sheet is open lives in the URL — `/dashboard?new`—
 * rather than in component state. It was state, and that made the header's
 * "Grimoire Tales" link a dead end while creating: it pointed at /dashboard,
 * which was already the current URL, so nothing happened and the sheet stayed
 * open. With the URL as the source of truth that link genuinely leaves, and
 * the browser's back button works too.
 */
export default function CharacterInventory({ characters, creating }) {
  const router = useRouter();

  const emptySlots = Math.max(0, MAX_CHARACTERS - characters.length);

  if (creating) {
    return <CreateCharacterPanel onClose={() => router.push("/dashboard")} />;
  }

  // Two columns from `md` rather than `sm`. At the narrow end of the old range
  // a card was only ~284px wide, and 16:9 made it 160px tall — shorter than
  // the name, four facts and the corner row need.
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <li key={character.id}>
          <CharacterCard character={character} />
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
