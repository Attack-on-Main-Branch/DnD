"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { MAX_HP, parseHitPoints } from "sina/rules/health";
import { parseLevel } from "sina/rules/level";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import CardHealth from "./card-health";
import DiceCapsule from "./dice-capsule";
import { CARD_CLASSES, cardEntrance } from "./entrance";
import LevelRing from "./level-ring";
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
 * The Dungeon Master's chair has no card; theirs comes out from under the board
 * instead — see map-stage.jsx.
 *
 * The cards carry the party's hit points now — see card-health.jsx.
 *
 * Both numbers on a card can be moved from another browser, and both arrive the
 * same way: whoever writes says so over the table's wire once the server has
 * taken it, and every other rail lays that over the row it has while it
 * re-reads. The Postgres subscription below cannot do either — `characters` is
 * not a table another player may read a row of, which is what `campaign_party`
 * exists to stand in for.
 */
/**
 * A number heard over the wire, and what the server was saying when it was
 * heard. The second half is what expires it: once the server's number is no
 * longer the one this was heard OVER, the head start is done.
 *
 * `read` puts the value through the same `sina/rules/*` that bound the sender's
 * own write, and `sent` is only consulted for a character this rail already has
 * — nothing off the socket has been through a `select()` list.
 */
function useHeadStart(kind, read, sent, refresh) {
  const [heard, setHeard] = useState({});

  useWireMessage(kind, (message) => {
    const value = read(message);

    if (value === null || !sent.has(message.characterId)) {
      return;
    }

    setHeard((current) => ({
      ...current,
      [message.characterId]: { value, over: sent.get(message.characterId) },
    }));

    refresh();
  });

  return heard;
}

/** The moment the row moves, for any reason, the server's number wins. */
function laidOver(heard, characterId, sent) {
  const said = heard[characterId];

  return said && sent === said.over ? said.value : sent;
}

export default function PartyRail({
  campaignId,
  members,
  isDungeonMaster = false,
  seatCharacterId = null,
}) {
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

  const { seated, send } = useTableWire();

  const levels = useMemo(
    () => new Map(members.map((member) => [member.id, member.level])),
    [members],
  );

  const hitPoints = useMemo(
    () => new Map(members.map((member) => [member.id, member.current_hp])),
    [members],
  );

  const heardLevel = useHeadStart(
    "level",
    (message) => parseLevel(message.level),
    levels,
    refresh,
  );

  const heardHealth = useHeadStart(
    "health",
    (message) => parseHitPoints(message.hitPoints),
    hitPoints,
    refresh,
  );

  const toldLevel = useCallback(
    (characterId, level) => send({ kind: "level", characterId, level }),
    [send],
  );

  const toldHealth = useCallback(
    (characterId, points) =>
      send({ kind: "health", characterId, hitPoints: points }),
    [send],
  );

  if (members.length === 0) {
    return (
      <div className="w-full">
        <p className="text-center text-sm text-ink/50 italic lg:text-left">
          Nobody has joined this party yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ul className="flex w-full flex-col gap-3">
        {members.map((member, index) => {
          const here = seated.has(member.id);

          const level = laidOver(heardLevel, member.id, member.level);

          // Clamped to this character's own maximum. `parseHitPoints` bounds a
          // heard number by the app's ceiling, which is as much as a rule with
          // no row in front of it can know; the row is here.
          const current_hp = Math.min(
            laidOver(heardHealth, member.id, member.current_hp),
            member.max_hp ?? MAX_HP,
          );

          // The head of the table reads the whole party's bars, a player
          // their own alone.
          const showsHealth = isDungeonMaster || member.id === seatCharacterId;

          return (
            <li
              key={member.id}
              className={surfaceClasses({
                className:
                  // A column now rather than a row: the bar goes under the
                  // name it belongs to, and the row above it is unchanged.
                  "relative flex flex-col rounded-xl p-4 " +
                  // On the card rather than in `.lit-gold`, so the rim fades
                  // out when that class is taken away as well as in.
                  "transition-[border-color,box-shadow] duration-300 " +
                  `${here ? "lit-gold " : ""}${CARD_CLASSES}`,
              })}
              {...cardEntrance(index, members.length)}
            >
              {/* Out of flow, so it answers to the card rather than to a row
                  inside it. */}
              <DiceCapsule characterId={member.id} />

              <div className="flex items-center gap-3">
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

                {/* Carries the card's whole accessible line, the rim
                  included: the number is the optimistic one while a press is in
                  flight, and that is what a reader should hear. */}
                <LevelRing
                  campaignId={campaignId}
                  characterId={member.id}
                  name={member.name}
                  level={level}
                  canAward={isDungeonMaster}
                  atTable={here}
                  onWritten={toldLevel}
                />
              </div>

              {showsHealth && (
                <CardHealth
                  campaignId={campaignId}
                  member={{ ...member, current_hp }}
                  seatCharacterId={seatCharacterId}
                  canEdit={isDungeonMaster || member.id === seatCharacterId}
                  onWritten={toldHealth}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
