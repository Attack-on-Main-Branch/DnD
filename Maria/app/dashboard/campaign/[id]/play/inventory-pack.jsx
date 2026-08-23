"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { emptyPurse, readPurse } from "sina/rules/currency";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import TravellingPack from "@/app/components/ui/travelling-pack";
import { pursesByCharacter } from "@/app/dashboard/currency-presentation";
import { packsByCharacter } from "@/app/dashboard/inventory-presentation";

import DmPackDrawer from "./dm-pack-drawer";
import PlayerPackDrawer from "./player-pack-drawer";
import TablePopover from "./table-popover";
import { useTableWire, useWireMessage } from "./table-wire";

/**
 * The pack beside the scroll, and what is in it. One control, two drawers —
 * which of them is the SEAT's, not the account's, the same line the health band
 * is drawn on.
 *
 * It keeps itself current two ways: Postgres changes are the honest half, the
 * table's wire the fast one, as the health band already pairs them.
 *
 * Both are DOORBELLS. Neither payload is read — a row off the socket has not
 * been through the `select()` list in Sina's data layer — so the answer is
 * `router.refresh()` and never a render of what arrived.
 *
 * The purse rides with the pack, on both halves and for the same reasons — but
 * the two subscriptions are NOT equivalent, and the difference is worth
 * knowing. `character_inventory` has a SELECT policy that admits a Dungeon
 * Master, so Postgres tells them about the whole party's packs; `characters`
 * has only "Users read their own characters", so a purse change reaches its
 * owner and nobody else. The wire is what carries it the rest of the way, which
 * is exactly the arrangement the party rail already makes for hit points.
 */
export default function InventoryPack({
  campaignId,
  seat,
  members,
  rows,
  purses,
  isDungeonMaster,
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { send } = useTableWire();

  /* A counter, not a flag: TablePopover uses it as a `key`, and changing a key
     is what restarts a CSS animation. */
  const [arrived, setArrived] = useState(0);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

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

  useLiveRefresh({
    channel: `pack:${campaignId}`,
    table: "character_inventory",
    filter,
    onChange: refresh,
  });

  /* This one hears more than it asked for, and knowingly: `postgres_changes`
     filters by row and never by column, so a hit point or a level written to
     the same row rings this doorbell too. The answer is a `router.refresh()`
     that finds the purse unchanged — the same cost the health wire already
     pays, and cheaper than the alternative, which is a table of its own for
     five integers. */
  useLiveRefresh({
    channel: `purse:${campaignId}`,
    table: "characters",
    filter: purseFilter,
    onChange: refresh,
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

      refresh();
    },
    [refresh, seat.characterId, watched],
  );

  useWireMessage("pack", heard);
  useWireMessage("purse", heard);

  /* Said only once the server has taken the write, the way a hit point is. */
  const told = useCallback(
    (characterId) => send({ kind: "pack", characterId }),
    [send],
  );

  /**
   * The purse's own, and it carries more than the pack's does: Postgres tells
   * a Dungeon Master nothing about a player's `characters` row, so for that
   * direction this message is not a head start but the whole of it.
   */
  const toldCoins = useCallback(
    (characterId) => send({ kind: "purse", characterId }),
    [send],
  );

  const packs = useMemo(() => packsByCharacter(members, rows), [members, rows]);

  /* A member with no row is one whose purse this viewer may not read — which is
     one player looking at another, and never the seat's own. */
  const wallets = useMemo(() => pursesByCharacter(purses), [purses]);

  const mine = seat.characterId ? (packs.get(seat.characterId) ?? []) : [];

  const myPurse = seat.characterId
    ? readPurse(wallets.get(seat.characterId))
    : emptyPurse();

  /* The database re-checks who is at this table, so this list is a
     convenience and not a permission. */
  const others = useMemo(
    () => members.filter((member) => member.id !== seat.characterId),
    [members, seat.characterId],
  );

  const carried = isDungeonMaster ? rows.length : mine.length;

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
          packs={packs}
          purses={wallets}
          onWritten={told}
          onCoinsWritten={toldCoins}
        />
      ) : (
        <PlayerPackDrawer
          campaignId={campaignId}
          characterId={seat.characterId}
          pack={mine}
          purse={myPurse}
          party={others}
          onWritten={told}
          onCoinsWritten={toldCoins}
        />
      )}
    </TablePopover>
  );
}
