"use client";

import { useState, useTransition } from "react";
import { COIN_TYPES, MAX_COINS, parseCoins } from "sina/rules/currency";

import { StepButton } from "@/app/components/ui/quantity-stepper";
import {
  capsuleClasses,
  COIN_AMOUNT_CLASSES,
  COIN_NAME_CLASSES,
  COIN_ROW_CLASSES,
  coinName,
} from "@/app/dashboard/currency-presentation";

import { moveTableCoins } from "./currency-actions";
import { useActivityLog } from "./use-activity";

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
 * The log is written from what the DATABASE moved and not from what was typed:
 * `move_campaign_currency` clamps at zero on the way down, so "take 9999" from
 * a purse holding three is written down as three.
 */
export default function DmPurse({
  campaignId,
  character,
  members,
  purse,
  onWritten,
}) {
  const [typed, setTyped] = useState({});
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  const whom = character ? character.name : "all members";

  const total = COIN_TYPES.reduce(
    (sum, coin) => sum + (parseCoins(typed[coin]) ?? 0),
    0,
  );

  function move(take) {
    startTransition(async () => {
      const result = await moveTableCoins(
        campaignId,
        character?.id ?? null,
        typed,
        take,
      );

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      setError(null);
      setTyped({});

      for (const member of character ? [character] : members) {
        onWritten(member.id);
      }

      /* One entry per denomination that actually moved, and `null` is the
         recipient `record_campaign_activity` turns into "the party" — the name
         is never a string this drawer chose.

         Five at once would fill half a log that keeps ten, which is the reason
         to move what the table found rather than one of everything.

         AWAITED, so this transition — and with it both buttons and all five
         fields — stays shut until the entries exist. A second press landing
         before the first is written is how one grant comes to be logged twice
         or not at all. */
      await Promise.all(
        COIN_TYPES.filter((coin) => result.coins[coin] > 0).map((coin) =>
          record(null, {
            action: take ? "coin_revoked" : "coin_granted",
            coin,
            amount: result.coins[coin],
            targetCharacterId: character?.id ?? null,
          }),
        ),
      );
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
            <label className={capsuleClasses(coin, { disabled: isPending })}>
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
                disabled={isPending}
                aria-label={`How much ${coinName(coin)} to move ${
                  character ? `for ${character.name}` : "for the whole party"
                }`}
                // No `disabled:opacity-*` of its own: the capsule around it
                // already dims, and a second fade compounds with the first.
                className={`${COIN_AMOUNT_CLASSES} bare-input w-14 text-right text-inherit placeholder:text-inherit disabled:cursor-not-allowed placeholder:opacity-45`}
              />
            </label>
          </li>
        ))}
      </ul>

      {/* The health band's Damage and Heal, in a capsule: same component, same
          two tones, so the pair that takes something away and the pair that
          gives it back cannot drift apart. `pill` is the only difference, and
          it is there because these stand in a row of capsules. */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <StepButton
          wide
          pill
          tone="danger"
          onClick={() => move(true)}
          disabled={isPending || total === 0 || members.length === 0}
          label={`Take coin from ${whom}`}
        >
          Take from {whom}
        </StepButton>

        <StepButton
          wide
          pill
          onClick={() => move(false)}
          disabled={isPending || total === 0 || members.length === 0}
          label={`Grant coin to ${whom}`}
        >
          Grant to {whom}
        </StepButton>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
