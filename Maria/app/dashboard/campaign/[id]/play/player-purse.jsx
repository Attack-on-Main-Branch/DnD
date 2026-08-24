"use client";

import { useState, useTransition } from "react";
import { COIN_TYPES, parseCoins } from "sina/rules/currency";

import { controlClasses } from "@/app/components/ui/field-styles";
import {
  capsuleClasses,
  COIN_AMOUNT_CLASSES,
  COIN_NAME_CLASSES,
  COIN_ROW_CLASSES,
  coinName,
} from "@/app/dashboard/currency-presentation";

import { handCharacterCoins, spendCharacterCoins } from "./currency-actions";
import { Action, Confirm, PartyChoice } from "./pack-controls";
import { useActivityLog } from "./use-activity";

/**
 * A player's own purse: five capsules in a row, each carrying exactly what they
 * have.
 *
 * NOTHING HERE ADDS. A player's coins go down and sideways; the only control in
 * the app that puts a coin into a purse is the Dungeon Master's, and
 * `move_campaign_currency` refuses everybody else even if one were drawn.
 *
 * The capsule is the button. Pressing it opens the one panel underneath — how
 * much, then Use or Give — and pressing it again closes it. One panel and not
 * one per capsule: five open at once is five number fields asking the same
 * question, and only one of them can be answered at a time anyway.
 *
 * Use and Give are the pack's own, down to the question they ask and the words
 * on the answer — one gesture for spending an arrow and for spending a coin.
 * See pack-controls.jsx, which both of them are built out of.
 */
export default function PlayerPurse({
  campaignId,
  characterId,
  purse,
  party,
  onWritten,
}) {
  const [open, setOpen] = useState(null);

  /* The transition lives up here rather than in the panel, so the CAPSULES are
     shut while a spend is in flight too. Opening another denomination mid-write
     would unmount the panel holding the transition, and the coin that arrived
     first would be the one the log never mentioned. */
  const [isPending, startTransition] = useTransition();

  return (
    <section aria-label="Your purse">
      <ul className={COIN_ROW_CLASSES}>
        {COIN_TYPES.map((coin) => (
          <li key={coin}>
            <button
              type="button"
              onClick={() => setOpen((was) => (was === coin ? null : coin))}
              disabled={purse[coin] < 1 || isPending}
              aria-expanded={open === coin}
              aria-label={`${purse[coin]} ${coinName(coin)}, spend or hand over`}
              className={capsuleClasses(coin, {
                open: open === coin,
                pressable: true,
                disabled: purse[coin] < 1 || isPending,
              })}
            >
              <span aria-hidden="true" className={COIN_NAME_CLASSES}>
                {coinName(coin)}:
              </span>
              <span aria-hidden="true" className={COIN_AMOUNT_CLASSES}>
                {purse[coin]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* `key` on the coin, so opening a different capsule starts the panel
          over rather than carrying the last one's amount and recipient into it. */}
      {open && (
        <CoinActions
          key={open}
          campaignId={campaignId}
          characterId={characterId}
          coin={open}
          amount={purse[open]}
          party={party}
          onWritten={onWritten}
          onDone={() => setOpen(null)}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}
    </section>
  );
}

/**
 * How much, then which of the two things can be done with it.
 *
 * The field starts EMPTY behind a placeholder rather than at one. A coin is not
 * an arrow: the amount that matters is nearly always some particular number the
 * table just named, so a "1" sitting there is a digit to clear before typing
 * rather than a useful default. Nothing can be pressed until something is in it.
 *
 * The amount is clamped on the way OUT rather than on the way in, as the pack's
 * is: somebody else spending from this purse — the Dungeon Master taking a fine
 * — shrinks the balance under a field already showing five hundred.
 */
function CoinActions({
  campaignId,
  characterId,
  coin,
  amount,
  party,
  onWritten,
  onDone,
  isPending,
  startTransition,
}) {
  const [typed, setTyped] = useState("");
  const [asking, setAsking] = useState(null);
  const [receiver, setReceiver] = useState("");
  const [error, setError] = useState(null);

  const record = useActivityLog(campaignId);

  const name = coinName(coin);
  const count = Math.min(parseCoins(typed) ?? 0, amount);
  const usable = count >= 1;

  function ask(question) {
    setError(null);
    setAsking((open) => (open === question ? null : question));
  }

  /* `entry` is what the table is told happened, written down only once the
     server has taken the deed it describes — and with the amount the server
     says moved, not the one that was typed. */
  function run(work, entry, whoElse) {
    setError(null);

    startTransition(async () => {
      const result = await work();

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      onWritten(characterId);

      if (whoElse) {
        onWritten(whoElse);
      }

      /* AWAITED, so the capsules and this panel stay shut until the entry
         exists. A second spend landing before the first is written is how one
         of them comes to be missing from a log that keeps only ten. */
      await record(characterId, { ...entry, amount: result.taken });
      onDone();
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="font-display text-xs tracking-wide text-ink/70">{name}</p>

        {/* Width on the wrapper, not the input: `controlClasses` already
            carries `w-full`, and two width utilities on one element are settled
            by the order Tailwind emits them rather than the order written. */}
        <div className="w-20 shrink-0">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={typed}
            placeholder="Qty"
            onChange={(event) => setTyped(event.target.value)}
            disabled={isPending}
            aria-label={`How much ${name}`}
            className={controlClasses({
              className: "px-2 py-1 text-center tabular-nums",
            })}
          />
        </div>

        <p className="text-xs text-ink/45">of {amount}</p>

        <div className="ml-auto flex items-center gap-1">
          <Action
            onClick={() => ask("use")}
            disabled={isPending || !usable}
            pressed={asking === "use"}
            label={usable ? `Use ${count} ${name}` : `Use ${name}`}
          >
            Use
          </Action>

          <Action
            onClick={() => ask("transfer")}
            disabled={isPending || !usable || party.length === 0}
            pressed={asking === "transfer"}
            label={
              usable
                ? `Hand ${count} ${name} to somebody`
                : `Hand ${name} to somebody`
            }
          >
            Give
          </Action>
        </div>
      </div>

      {asking === "use" && (
        <Confirm question={`Use ${count} ${name}?`}>
          <Action onClick={() => ask("use")} label="Keep it">
            Keep
          </Action>

          <Action
            onClick={() =>
              run(
                () => spendCharacterCoins(campaignId, characterId, coin, count),
                { action: "coin_spent", coin },
              )
            }
            disabled={isPending}
            tone="gold"
            label={`Confirm using ${count} ${name}`}
          >
            Use it
          </Action>
        </Confirm>
      )}

      {asking === "transfer" && (
        <PartyChoice
          party={party}
          receiver={receiver}
          onChoose={setReceiver}
          onCancel={() => ask("transfer")}
          onConfirm={() =>
            run(
              () =>
                handCharacterCoins(
                  campaignId,
                  characterId,
                  receiver,
                  coin,
                  count,
                ),
              { action: "coin_transferred", coin, targetCharacterId: receiver },
              receiver,
            )
          }
          disabled={isPending}
          confirmLabel={`Hand ${count} ${name} over`}
        >
          Hand it over
        </PartyChoice>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
