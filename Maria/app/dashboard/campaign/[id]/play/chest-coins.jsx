"use client";

import { useId, useState } from "react";
import { MAX_COINS, parseCoins } from "sina/rules/currency";

import { depositChestCoins, lootChestCoins } from "./chest-actions";
import CoinPiles from "./coin-piles";
import CoinQuantityRow from "./coin-quantity-row";
import { Action } from "./pack-controls";
import { useTableDeed } from "./use-table-deed";

export default function ChestCoins({
  campaignId,
  container,
  characterId,
  deposit = false,
}) {
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const controls = useId();
  const { run, resync, send } = useTableDeed(campaignId);
  const balance = container.purse?.[selected] ?? 0;
  const coin = deposit || balance > 0 ? selected : null;
  const amount = Math.min(
    parseCoins(typed) ?? 0,
    deposit ? MAX_COINS - balance : balance,
  );

  function select(next) {
    setSelected(next);
    setTyped("");
  }

  async function move() {
    if (pending || !coin || !amount || (!deposit && !characterId)) return;
    setPending(true);
    setTyped("");
    const want = { containers: true, purses: !deposit, activity: !deposit };
    try {
      const result = await run({
        work: () =>
          deposit
            ? depositChestCoins(campaignId, container.id, coin, amount)
            : lootChestCoins(
                campaignId,
                container.id,
                characterId,
                coin,
                amount,
              ),
        tell: () => {
          send({ kind: "chest" });
          if (!deposit) send({ kind: "purse", characterId });
        },
        want,
      });
      if (result) await resync(want);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-label={`Coins in ${container.name}`}
      aria-busy={pending}
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
        purse={container.purse}
        showEmpty={deposit}
        open={coin}
        controls={controls}
        onSelect={select}
        emptyLabel=""
      />
      {coin && (
        <CoinQuantityRow
          id={controls}
          coin={coin}
          balance={balance}
          typed={typed}
          setTyped={setTyped}
          stocking={deposit}
        >
          <Action onClick={move} disabled={pending || !amount} tone="gold">
            {deposit ? "Add" : "Take"}
          </Action>
        </CoinQuantityRow>
      )}
    </section>
  );
}
