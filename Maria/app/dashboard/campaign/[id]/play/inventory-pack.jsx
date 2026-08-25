"use client";

import { useCallback, useMemo, useState } from "react";

import { emptyPurse } from "sina/rules/currency";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import TravellingPack from "@/app/components/ui/travelling-pack";

import DmPackDrawer from "./dm-pack-drawer";
import PlayerPackDrawer from "./player-pack-drawer";
import TablePopover from "./table-popover";
import { useAllPacks, useAllPurses } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

/**
 * The pack beside the scroll, and what is in it. One control, two drawers —
 * which of them is the SEAT's, not the account's, the same line the health band
 * is drawn on.
 *
 * The rows are held in table-state.jsx rather than handed down, so a press
 * paints on the frame it happens and the write follows.
 *
 * Postgres changes are the honest half, the table's wire the fast one, and both
 * are DOORBELLS: no payload is read, because a row off the socket has not been
 * through the `select()` list in Sina's data layer. What answers them is
 * `readTableSlice` — the packs and the purses, not the whole route.
 *
 * The two subscriptions are NOT equivalent. `character_inventory` has a SELECT
 * policy that admits a Dungeon Master, so Postgres tells them about the whole
 * party's packs; `characters` has only "Users read their own characters", so a
 * purse change reaches its owner and nobody else, and the wire carries it the
 * rest of the way.
 */
export default function InventoryPack({
  campaignId,
  seat,
  members,
  isDungeonMaster,
}) {
  const packs = useAllPacks();
  const purses = useAllPurses();
  const { resync } = useTableDeed(campaignId);

  /* A counter, not a flag: TablePopover uses it as a `key`, and changing a key
     is what restarts a CSS animation. */
  const [arrived, setArrived] = useState(0);

  /**
   * Whose packs this browser watches: the party for a Dungeon Master, one
   * character for a player. PostgREST syntax, and a bandwidth measure rather
   * than a security one — the SELECT policy decides what may be delivered.
   *
   * Undefined for an empty party: `in.()` is a syntax error, and RLS answers an
   * unfiltered subscription with the same nothing.
   */
  const watching = (
    isDungeonMaster
      ? members.map((member) => member.id)
      : [seat.characterId].filter(Boolean)
  ).join(",");

  /* A string first: `useLiveRefresh` rebuilds its subscription whenever
     `filter` changes identity, so the dependency must be a value rather than
     the array it came from. */
  const filter = useMemo(() => {
    const ids = watching ? watching.split(",") : [];

    if (ids.length === 0) {
      return undefined;
    }

    return ids.length === 1
      ? `character_id=eq.${ids[0]}`
      : `character_id=in.(${watching})`;
  }, [watching]);

  /* The same set of characters, keyed on the column `characters` calls it. RLS
     narrows this one much further than the pack's — see the note above. */
  const purseFilter = useMemo(() => {
    const ids = watching ? watching.split(",") : [];

    if (ids.length === 0) {
      return undefined;
    }

    return ids.length === 1 ? `id=eq.${ids[0]}` : `id=in.(${watching})`;
  }, [watching]);

  const watched = useMemo(
    () => new Set(watching ? watching.split(",") : []),
    [watching],
  );

  /** Both halves at once: a hand-over moves a pack and a purse is coin. */
  const reread = useCallback(
    () =>
      resync({
        inventory: true,
        purses: true,
        characterIds: watching ? watching.split(",") : [],
      }),
    [resync, watching],
  );

  useLiveRefresh({
    channel: `pack:${campaignId}`,
    table: "character_inventory",
    filter,
    onChange: reread,
  });

  /* Hears more than it asked for, knowingly: `postgres_changes` filters by row
     and never by column, so a hit point on the same row rings this too. That is
     two queries now rather than a whole route render. */
  useLiveRefresh({
    channel: `purse:${campaignId}`,
    table: "characters",
    filter: purseFilter,
    onChange: reread,
  });

  /**
   * Somebody else moved something this drawer is showing. The same answer for
   * a pack and for a purse: re-read, and shake the mark if it was this seat's.
   */
  const heard = useCallback(
    (message) => {
      if (typeof message.characterId !== "string") {
        return;
      }

      // A Dungeon Master running two tables has one of them open.
      if (!watched.has(message.characterId)) {
        return;
      }

      // `self: false` on the channel, so this is always somebody else's doing.
      if (message.characterId === seat.characterId) {
        setArrived((count) => count + 1);
      }

      reread();
    },
    [reread, seat.characterId, watched],
  );

  useWireMessage("pack", heard);
  useWireMessage("purse", heard);

  /* Maps rather than the store's own objects, because that is the shape both
     drawers already read. Six entries at most, so the copy is free. */
  const packMap = useMemo(() => new Map(Object.entries(packs)), [packs]);
  const purseMap = useMemo(() => new Map(Object.entries(purses)), [purses]);

  const mine = seat.characterId ? (packs[seat.characterId] ?? EMPTY) : EMPTY;

  /* A seat whose purse the seed had no row for — a party that changed under an
     open panel. Never mutated, so one shared object is safe and keeps the
     drawer's prop from changing identity on every render. */
  const myPurse = seat.characterId
    ? (purses[seat.characterId] ?? NO_PURSE)
    : NO_PURSE;

  /* The database re-checks who is at this table, so this list is a
     convenience and not a permission. */
  const others = useMemo(
    () => members.filter((member) => member.id !== seat.characterId),
    [members, seat.characterId],
  );

  const carried = isDungeonMaster
    ? Object.values(packs).reduce((total, rows) => total + rows.length, 0)
    : mine.length;

  return (
    <TablePopover
      icon={TravellingPack}
      label={
        carried > 0
          ? `Inventory as ${seat.title}, ${carried} carried`
          : `Inventory as ${seat.title}`
      }
      title={isDungeonMaster ? "The party’s packs" : `${seat.title}’s pack`}
      count={carried}
      arrival={arrived}
    >
      {isDungeonMaster ? (
        <DmPackDrawer
          campaignId={campaignId}
          members={members}
          packs={packMap}
          purses={purseMap}
          actorName={seat.title}
        />
      ) : (
        <PlayerPackDrawer
          campaignId={campaignId}
          characterId={seat.characterId}
          pack={mine}
          purse={myPurse}
          party={others}
          /* The chair's own name, and only for the line shown while a write is
             in the air. `readSeat` calls the head of the table's chair "Dungeon
             Master", which is the same string the database derives. */
          actorName={seat.title}
        />
      )}
    </TablePopover>
  );
}

const EMPTY = [];
const NO_PURSE = emptyPurse();
