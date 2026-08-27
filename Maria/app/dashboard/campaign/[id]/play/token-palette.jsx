"use client";

import Avatar from "@/app/components/ui/avatar";
import { diceColorClass } from "@/app/dashboard/character-presentation";

import { useTableMaps } from "./table-maps";

/**
 * The party, as pieces to be put down — the Dungeon Master's hand.
 *
 * ON THE RAIL AND NOT IN A DRAWER, because it is used WHILE looking at the
 * board: pick a face, click a hex, pick the next.
 *
 * ONLY WHEN THERE IS A GRID, and only for the Dungeon Master — page.jsx mounts
 * it inside the branch that decides the second. The selection lives in
 * table-maps.jsx, the face being on the rail and the hex on the map.
 */
export default function TokenPalette({ members }) {
  const { grid, holding, hold } = useTableMaps();

  if (!grid.enabled || members.length === 0) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Place a token"
      className="flex w-14 shrink-0 flex-col items-center gap-1.5 pt-1"
    >
      {/* What the stack is for. */}
      <p
        aria-hidden="true"
        className="font-mono text-[9px] tracking-[0.12em] text-ink/40 uppercase"
      >
        Place
      </p>

      {members.map((member) => {
        const held = holding === member.id;

        return (
          <button
            key={member.id}
            type="button"
            /* PICKED UP ON THE PRESS, which is what makes it a drag: the
               board listens from the moment a face goes down. A press that
               ends where it started leaves the piece in the hand, to be put
               down with a second click. */
            onPointerDown={(event) => {
              if (event.button !== 0 || !event.isPrimary) {
                return;
              }

              event.preventDefault();
              hold(held ? null : member.id);
            }}
            aria-pressed={held}
            aria-label={
              held
                ? `Holding ${member.name}. Click the map to place, or press again to put down.`
                : `Pick up ${member.name}`
            }
            /* `grid size-10`, not the button's own inline box: the line box
               under an inline-flex avatar left descender space, and the ring
               came out a rounded rectangle taller than the face. */
            className={`grid size-10 cursor-grab place-items-center rounded-full transition duration-300 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              held
                ? "ring-2 ring-gold shadow-[0_0_10px_var(--gold-70)]"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            <Avatar
              src={member.avatar_url}
              colorClass={diceColorClass(member.dice_color)}
              size="sm"
              ring={false}
            />
          </button>
        );
      })}
    </div>
  );
}
