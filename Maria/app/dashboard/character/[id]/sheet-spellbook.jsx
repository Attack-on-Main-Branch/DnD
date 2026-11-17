"use client";

import { useState } from "react";

import DetailOverlay from "@/app/dashboard/detail-overlay";
import { EmptySpellbook } from "@/app/dashboard/empty-catalogue";
import SpellDetail from "@/app/dashboard/spell-detail";
import SpellShelves from "@/app/dashboard/spell-shelves";

export default function SheetSpellbook({ shelves, known, slots }) {
  const [reading, setReading] = useState(null);
  const spell = shelves
    .flatMap((shelf) => shelf.spells)
    .find((one) => one.slug === reading);

  return (
    <div className="flex flex-col gap-4">
      {slots}

      {known === 0 ? (
        <EmptySpellbook description="What you are taught at a table, and what you write into the book yourself, will be shelved here by its level." />
      ) : (
        <div>
          <p className="font-mono text-[0.625rem] tracking-[0.16em] text-ink/45 uppercase">
            {known} known
          </p>
          <SpellShelves
            shelves={shelves}
            openSlug={reading}
            onOpen={(one) => setReading(one.slug)}
          />
        </div>
      )}

      <DetailOverlay title={spell?.name} onClose={() => setReading(null)}>
        {spell && <SpellDetail spell={spell} />}
      </DetailOverlay>
    </div>
  );
}
