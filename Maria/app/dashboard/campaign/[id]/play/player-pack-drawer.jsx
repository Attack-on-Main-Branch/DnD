"use client";

import { useState, useTransition } from "react";

import Avatar from "@/app/components/ui/avatar";
import QuantityStepper from "@/app/components/ui/quantity-stepper";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";

import { consumePackItem, dropPackItem, handPackItem } from "./pack-actions";
import { POPOVER_BODY_CLASSES } from "./table-popover";

/**
 * A player's own pack, and the three things that can happen to what is in it.
 *
 * Every card carries an amount of its own: "use two potions and hand three
 * arrows over" is one sentence at a table, and a shared field would make it two.
 *
 * All three ask first — using something is as irreversible as dropping it — and
 * in each question the deed sits on the right and the way out on the left.
 *
 * The confirmations are inline and not a `<dialog>`: a modal opens in the top
 * layer, so the pointerdown that dismisses it lands outside this panel, and
 * TablePopover closes on exactly that.
 */
export default function PlayerPackDrawer({
  campaignId,
  characterId,
  pack,
  party,
  onWritten,
}) {
  if (pack.length === 0) {
    return (
      <div
        className={`flex items-center justify-center px-5 pb-5 ${POPOVER_BODY_CLASSES}`}
      >
        <EmptyPack description="What you pick up, are given, or are handed at the table will be here." />
      </div>
    );
  }

  /* The scroll is on the wrapper, not the grid: `auto-rows-fr` on a box with
     a definite height divides that height between the rows instead of
     equalising them, and two items came out 300px tall each. */
  return (
    <div
      className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
    >
      <ul className="grid auto-rows-fr gap-2.5 sm:grid-cols-2">
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
    </div>
  );
}

function PackRow({ campaignId, characterId, row, index, party, onWritten }) {
  const [amount, setAmount] = useState(1);
  const [asking, setAsking] = useState(null);
  const [receiver, setReceiver] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const item = rowItem(row);

  /* Clamped on the way out rather than on the way in: somebody else spending
     the shared stack shrinks the row under a field already showing five. */
  const count = Math.min(amount, row.quantity);

  function ask(question) {
    setError(null);
    setAsking((open) => (open === question ? null : question));
  }

  function run(work, whoElse) {
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
            <Action onClick={() => setAsking(null)} label="Keep it">
              Keep
            </Action>

            <Action
              onClick={() =>
                run(() => consumePackItem(campaignId, characterId, item, count))
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
            <Action onClick={() => setAsking(null)} label="Keep it">
              Keep
            </Action>

            <Action
              onClick={() =>
                run(() => dropPackItem(campaignId, characterId, item, count))
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
          <div className="mt-2.5 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
            {/* Buttons rather than a <select>: at most five names, each
                carrying the face the rail already shows. */}
            <ul className="flex flex-col gap-1">
              {party.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setReceiver(member.id)}
                    aria-pressed={receiver === member.id}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-300 ${
                      receiver === member.id
                        ? "bg-gold/15 text-gold"
                        : "text-ink/70 hover:bg-gold/10 hover:text-gold"
                    }`}
                  >
                    <Avatar
                      initials={characterInitials(member.name)}
                      colorClass={avatarColorClass(member.color_theme)}
                      size="xs"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {member.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex items-center justify-between gap-2">
              <Action onClick={() => setAsking(null)} label="Keep it">
                Cancel
              </Action>

              <Action
                onClick={() =>
                  run(
                    () =>
                      handPackItem(
                        campaignId,
                        characterId,
                        receiver,
                        item,
                        count,
                      ),
                    receiver,
                  )
                }
                disabled={isPending || !receiver}
                tone="gold"
                label={`Hand ${count} ${item.name} over`}
              >
                Hand it over
              </Action>
            </div>
          </div>
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

/** The question on the left, the way out, then the deed at the far right. */
function Confirm({ question, children }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
      <p className="text-xs text-ink/70">{question}</p>

      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Not `buttonClasses`: those are pills with their own padding, and three across
 * a card 300px wide would wrap onto three lines.
 */
function Action({ onClick, disabled, label, pressed, tone, children }) {
  // `danger` is the dashboard's Retire and Delete: ink at rest, red under the
  // pointer, so the warning arrives when the click is about to happen.
  const colour =
    {
      danger: "text-ink/60 hover:text-red-500",
      gold: "text-gold hover:text-ink",
    }[tone] ?? "text-ink/65 hover:text-gold";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className={`shrink-0 cursor-pointer rounded-md px-2 py-1 font-display text-xs tracking-wide transition-colors duration-300 disabled:cursor-not-allowed disabled:text-ink/25 ${
        pressed ? "bg-gold/15 text-gold" : colour
      }`}
    >
      {children}
    </button>
  );
}
