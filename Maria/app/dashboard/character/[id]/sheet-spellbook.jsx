"use client";

import { useState } from "react";

import SpellDetail, { EmptySpellbook } from "@/app/dashboard/spell-detail";
import SpellRow from "@/app/dashboard/spell-row";
import Shelf from "@/app/dashboard/spell-shelf";

/**
 * The Spells tab, drawn as the spellbook above the map is: a page of names
 * shelved by level, whichever one is pressed read out in full underneath, and
 * the slots at the foot.
 *
 * BETWEEN THE PACK AND THE NOTES, because that is the order the marks stand in
 * at the table — what you carry, what you know, what you wrote down. A sheet
 * that ordered them differently would be teaching a second layout for the same
 * five things.
 *
 * READ-ONLY, for the reason the pack beside it is: a spell is learnt, cast and
 * struck out at a table, in front of whoever is running it. `Cast`, `Learn` and
 * `Forget` all live in the book above the map, and the slot bar here says where
 * a caster stands rather than offering to move them.
 *
 * The bar itself arrives already built — see the panel in character-panels.jsx.
 * It needs the class and the rung to know how many pips to draw, and neither is
 * anything the browser should be handed a catalogue to work out.
 */
export default function SheetSpellbook({ shelves, known, slots }) {
  const [reading, setReading] = useState(null);

  function show(spell) {
    setReading((standing) => (standing?.slug === spell.slug ? null : spell));
  }

  if (known === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptySpellbook description="What you are taught at a table, and what you write into the book yourself, will be shelved here by its level." />
        {slots}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
          {known} known
        </p>

        {shelves.map((shelf) => (
          <Shelf
            key={shelf.level}
            label={shelf.label}
            count={shelf.spells.length}
          >
            {shelf.spells.map((spell) => (
              <li key={spell.slug} className="flex">
                <SpellRow
                  spell={spell}
                  open={reading?.slug === spell.slug}
                  onOpen={() => show(spell)}
                />
              </li>
            ))}
          </Shelf>
        ))}
      </div>

      {/* No children, so it ends at what the rulebook says — the deeds it would
          carry are not this page's to offer. */}
      {reading && <SpellDetail spell={reading} />}

      {slots}
    </div>
  );
}
