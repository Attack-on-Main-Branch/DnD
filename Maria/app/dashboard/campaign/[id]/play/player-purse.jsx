"use client";

import { useState } from "react";
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
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

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
 *
 * The coins come out of the capsule on the press and the panel shuts behind
 * them. The Server Action that follows writes the purse AND the line describing
 * it in one round trip — see currency-actions.js on why a purse is the one thing
 * here the database cannot write its own log entry for.
 */
export default function PlayerPurse({
  campaignId,
  characterId,
  actorName,
  purse,
  party,
}) {
  const [open, setOpen] = useState(null);

  return (
    <section aria-label="Your purse">
      <ul className={COIN_ROW_CLASSES}>
        {COIN_TYPES.map((coin) => (
          <li key={coin}>
            <button
              type="button"
              onClick={() => setOpen((was) => (was === coin ? null : coin))}
              disabled={purse[coin] < 1}
              aria-expanded={open === coin}
              aria-label={`${purse[coin]} ${coinName(coin)}, spend or hand over`}
              className={capsuleClasses(coin, {
                open: open === coin,
                pressable: true,
                disabled: purse[coin] < 1,
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
          actorName={actorName}
          coin={open}
          amount={purse[open]}
          party={party}
          onDone={() => setOpen(null)}
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
  actorName,
  coin,
  amount,
  party,
  onDone,
}) {
  const [typed, setTyped] = useState("");
  const [asking, setAsking] = useState(null);
  const [receiver, setReceiver] = useState("");

  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  const name = coinName(coin);
  const count = Math.min(parseCoins(typed) ?? 0, amount);
  const usable = count >= 1;

  function ask(question) {
    setAsking((open) => (open === question ? null : question));
  }

  /**
   * One deed off this panel, painted before it is written. `whoElse` is the
   * other end of a hand-over, which is the only one that touches two purses.
   */
  function deed(action, work, whoElse) {
    const target = whoElse
      ? (party.find((member) => member.id === whoElse)?.name ?? null)
      : null;

    onDone();

    run({
      /* Shown to whoever pressed, until the real list lands. The entry that is
         kept is composed by `record_campaign_activity` out of typed arguments,
         and its names come from `characters`. */
      note: [{ action, actor: actorName, coin, amount: count, target }],

      paint: () => {
        store.movePurse(characterId, coin, -count);

        if (whoElse) {
          store.movePurse(whoElse, coin, count);
        }
      },

      work,

      tell: (result) => {
        send({ kind: "purse", characterId });

        if (whoElse) {
          send({ kind: "purse", characterId: whoElse });
        }

        /* `count` was already clamped to what this browser believed the purse
           held, so less leaving than that does not mean the subtraction was
           wrong — it means the BASE was: somebody spent from this purse between
           the page being drawn and the press. Adding the difference back would
           restore the wrong figure, so the balance is re-read instead. */
        if (result.taken !== count) {
          resync({ purses: true });
        }
      },

      want: { purses: true, activity: true },
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
            disabled={!usable}
            pressed={asking === "use"}
            label={usable ? `Use ${count} ${name}` : `Use ${name}`}
          >
            Use
          </Action>

          <Action
            onClick={() => ask("transfer")}
            disabled={!usable || party.length === 0}
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
              deed("coin_spent", () =>
                spendCharacterCoins(campaignId, characterId, coin, count),
              )
            }
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
            deed(
              "coin_transferred",
              () =>
                handCharacterCoins(
                  campaignId,
                  characterId,
                  receiver,
                  coin,
                  count,
                ),
              receiver,
            )
          }
          confirmLabel={`Hand ${count} ${name} over`}
        >
          Hand it over
        </PartyChoice>
      )}
    </div>
  );
}
