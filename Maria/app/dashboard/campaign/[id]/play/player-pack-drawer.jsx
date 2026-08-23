"use client";

import { useState, useTransition } from "react";

import QuantityStepper from "@/app/components/ui/quantity-stepper";
import { COIN_PANEL_CLASSES } from "@/app/dashboard/currency-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";

import { Action, Confirm, PartyChoice } from "./pack-controls";
import { consumePackItem, dropPackItem, handPackItem } from "./pack-actions";
import PlayerPurse from "./player-purse";
import { POPOVER_BODY_CLASSES } from "./table-popover";
import { useActivityLog } from "./use-activity";

/**
 * A player's own purse and their own pack, and everything that can happen to
 * what is in either.
 *
 * Every card carries an amount of its own: "use two potions and hand three
 * arrows over" is one sentence at a table, and a shared field would make it two.
 * The purse works the other way round — one panel, opened by whichever capsule
 * was pressed — because five number fields asking the same question is five
 * ways to answer it and only one of them can be in flight. See player-purse.jsx.
 *
 * The pack's three deeds ask first: using something is as irreversible as
 * dropping it, and these controls sit in the open on the card. In each question
 * the deed sits on the right and the way out on the left.
 *
 * The confirmations are inline and not a `<dialog>`: a modal opens in the top
 * layer, so the pointerdown that dismisses it lands outside this panel, and
 * TablePopover closes on exactly that. See pack-controls.jsx.
 */
export default function PlayerPackDrawer({
  campaignId,
  characterId,
  pack,
  purse,
  party,
  onWritten,
  onCoinsWritten,
}) {
  /* The scroll is on the wrapper, not the grid: `auto-rows-fr` on a box with
     a definite height divides that height between the rows instead of
     equalising them, and two items came out 300px tall each. */
  return (
    <div
      className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
    >
      {/* Above the cards, and drawn whether or not there are any: an empty
          pack is not an empty purse. */}
      <div className={COIN_PANEL_CLASSES}>
        <PlayerPurse
          campaignId={campaignId}
          characterId={characterId}
          purse={purse}
          party={party}
          onWritten={onCoinsWritten}
        />
      </div>

      {pack.length === 0 ? (
        <div className="mt-4">
          <EmptyPack description="What you pick up, are given, or are handed at the table will be here." />
        </div>
      ) : (
        <ul className="mt-4 grid auto-rows-fr gap-2.5 sm:grid-cols-2">
          {pack.map((row, index) => (
            <li key={row.id} className="flex">
              <PackRow
                campaignId={campaignId}
                characterId={characterId}
                row={row}
                index={index}
                party={party}
                onWritten={onWritten}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PackRow({ campaignId, characterId, row, index, party, onWritten }) {
  const [amount, setAmount] = useState(1);
  const [asking, setAsking] = useState(null);
  const [receiver, setReceiver] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  const item = rowItem(row);

  /* Clamped on the way out rather than on the way in: somebody else spending
     the shared stack shrinks the row under a field already showing five. */
  const count = Math.min(amount, row.quantity);

  function ask(question) {
    setError(null);
    setAsking((open) => (open === question ? null : question));
  }

  /* `entry` is what the table is told happened, written down only once the
     server has taken the deed it describes. */
  function run(work, entry, whoElse) {
    setError(null);

    startTransition(async () => {
      const result = await work();

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      setAsking(null);
      setAmount(1);
      onWritten(characterId);

      if (whoElse) {
        onWritten(whoElse);
      }

      record(characterId, entry);
    });
  }

  return (
    <div className={`flex w-full ${isPending ? "opacity-60" : ""}`}>
      <PackItemCard item={item} index={index} quantity={row.quantity}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            value={count}
            min={1}
            max={row.quantity}
            onChange={setAmount}
            disabled={isPending || row.quantity < 1}
            label={`How many ${item.name}`}
            decreaseLabel={`One fewer ${item.name}`}
            increaseLabel={`One more ${item.name}`}
          />

          <div className="flex items-center gap-1">
            <Action
              onClick={() => ask("use")}
              disabled={isPending}
              pressed={asking === "use"}
              label={`Use ${count} ${item.name}`}
            >
              Use
            </Action>

            <Action
              onClick={() => ask("drop")}
              disabled={isPending}
              pressed={asking === "drop"}
              label={`Drop ${count} ${item.name}`}
            >
              Drop
            </Action>

            <Action
              onClick={() => ask("transfer")}
              disabled={isPending || party.length === 0}
              pressed={asking === "transfer"}
              label={`Hand ${count} ${item.name} to somebody`}
            >
              Give
            </Action>
          </div>
        </div>

        {asking === "use" && (
          <Confirm question={`Use ${count} ${item.name}?`}>
            <Action onClick={() => ask("use")} label="Keep it">
              Keep
            </Action>

            <Action
              onClick={() =>
                run(
                  () => consumePackItem(campaignId, characterId, item, count),
                  {
                    action: "item_used",
                    itemName: item.name,
                    quantity: count,
                  },
                )
              }
              disabled={isPending}
              tone="gold"
              label={`Confirm using ${count} ${item.name}`}
            >
              Use it
            </Action>
          </Confirm>
        )}

        {asking === "drop" && (
          <Confirm question={`Drop ${count} ${item.name}?`}>
            <Action onClick={() => ask("drop")} label="Keep it">
              Keep
            </Action>

            <Action
              onClick={() =>
                run(() => dropPackItem(campaignId, characterId, item, count), {
                  action: "item_dropped",
                  itemName: item.name,
                  quantity: count,
                })
              }
              disabled={isPending}
              tone="danger"
              label={`Confirm dropping ${count} ${item.name}`}
            >
              Drop it
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
                  handPackItem(campaignId, characterId, receiver, item, count),
                {
                  action: "item_transferred",
                  itemName: item.name,
                  quantity: count,
                  targetCharacterId: receiver,
                },
                receiver,
              )
            }
            disabled={isPending}
            confirmLabel={`Hand ${count} ${item.name} over`}
          >
            Hand it over
          </PartyChoice>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs text-red-300">
            {error}
          </p>
        )}
      </PackItemCard>
    </div>
  );
}
