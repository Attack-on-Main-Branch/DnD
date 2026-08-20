import Link from "next/link";
import { characterHandle, MAX_CHARACTERS } from "sina/rules/character";

import { surfaceClasses } from "@/app/components/ui/surface";

import CharacterCard from "./character-card";
import CharacterFacts from "./character-facts";
import {
  HEADING_CLASSES,
  headingStyle,
  ROSTER,
  tileEntrance,
} from "./entrance";

/**
 * The character roster as a fixed set of inventory slots: filled ones show the
 * character, empty ones create another. The slot count *is* the account limit,
 * so the ceiling is visible rather than a surprise error at the end.
 *
 * A Server Component. `"use client"` here cost more than the one `router.push`
 * it was for — everything in a Client Component's module graph goes to the
 * browser, so the whole creation flow was downloaded by anyone who did nothing
 * but look at their roster. `dashboard/page.jsx` reads `?new` on the server.
 */
export default function CharacterInventory({ characters }) {
  const emptySlots = Math.max(0, MAX_CHARACTERS - characters.length);

  // Two columns from `md` rather than `sm`: at the narrow end of the old range
  // a card was ~284px wide, and 16:9 made it shorter than its content needs.
  return (
    <section>
      {/*
        Its own heading and its own count, matching the campaigns section
        below. The count used to sit up beside "Welcome back", where it read as
        a fact about the account rather than about this grid — and once there
        were two grids with two separate caps, one of them floating at the top
        of the page could only be confusing.
      */}
      <div
        data-fade
        className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-3 ${HEADING_CLASSES}`}
        style={headingStyle(ROSTER)}
      >
        <h2 className="font-display text-xl font-semibold tracking-wide text-ink">
          Characters
        </h2>

        <p className="font-sans text-xs tracking-wide text-ink/50 uppercase">
          {characters.length} of {MAX_CHARACTERS} slots used
        </p>
      </div>

      <ul className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* The card is the client boundary and reads five fields, so only
            those cross it. The other eighteen — `backstory` and `personality`
            among them, up to 2000 characters each — were being serialised into
            the flight payload on every dashboard load with nothing rendering
            them. `facts` and `handle` are built here and cross as output. */}
        {characters.map((character, index) => (
          <li key={character.id} {...tileEntrance(ROSTER, index)}>
            <CharacterCard
              character={{
                id: character.id,
                name: character.name,
                discriminator: character.discriminator,
                race: character.race,
                color_theme: character.color_theme,
              }}
              handle={characterHandle(character)}
              facts={<CharacterFacts character={character} />}
            />
          </li>
        ))}

        {Array.from({ length: emptySlots }, (_, index) => (
          <li
            key={`empty-${index}`}
            {...tileEntrance(ROSTER, characters.length + index)}
          >
            {/* `?new=player`, so the sheet knows which of the two it is before
                it mounts — the role question in front of it is gone. */}
            <EmptySlot href="/dashboard?new=player" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The same glass panel as a filled card; only the dashed edge differs. */
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
