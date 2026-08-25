"use client";

import { useState } from "react";
import { COIN_TYPES, MAX_COINS, parsePurse } from "sina/rules/currency";

import {
  capsuleClasses,
  COIN_AMOUNT_CLASSES,
  COIN_NAME_CLASSES,
  COIN_ROW_CLASSES,
  coinName,
} from "@/app/dashboard/currency-presentation";

import { moveTableCoins } from "./currency-actions";
import { Action } from "./pack-controls";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The Dungeon Master's purse control: five amounts, then Grant or Take.
 *
 * ONE control for both halves of the drawer. With "all party" chosen it pays or
 * robs the whole table in one transaction; with a name chosen it does the same
 * to that one purse. Nothing else about it changes, which is the point — a
 * Dungeon Master learns one gesture, not two.
 *
 * WHAT IS IN THE CAPSULE IS A DIFFERENCE, not a balance. The placeholder is
 * what the purse holds now, so an untouched row reads "Gold: 120" and says what
 * they have; type into it and it is what will move. Both buttons empty the row
 * back to the placeholder afterwards, so the next press starts from nothing
 * rather than repeating the last one by accident.
 *
 * THE PRESS PAINTS THE TYPED AMOUNT, and where the database disagrees the purses
 * are re-read. A take is clamped at zero per purse — robbing six members of 50
 * gold takes three from whoever had three — and the paint clamped there too, so
 * no arithmetic on the way back can recover the overshoot.
 *
 * The log is written from what the DATABASE moved and not from what was typed:
 * "take 9999" from a purse holding three is written down as three.
 */
export default function DmPurse({
  campaignId,
  character,
  members,
  actorName,
  purse,
}) {
  const [typed, setTyped] = useState({});

  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  const whom = character ? character.name : "all members";

  const { coins, total } = parsePurse(typed);

  const targets = character ? [character] : members;

  function move(take) {
    const sign = take ? -1 : 1;

    setTyped({});

    run({
      /* One line per denomination that was asked for. Five at once would fill
         half a log that keeps ten, which is why only the ones with something in
         them are drawn — and the real entries, written server-side from what
         actually moved, replace all of these together. */
      note: COIN_TYPES.filter((one) => coins[one] > 0).map((coin) => ({
        action: take ? "coin_revoked" : "coin_granted",
        actor: actorName,
        coin,
        amount: coins[coin],
        target: character ? character.name : "the party",
      })),

      paint: () => {
        for (const member of targets) {
          store.movePurseBy(member.id, coins, sign);
        }
      },

      work: () =>
        moveTableCoins(campaignId, character?.id ?? null, typed, take),

      tell: (result) => {
        const moved = result.moved ?? [];

        for (const row of moved) {
          send({ kind: "purse", characterId: row.character_id });
        }

        // Where the two disagree, ask: one read settles all five columns across
        // every purse that moved.
        const agreed = moved.every((row) =>
          COIN_TYPES.every((coin) => (row[coin] ?? 0) === coins[coin]),
        );

        if (!agreed || moved.length !== targets.length) {
          resync({ purses: true });
        }
      },

      want: { purses: true, activity: true },
    });
  }

  return (
    <div>
      <ul className={COIN_ROW_CLASSES}>
        {COIN_TYPES.map((coin) => (
          <li key={coin}>
            {/* A label rather than a capsule with a field beside it: the whole
                capsule is then the field's hit area, which at this size is the
                difference between a control and a decoration. */}
            <label className={capsuleClasses(coin)}>
              <span className={COIN_NAME_CLASSES}>{coinName(coin)}:</span>

              {/*
                A TEXT field carrying a number, not `type="number"`, and that is
                the whole reason a black box used to sit inside the capsule.
                A number input keeps native chrome — the field's own background
                and inset border out of the `color-scheme: dark` palette, plus
                the spinners `.no-spin` exists to hide — and how much of it
                survives `background: transparent` differs by browser, so it was
                invisible here and a black slab on the machine that reported it.
                A text field has none of that to suppress; `inputMode` still
                brings up a numeric keypad, and `parseCoins` was always the
                thing that decided what the string meant.

                `text-inherit` on both the value and the placeholder, so the
                number wears the capsule's own metal rather than the browser's
                default ink and grey.
              */}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={String(MAX_COINS).length}
                value={typed[coin] ?? ""}
                placeholder={String(purse ? purse[coin] : 0)}
                onChange={(event) =>
                  setTyped((row) => ({ ...row, [coin]: event.target.value }))
                }
                aria-label={`How much ${coinName(coin)} to move ${
                  character ? `for ${character.name}` : "for the whole party"
                }`}
                className={`${COIN_AMOUNT_CLASSES} bare-input w-14 text-right text-inherit placeholder:text-inherit disabled:cursor-not-allowed placeholder:opacity-45`}
              />
            </label>
          </li>
        ))}
      </ul>

      {/* Text rather than slabs, the words the spellbook's Teach and Take it
          back are: this panel is already five bordered capsules, and two more
          bordered boxes under them read as a second row of fields. */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-1">
        <Action
          tone="danger"
          onClick={() => move(true)}
          disabled={total === 0 || members.length === 0}
          label={`Take coin from ${whom}`}
        >
          Take from {whom}
        </Action>

        <Action
          tone="gold"
          onClick={() => move(false)}
          disabled={total === 0 || members.length === 0}
          label={`Grant coin to ${whom}`}
        >
          Grant to {whom}
        </Action>
      </div>
    </div>
  );
}
