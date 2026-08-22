"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import DiceCapsule from "./dice-capsule";
import { CARD_CLASSES, cardEntrance } from "./entrance";
import { useTableWire, useWireMessage } from "./table-wire";

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
 * The rail keeps its own list current, which presence cannot do for it: a lit
 * rim only lights a card that is already here, so somebody who joined the party
 * after this page was rendered would sit down to no card at all. They say so as
 * they arrive and this re-reads, but only for a name it does not have. The
 * Postgres subscription beside it is the backstop for the other direction — a
 * member removed, a campaign deleted.
 *
 * A lit rim means somebody is here, for as long as they have this table open.
 * See table-wire.jsx for the rule that is not obvious: a Dungeon Master who
 * also plays a character here leaves that card dark.
 *
 * A roll comes out from under the card of whoever made it, whichever browser
 * that was — every card carries a pill and each answers for its own character.
 * The Dungeon Master's chair has no card, so theirs comes out beside the party
 * as a whole.
 */
export default function PartyRail({ campaignId, members }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useWireMessage("seat", (message) => {
    if (typeof message.characterId !== "string") {
      return;
    }

    if (members.some((member) => member.id === message.characterId)) {
      return;
    }

    refresh();
  });

  useLiveRefresh({
    channel: `party:${campaignId}`,
    table: "campaign_members",
    // Bandwidth, not security — the SELECT policies are what decide what may be
    // delivered at all, and they hand a player only their own membership.
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });

  const { seated } = useTableWire();

  if (members.length === 0) {
    return (
      <div className="relative w-full">
        <p className="text-center text-sm text-ink/50 italic lg:text-left">
          Nobody has joined this party yet.
        </p>

        <DiceCapsule />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <ul className="flex w-full flex-col gap-3">
        {members.map((member, index) => {
          const here = seated.has(member.id);

          return (
            <li
              key={member.id}
              className={surfaceClasses({
                className:
                  "relative flex items-center gap-3 rounded-xl p-4 " +
                  // On the card rather than in `.lit-gold`, so the rim fades
                  // out when that class is taken away as well as in.
                  "transition-[border-color,box-shadow] duration-300 " +
                  `${here ? "lit-gold " : ""}${CARD_CLASSES}`,
              })}
              {...cardEntrance(index, members.length)}
            >
              <DiceCapsule characterId={member.id} />

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

      {/* The head of the table's own, which belongs to no card. */}
      <DiceCapsule />
    </div>
  );
}
