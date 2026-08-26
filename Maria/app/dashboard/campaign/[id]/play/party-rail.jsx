"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { parseHitPoints } from "sina/rules/health";
import { parseInspiration } from "sina/rules/inspiration";
import { parseLevel } from "sina/rules/level";
import { parseXp } from "sina/rules/xp";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";

import PartyCard from "./party-card";
import { useTableStore } from "./table-state";
import { useTableWire, useWireMessage } from "./table-wire";
import { useTableDeed } from "./use-table-deed";

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
 * IT REFRESHES THE ROUTE FOR ITS LIST AND NOT FOR A NUMBER. A card that does not
 * exist is a thing only the server can draw, so somebody joining the party mid
 * session is a real `router.refresh()`; a hit point is held in table-state.jsx
 * and re-renders the one control that shows it.
 *
 * IT ALSO ANSWERS FOR THE SESSION PANEL, which only the head of the table opens:
 * a player's experience has to move on their screen too, and this rail is the
 * one piece every seat mounts.
 *
 * The wire is the only way these travel between chairs. `characters` is not a
 * table another player may read a row of — that is what `campaign_party` exists
 * to stand in for — so the subscription below could not carry a hit point.
 */
export default function PartyRail({
  campaignId,
  members,
  isDungeonMaster = false,
  seatCharacterId = null,
  seatTitle = null,
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const store = useTableStore();
  const { seated } = useTableWire();
  const { resync } = useTableDeed(campaignId);

  /* The whole route, and only for the two things that actually change it. */
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

  /* Nothing off the wire is believed beyond its shape: the number goes through
     the same rule that bound the sender's own write, and the id only ever picks
     out a card this rail already has from the server — `setHealth` and
     `setLevel` write to no slot they were not seeded with. */
  useWireMessage("health", (message) => {
    store.setHealth(message.characterId, parseHitPoints(message.hitPoints));
  });

  /* A LEVEL ALSO REFRESHES THE ROUTE, where a hit point does not: the ability
     sheet's panels are built in page.jsx, and every proficient skill on them is
     read off the proficiency bonus a level decides. An award is a handful of
     presses a session. */
  useWireMessage("level", (message) => {
    const level = parseLevel(message.level);

    if (level === null) {
      return;
    }

    store.setLevel(message.characterId, level);
    refresh();
  });

  /* Experience, and the rung it may have carried them to. Same rails: both
     numbers go through the rules that bound the sender's own write, and the id
     only ever picks out a card this rail already has from the server. A level
     that MOVED refreshes for the reason above, whichever way it went. */
  useWireMessage("xp", (message) => {
    const level = parseLevel(message.level);
    const xp = parseXp(message.xp);

    if (level === null || xp === null) {
      return;
    }

    const moved = level !== store.read().levels[message.characterId];

    store.setXp(message.characterId, xp, level);

    /* A rung that moved took the frame with it: `characters_sync_max_hp`
       recomputed the maximum and carried the bar across. Both figures came off
       the server's own party list before this was sent. */
    store.setFrame(
      message.characterId,
      parseHitPoints(message.maxHp),
      parseHitPoints(message.hitPoints),
    );

    if (moved) {
      refresh();
    }
  });

  /* One mark. `setInspiration` writes to no card this rail was not seeded a
     figure for, so a player cannot be told somebody else's. */
  useWireMessage("inspiration", (message) => {
    store.setInspiration(
      message.characterId,
      parseInspiration(message.inspiration),
    );
  });

  /* A DOORBELL AND NOT A NUMBER. A rest moves a bar and as many as nine pips
     across up to six characters, and none of that has been through a `select()`
     list — so the other chairs are told that it happened and go and read it. */
  useWireMessage("rest", () => {
    resync({ party: true, sheets: true, seatCharacterId });
  });

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
        {members.map((member, index) => (
          <PartyCard
            key={member.id}
            campaignId={campaignId}
            member={member}
            index={index}
            count={members.length}
            here={seated.has(member.id)}
            // The head of the table reads the whole party's bars, a player
            // their own alone.
            showsHealth={isDungeonMaster || member.id === seatCharacterId}
            canEdit={isDungeonMaster || member.id === seatCharacterId}
            // The seat, not the deed — see inspiration-pips.jsx for why the
            // database cannot draw this line on its own.
            showsInspiration={isDungeonMaster || member.id === seatCharacterId}
            isDungeonMaster={isDungeonMaster}
            seatCharacterId={seatCharacterId}
            // Only ever read back to the person who pressed, on the line the
            // panel shows while the write is out. The name the log KEEPS is
            // derived in the database from the row.
            actorName={seatTitle}
          />
        ))}
      </ul>
    </div>
  );
}
