"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import TravellingPack from "@/app/components/ui/travelling-pack";
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
 */
export default function InventoryPack({
  campaignId,
  seat,
  members,
  rows,
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

  useWireMessage("pack", (message) => {
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
  });

  /* Said only once the server has taken the write, the way a hit point is. */
  const told = useCallback(
    (characterId) => send({ kind: "pack", characterId }),
    [send],
  );

  const packs = useMemo(() => packsByCharacter(members, rows), [members, rows]);

  const mine = seat.characterId ? (packs.get(seat.characterId) ?? []) : [];

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
          onWritten={told}
        />
      ) : (
        <PlayerPackDrawer
          campaignId={campaignId}
          characterId={seat.characterId}
          pack={mine}
          party={others}
          onWritten={told}
        />
      )}
    </TablePopover>
  );
}
