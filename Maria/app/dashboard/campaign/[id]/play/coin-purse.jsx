"use client";

import { useId, useState } from "react";
import { MAX_COINS, parseCoins } from "sina/rules/currency";

import PartyPills from "@/app/dashboard/party-pills";

import CoinPiles from "./coin-piles";
import CoinQuantityRow from "./coin-quantity-row";
import {
  handCharacterCoins,
  moveTableCoins,
  spendCharacterCoins,
} from "./currency-actions";
import { Action } from "./pack-controls";
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

const actions = {
  pay: "coin_spent",
  send: "coin_transferred",
  grant: "coin_granted",
  take: "coin_revoked",
};

export default function CoinPurse({
  campaignId,
  characterId,
  characterName,
  actorName,
  purse,
  party = [],
  dm = false,
  targets = [],
  purses,
}) {
  const [open, setOpen] = useState(null);
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const [receiver, setReceiver] = useState(null);
  const controls = useId();
  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);

  const bulk = dm && !characterId;
  const coin = open && (dm || purse?.[open] > 0) ? open : null;
  const balance = purse?.[coin] ?? 0;
  const requested = parseCoins(typed) ?? 0;
  const count = Math.min(requested, balance);
  const recipient = party.find((member) => member.id === receiver);
  const canGrant =
    dm &&
    coin &&
    requested > 0 &&
    targets.some((member) => (purses.get(member.id)?.[coin] ?? 0) < MAX_COINS);

  function reset() {
    setTyped("");
    setSending(false);
    setReceiver(null);
  }

  function select(next) {
    setOpen(next);
    reset();
  }

  function move(mode) {
    const admin = mode === "grant" || mode === "take";
    const amount = admin ? requested : count;
    if (!coin || !amount || (mode === "send" && !recipient)) return;
    const sign = mode === "grant" ? 1 : -1;
    const deltas = admin
      ? new Map(
          targets.map(({ id }) => {
            const have = purses.get(id)?.[coin] ?? 0;
            return [id, Math.min(amount, sign > 0 ? MAX_COINS - have : have)];
          }),
        )
      : null;
    const noteAmount = admin ? Math.max(0, ...deltas.values()) : amount;
    const target = admin
      ? (characterName ?? "the party")
      : recipient && mode === "send"
        ? recipient.name
        : null;
    const to = mode === "send" ? recipient.id : null;

    reset();
    if (!dm && count === balance) setOpen(null);
    run({
      note: noteAmount
        ? [
            {
              action: actions[mode],
              actor: admin ? actorName : (characterName ?? actorName),
              coin,
              amount: noteAmount,
              target,
            },
          ]
        : [],
      paint: () => {
        if (admin) {
          for (const [id, delta] of deltas)
            store.movePurse(id, coin, sign * delta);
        } else {
          store.movePurse(characterId, coin, -amount);
          if (to) store.movePurse(to, coin, amount);
        }
      },
      work: () =>
        admin
          ? moveTableCoins(
              campaignId,
              characterId,
              { [coin]: amount },
              sign < 0,
            )
          : to
            ? handCharacterCoins(campaignId, characterId, to, coin, amount)
            : spendCharacterCoins(campaignId, characterId, coin, amount),
      tell: (result) => {
        if (admin) {
          const moved = result.moved ?? [];
          for (const row of moved)
            send({ kind: "purse", characterId: row.character_id });
          if (
            moved.length !== deltas.size ||
            moved.some(
              (row) => (row[coin] ?? 0) !== deltas.get(row.character_id),
            )
          ) {
            resync({ purses: true });
          }
        } else {
          send({ kind: "purse", characterId });
          if (to) send({ kind: "purse", characterId: to });
          if (result.taken !== amount) resync({ purses: true });
        }
      },
      want: { purses: true, activity: true },
    });
  }

  return (
    <section
      aria-label={
        bulk
          ? "Party purse"
          : characterName
            ? `${characterName}’s purse`
            : "Your purse"
      }
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !coin) return;
        event.stopPropagation();
        event.currentTarget
          .querySelector('button[aria-expanded="true"]')
          ?.focus();
        select(null);
      }}
    >
      <CoinPiles
        purse={purse}
        showEmpty={dm}
        open={coin}
        controls={controls}
        onSelect={select}
      />
      {coin && (
        <CoinQuantityRow
          id={controls}
          coin={coin}
          balance={balance}
          typed={typed}
          setTyped={setTyped}
          bulk={bulk}
          footer={
            sending && (
              <div className="mt-1.5 border-t border-gold/15 pt-2">
                <PartyPills
                  members={party}
                  chosen={receiver}
                  onChoose={(id) =>
                    setReceiver((previous) => (previous === id ? null : id))
                  }
                  label="Coin recipient"
                  checkmarks
                />
                <div className="mt-1 flex justify-end">
                  <Action
                    onClick={() => move("send")}
                    disabled={!count || !recipient}
                    tone="gold"
                  >
                    Confirm
                  </Action>
                </div>
              </div>
            )
          }
        >
          {bulk ? (
            <Action
              onClick={() => move("take")}
              disabled={!requested || !balance}
              tone="danger"
            >
              Take
            </Action>
          ) : (
            <>
              <Action onClick={() => move("pay")} disabled={!count}>
                Pay
              </Action>
              <Action
                onClick={() => setSending(!sending)}
                disabled={!count || !party.length}
                pressed={sending}
              >
                Send
              </Action>
            </>
          )}
          {dm && (
            <Action
              onClick={() => move("grant")}
              disabled={!canGrant}
              tone="gold"
            >
              Grant
            </Action>
          )}
        </CoinQuantityRow>
      )}
    </section>
  );
}
