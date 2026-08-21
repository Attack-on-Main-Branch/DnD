"use client";

import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import { CARD_CLASSES, cardEntrance } from "./entrance";
import { useTablePresence } from "./use-table-presence";

/**
 * Who is at the table, stacked down the right rail and cascading in from off
 * screen. The width is the grid column's, reserved in page.jsx.
 *
 * `gap-3` rather than `gap-4`: a full party of six has to fit beside a 60vh
 * map, and the extra quarter-rem across five gaps decides it at 720px tall.
 *
 * Real glass, and the budget was checked first: `backdrop-filter` is charged
 * per element — see surface.js — and six cards plus the map's frame and the
 * application bar is eight, the warning line rather than the ceiling.
 *
 * A lit rim means somebody is here, for as long as they have this table open.
 * See use-table-presence.js for the rule that is not obvious: a Dungeon Master
 * who also plays a character here leaves that card dark.
 */
export default function PartyRail({
  campaignId,
  members,
  seatId,
  seatCharacterId,
}) {
  const seated = useTablePresence({ campaignId, seatId, seatCharacterId });

  if (members.length === 0) {
    return (
      <p className="w-full text-center text-sm text-ink/50 italic lg:text-left">
        Nobody has joined this party yet.
      </p>
    );
  }

  return (
    <ul className="flex w-full flex-col gap-3">
      {members.map((member, index) => {
        const here = seated.has(member.id);

        return (
          <li
            key={member.id}
            className={surfaceClasses({
              className:
                "flex items-center gap-3 rounded-xl p-4 " +
                // On the card rather than in `.lit-gold`, so the rim fades
                // out when that class is taken away as well as in.
                "transition-[border-color,box-shadow] duration-300 " +
                `${here ? "lit-gold " : ""}${CARD_CLASSES}`,
            })}
            {...cardEntrance(index, members.length)}
          >
            <Avatar
              initials={characterInitials(member.name)}
              colorClass={avatarColorClass(member.color_theme)}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-semibold tracking-wide text-ink">
                {member.name}
              </p>
              <p className="font-mono text-xs text-gold/70">
                #{member.discriminator}
              </p>
              <p className="mt-0.5 truncate font-display text-[10px] tracking-[0.15em] text-ink/50 uppercase">
                {member.race}
                {member.pathLabel ? ` · ${member.pathLabel}` : ""}
              </p>
            </div>

            {/* A bare number in a ring needs no label to be read as the
                level, and says nothing out loud — hence `aria-hidden` and the
                line below. `size-9` is the ring, `text-lg` the digit, and
                `leading-none` is what keeps the glyph off the line box's
                floor. */}
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/15 font-display text-lg leading-none font-semibold text-gold"
            >
              {member.level}
            </span>

            {/* What the rim means, for a reader who cannot see it. */}
            <span className="sr-only">
              Level {member.level}
              {here ? ", at the table" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
