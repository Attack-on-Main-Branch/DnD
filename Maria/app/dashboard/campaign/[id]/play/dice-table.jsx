"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import { diceCast, rollSentence } from "./dice-presentation";
import { useActivityLog } from "./use-activity";
import { useDiceRoll } from "./use-dice-roll";
import { useTableRolls } from "./use-table-rolls";

/**
 * The table's dice, shared by the three places that show them: the rail they
 * are pressed on, the board they land on, and the pill that comes out from
 * under the roller's card. Those sit in different columns of the table's grid,
 * so the state has to be above all of them and the layout has to stay in
 * page.jsx — hence a provider that renders no element of its own.
 *
 * Two halves meet here. use-dice-roll.js owns this page’s rollers and knows
 * nothing about who asked them to throw; use-table-rolls.js holds what the
 * whole table is doing, this browser's own roll included, and is the only thing
 * that touches the socket. They need each other in both directions — a roll
 * here has to reach the table, and a roll announced at the table has to be
 * thrown on this board too — so the second half is handed a callback that reads
 * the first out of a ref rather than closing over it.
 *
 * Outside a provider the hook answers with a resting table rather than
 * throwing: the party rail is on the page for a viewer with no seat too, and it
 * should not have to know whether anybody can roll before it asks.
 */

const RESTING = {
  stages: [],
  throwing: false,
  secret: false,
  setSecret: () => {},
  roll: () => {},
  warm: () => {},
  board: { lit: false, secret: false },
  veiled: false,
  flying: {},
  results: {},
  latest: null,
};

const DiceTableContext = createContext(RESTING);

export function useDiceTable() {
  return useContext(DiceTableContext);
}

/**
 * The colour the board is wearing: the roll in the air if there is one, and
 * otherwise whether the veil is drawn — this chair's own switch for whoever
 * holds it, and what they last told the table for everybody else.
 */
export function useBoardCast() {
  const { board, secret, veiled } = useDiceTable();

  return diceCast(board.lit ? board.secret : secret || veiled);
}

/** The head of the table has no character, so its rolls are filed under this. */
export const HEAD_OF_TABLE = "dm";

export default function DiceTable({
  campaignId,
  seatId,
  characterId,
  diceColor = null,
  seatTitle,
  canKeepSecrets,
  children,
}) {
  const mine = characterId ?? HEAD_OF_TABLE;

  /* The roller, reached from the socket's side of the loop. Filled by the
     effect below rather than during render, and read at the moment a roll
     actually arrives. */
  const board = useRef(null);
  const onMirror = useCallback(
    (die, count, seed, color, land) =>
      board.current?.(die, count, seed, color, land),
    [],
  );

  const table = useTableRolls({
    campaignId,
    enabled: Boolean(seatId),
    keeper: Boolean(canKeepSecrets),
    onMirror,
  });

  const { start, finish, announceVeil } = table;

  const record = useActivityLog(campaignId);

  const onStart = useCallback((thrown) => start(mine, thrown), [mine, start]);

  /* The log is written from the chair that THREW, and only from there. Every
     other board joins the same throw and reads the same number off its own
     dice — see use-table-rolls.js — so filing it on landing would file one roll
     six times.

     `characterId` and not `mine`: the log is asked which SEAT this was, and the
     head of the table has no character. A kept roll is written down as a kept
     roll and the number stays on this screen; there is no branch in
     `record_campaign_activity` that could store it. */
  const onFinish = useCallback(
    (entry) => {
      finish(mine, entry);

      /* A QUIET ROLL LEAVES NO LINE OF ITS OWN. The dice still fly on every
         board — that is `finish` above, and the seed went out with `start` — but
         a death save is written down by `roll_death_save`, in the sentence that
         says what the face came to. Two entries for one throw would read as two
         throws. */
      if (entry.quiet) {
        return;
      }

      /* The third argument is the line the panel shows until the database's own
         comes back — drawn on the roller's screen alone and never sent. A kept
         roll has no branch in `record_campaign_activity` that could store a
         number even if one were. */
      record(
        characterId,
        entry.secret
          ? {
              action: "secret_dice_roll",
              die: entry.die,
              count: entry.count,
            }
          : {
              action: "dice_roll",
              die: entry.die,
              count: entry.count,
              value: entry.value,
            },
        entry.secret
          ? {
              action: "secret_dice_roll",
              actor: seatTitle,
              die: entry.die,
              count: entry.count,
              secret: true,
              value: null,
            }
          : {
              action: "dice_roll",
              actor: seatTitle,
              die: entry.die,
              count: entry.count,
              secret: false,
              value: entry.value,
            },
      );
    },
    [characterId, finish, mine, record, seatTitle],
  );

  /* The chair's own colour, null at the head of the table — which is what
     `diceMaterial` reads as "throw the house's dice". */
  const local = useDiceRoll({ color: diceColor, onStart, onFinish });

  useEffect(() => {
    board.current = local.mirror;
  }, [local.mirror]);

  /* The roller, fetched for everyone with a seat rather than only for whoever
     reaches the rail. A spectator's board has to be ready when somebody else's
     roll arrives, and a megabyte fetched on arrival would have them join the
     throw a second or two after it started — the one thing the shared seed
     exists to prevent. */
  const { warm } = local;

  useEffect(() => {
    if (seatId) {
      warm();
    }
  }, [seatId, warm]);

  /* The veil is the table's business, not one screen's: the boards go violet
     for everybody the moment it closes, and only the results stay behind it. */
  useEffect(() => {
    if (canKeepSecrets) {
      announceVeil(local.secret);
    }
  }, [announceVeil, canKeepSecrets, local.secret]);

  return (
    <DiceTableContext.Provider
      value={{
        ...local,
        board: table.board,
        veiled: table.veiled,
        flying: table.flying,
        results: table.results,
        latest: table.latest,
      }}
    >
      {children}
    </DiceTableContext.Provider>
  );
}

/**
 * What a screen reader is told, for every roll at the table and not only this
 * browser's. Its own region rather than the pill's own text, which is
 * `aria-hidden` and slides away on a timer: a result should be read out once,
 * when it lands, and not again because the thing holding it has started to
 * leave. It rides in the rail so that the table's grid keeps its rows.
 */
export function RollAnnouncement() {
  const { latest } = useDiceTable();

  return (
    <p className="sr-only" aria-live="polite">
      {/* Keyed, so two identical rolls in a row are two mutations of this
          region rather than one. A live region announces what CHANGES inside
          it, and "d20 ➔ 18" written over "d20 ➔ 18" changes nothing. */}
      {latest && <span key={latest.id}>{rollSentence(latest)}</span>}
    </p>
  );
}
