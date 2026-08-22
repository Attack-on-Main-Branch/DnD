"use client";

import WorldGlobe from "@/app/components/ui/world-globe";

import TablePopover from "./table-popover";

/**
 * The globe above the map, and the world behind it: what the Dungeon Master
 * wrote on the creation sheet, which is the only place it is written.
 *
 * A Client Component only because TablePopover is one.
 */
export default function WorldLore({ title, lore }) {
  return (
    <TablePopover
      icon={WorldGlobe}
      label={`World lore of ${title}`}
      title={`The world of ${title}`}
    >
      {lore ? (
        <div className="scroll-gold max-h-80 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink/80">
            {lore}
          </p>
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <p className="font-display text-base font-medium tracking-wide text-ink/80">
            Nothing is known of this world
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink/50">
            No lore was written for this campaign.
          </p>
        </div>
      )}
    </TablePopover>
  );
}
