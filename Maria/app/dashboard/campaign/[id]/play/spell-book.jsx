"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { formatModifier } from "sina/rules/skills";
import { remainingSlots } from "sina/rules/spellcasting";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import SpellSigil from "@/app/components/ui/spell-sigil";
import { spellsByCharacter } from "@/app/dashboard/spell-presentation";

import DmSpellDrawer from "./dm-spell-drawer";
import PlayerSpellDrawer from "./player-spell-drawer";
import TablePopover from "./table-popover";
import { useTableWire, useWireMessage } from "./table-wire";

/**
 * The spellbook beside the scores. One control, two drawers — which of them is
 * the SEAT's, not the account's, the line the pack is drawn on too.
 *
 * Two subscriptions, for the two places a book is written: the spells are rows
 * on `character_spells`, the SLOTS a column on `characters`. The first has a
 * SELECT policy that admits a Dungeon Master; the second has only "Users read
 * their own characters", so a slot spent reaches its owner and nobody else and
 * the wire carries it the rest of the way.
 *
 * Both are DOORBELLS — no payload is read, because a row off the socket has not
 * been through Sina's `select()` list — so the answer is `router.refresh()`.
 */

/** PostgREST syntax. A bandwidth measure; the SELECT policy is the boundary. */
function rowFilter(column, ids) {
  if (ids.length === 0) {
    return undefined;
  }

  return ids.length === 1
    ? `${column}=eq.${ids[0]}`
    : `${column}=in.(${ids.join(",")})`;
}

export default function SpellBook({
  campaignId,
  seat,
  members,
  rows,
  casters,
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

  /** The party for a Dungeon Master, one character for a player. */
  const watching = isDungeonMaster
    ? members.map((member) => member.id)
    : [seat.characterId].filter(Boolean);

  const watched = new Set(watching);

  useLiveRefresh({
    channel: `spells:${campaignId}`,
    table: "character_spells",
    filter: rowFilter("character_id", watching),
    onChange: refresh,
  });

  /* Hears more than it asked for, knowingly: `postgres_changes` filters by row
     and never by column, so a hit point on the same row rings this too. */
  useLiveRefresh({
    channel: `slots:${campaignId}`,
    table: "characters",
    filter: rowFilter("id", watching),
    onChange: refresh,
  });

  /**
   * Somebody else wrote in a book this drawer is showing. Not memoised:
   * `useWireMessage` reads it out of a ref, so a fresh one each render
   * resubscribes nothing.
   */
  function heard(message) {
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
  }

  useWireMessage("spell", heard);

  /* Its own kind: a slot spent is a `characters` write and a spell learned is a
     `character_spells` one, and a Dungeon Master hears Postgres for only the
     second. */
  useWireMessage("slots", heard);

  /* Said only once the server has taken the write, the way a hit point is. */
  const told = useCallback(
    (characterId) => send({ kind: "spell", characterId }),
    [send],
  );

  const toldSlots = useCallback(
    (characterId) => send({ kind: "slots", characterId }),
    [send],
  );

  const books = spellsByCharacter(members, rows);

  const mine = seat.characterId ? (books.get(seat.characterId) ?? []) : [];
  const known = isDungeonMaster ? rows.length : mine.length;

  /* Only ever the seat's: the header prints one caster's numbers, and the head
     of the table is not one. */
  const seated = seat.characterId ? casters[seat.characterId] : null;

  return (
    <TablePopover
      icon={SpellSigil}
      label={
        known > 0
          ? `Spellbook as ${seat.title}, ${known} known`
          : `Spellbook as ${seat.title}`
      }
      title={isDungeonMaster ? "The party’s spells" : `${seat.title}’s spells`}
      count={known}
      meta={seated?.casting && <Casting caster={seated} />}
      arrival={arrived}
    >
      {isDungeonMaster ? (
        <DmSpellDrawer
          campaignId={campaignId}
          members={members}
          books={books}
          casters={casters}
          onWritten={told}
          onSlotsWritten={toldSlots}
        />
      ) : (
        <PlayerSpellDrawer
          campaignId={campaignId}
          characterId={seat.characterId}
          book={mine}
          caster={seated ?? EMPTY_CASTER}
          onWritten={told}
          onSlotsWritten={toldSlots}
        />
      )}
    </TablePopover>
  );
}

/** A seat whose sheet could not be read. The book opens, the bar draws nothing. */
const EMPTY_CASTER = { classId: null, level: null, slots: {}, casting: null };

/** The two numbers at the top of a caster's sheet, and what is left to spend. */
function Casting({ caster }) {
  const { casting, slots, classId, level } = caster;
  const left = remainingSlots(slots, classId, level);

  return (
    <p className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.14em] text-ink/45 uppercase">
      <span>
        DC <span className="text-gold tabular-nums">{casting.saveDC}</span>
      </span>

      <span>
        Atk{" "}
        <span className="text-gold tabular-nums">
          {formatModifier(casting.attackBonus)}
        </span>
      </span>

      {left > 0 && (
        <span>
          Slots <span className="text-gold tabular-nums">{left}</span>
        </span>
      )}
    </p>
  );
}
