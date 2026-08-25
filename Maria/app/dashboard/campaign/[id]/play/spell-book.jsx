"use client";

import { useCallback, useMemo, useState } from "react";
import { formatModifier } from "sina/rules/skills";
import { remainingSlots } from "sina/rules/spellcasting";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import SpellSigil from "@/app/components/ui/spell-sigil";

import DmSpellDrawer from "./dm-spell-drawer";
import PlayerSpellDrawer from "./player-spell-drawer";
import TablePopover from "./table-popover";
import { useAllBooks, useAllLevels, useAllSlots } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

/**
 * The spellbook beside the scores. One control, two drawers — which of them is
 * the SEAT's, not the account's, the line the pack is drawn on too.
 *
 * The shelves and the slot bar are held in table-state.jsx, so a pip goes out on
 * the press rather than a round trip later.
 *
 * Two subscriptions, for the two places a book is written: the spells are rows
 * on `character_spells`, the SLOTS a column on `characters`. The first has a
 * SELECT policy that admits a Dungeon Master; the second has only "Users read
 * their own characters", so a slot spent reaches its owner and nobody else and
 * the wire carries it the rest of the way. Both are DOORBELLS, answered by a
 * scoped re-read rather than a render of the route.
 *
 * `casters` arrives as a prop for the parts a press cannot move — the class and
 * the two numbers at the top of the sheet. The level and the slots come from the
 * store.
 */
export default function SpellBook({
  campaignId,
  seat,
  members,
  casters,
  isDungeonMaster,
}) {
  const books = useAllBooks();
  const slots = useAllSlots();
  const levels = useAllLevels();
  const { resync } = useTableDeed(campaignId);

  /* A counter, not a flag: TablePopover uses it as a `key`, and changing a key
     is what restarts a CSS animation. */
  const [arrived, setArrived] = useState(0);

  /** The party for a Dungeon Master, one character for a player. */
  const watching = useMemo(
    () =>
      isDungeonMaster
        ? members.map((member) => member.id)
        : [seat.characterId].filter(Boolean),
    [isDungeonMaster, members, seat.characterId],
  );

  const watched = useMemo(() => new Set(watching), [watching]);

  const reread = useCallback(
    () =>
      resync({
        spells: true,
        // The slots live on `characters`, which only `campaign_sheets` and a
        // character's own row will hand back — see readTableSlice.
        sheets: isDungeonMaster,
        seatCharacterId: isDungeonMaster ? null : seat.characterId,
        characterIds: watching,
      }),
    [isDungeonMaster, resync, seat.characterId, watching],
  );

  useLiveRefresh({
    channel: `spells:${campaignId}`,
    table: "character_spells",
    filter: rowFilter("character_id", watching),
    onChange: reread,
  });

  /* Hears more than it asked for, knowingly: `postgres_changes` filters by row
     and never by column, so a hit point on the same row rings this too. */
  useLiveRefresh({
    channel: `slots:${campaignId}`,
    table: "characters",
    filter: rowFilter("id", watching),
    onChange: reread,
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

    reread();
  }

  useWireMessage("spell", heard);

  /* Its own kind: a slot spent is a `characters` write and a spell learned is a
     `character_spells` one, and a Dungeon Master hears Postgres for only the
     second. */
  useWireMessage("slots", heard);

  /* The shape both drawers already read. Six entries at most. */
  const bookMap = useMemo(() => new Map(Object.entries(books)), [books]);

  /**
   * The store's level and slots laid over what page.jsx rendered. The level
   * matters as much as the slots: how many a class has at all is derived from it.
   *
   * `casting` is left as the server computed it — its two numbers come off the
   * ability scores, so an award leaves them a point behind until the next real
   * refresh. Recomputing them here would mean shipping every caster's ability
   * scores to every chair that can open a book.
   */
  const casting = useMemo(() => {
    const merged = {};

    for (const [characterId, caster] of Object.entries(casters ?? {})) {
      merged[characterId] = {
        ...caster,
        level: levels[characterId] ?? caster.level,
        slots: slots[characterId] ?? {},
      };
    }

    return merged;
  }, [casters, levels, slots]);

  const mine = seat.characterId ? (books[seat.characterId] ?? EMPTY) : EMPTY;
  const known = isDungeonMaster
    ? Object.values(books).reduce((total, rows) => total + rows.length, 0)
    : mine.length;

  /* Only ever the seat's: the header prints one caster's numbers, and the head
     of the table is not one. */
  const seated = seat.characterId ? casting[seat.characterId] : null;

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
          books={bookMap}
          casters={casting}
        />
      ) : (
        <PlayerSpellDrawer
          campaignId={campaignId}
          characterId={seat.characterId}
          /* The chair's own name, and only for the line shown while a cast is
             being written down. The name the log KEEPS comes off a row. */
          actorName={seat.title}
          book={mine}
          caster={seated ?? EMPTY_CASTER}
        />
      )}
    </TablePopover>
  );
}

/** PostgREST syntax. A bandwidth measure; the SELECT policy is the boundary. */
function rowFilter(column, ids) {
  if (ids.length === 0) {
    return undefined;
  }

  return ids.length === 1
    ? `${column}=eq.${ids[0]}`
    : `${column}=in.(${ids.join(",")})`;
}

const EMPTY = [];

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
