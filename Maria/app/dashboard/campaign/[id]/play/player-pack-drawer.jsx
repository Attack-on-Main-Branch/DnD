"use client";

import { useState, useTransition } from "react";
import { parseQuantity } from "sina/rules/inventory";

import { controlClasses } from "@/app/components/ui/field-styles";
import { COIN_PANEL_CLASSES } from "@/app/dashboard/currency-presentation";
import ItemDetail from "@/app/dashboard/item-detail";
import ItemRow from "@/app/dashboard/item-row";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import { EmptyPack } from "@/app/dashboard/pack-item-card";

import ItemSearch from "./item-search";
import { Action, Confirm, PartyChoice } from "./pack-controls";
import { consumePackItem, dropPackItem, handPackItem } from "./pack-actions";
import PlayerPurse from "./player-purse";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  POPOVER_BODY_SHORT_CLASSES,
  usePopoverOpen,
} from "./table-popover";
import { useActivityLog } from "./use-activity";

/**
 * A player's own purse and their own pack, built the way the spellbook is: a
 * page of names, and the one pressed read out in a panel underneath.
 *
 * ONE ITEM IS OPEN AT A TIME and it may have come from either list, which is
 * what decides the panel's footer — a search hit is only something to read,
 * where a carried one can be used, dropped or handed over.
 *
 * The three deeds ask first: using something is as irreversible as dropping it.
 * How many is a field and not a stepper, the purse's own: an amount at a table
 * is nearly always a particular number somebody just named.
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
  const [reading, setReading] = useState(null);
  const [asking, setAsking] = useState(null);
  const [typed, setTyped] = useState("");
  const [receiver, setReceiver] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  /* Held as a slug and resolved against the pack, so a stack somebody else has
     spent down cannot be acted on at the amount it used to hold. */
  const row = pack.find((held) => held.item_slug === reading?.slug) ?? null;
  const open = row ? rowItem(row) : reading;

  /* Clamped on the way out rather than on the way in: the shared stack can
     shrink under a field already showing five. */
  const count = row ? Math.min(parseQuantity(typed) ?? 0, row.quantity) : 0;
  const usable = count >= 1;

  /* Closing the mark forgets what was open under it: the panel goes either way,
     and a item still standing there when the book is next pressed is one
     nobody asked for. Adjusted during render rather than in an effect — React's
     own answer for state that has to follow something else. */
  const panelOpen = usePopoverOpen();
  const [wasOpen, setWasOpen] = useState(panelOpen);

  if (wasOpen !== panelOpen) {
    setWasOpen(panelOpen);
    setReading(null);
  }

  function show(item) {
    setAsking(null);
    setTyped("");
    setError(null);
    setReading((standing) => (standing?.slug === item.slug ? null : item));
  }

  function ask(question) {
    setError(null);
    setAsking((standing) => (standing === question ? null : question));
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

      /* The deed is done, so the panel that offered it goes: what is left of
         the stack is on the row behind it. */
      setAsking(null);
      setTyped("");
      setReading(null);
      onWritten(characterId);

      if (whoElse) {
        onWritten(whoElse);
      }

      record(characterId, entry);
    });
  }

  return (
    <div
      /* Shorter while an item is open under it: the two panels hang off the
         marks together and the pair has to clear the bottom of the window. */
      className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${
        open ? POPOVER_BODY_SHORT_CLASSES : POPOVER_BODY_CLASSES
      }`}
    >
      {/* Above the pack, and drawn whether or not there is anything in it: an
          empty pack is not an empty purse. */}
      <div className={COIN_PANEL_CLASSES}>
        <PlayerPurse
          campaignId={campaignId}
          characterId={characterId}
          purse={purse}
          party={party}
          onWritten={onCoinsWritten}
        />
      </div>

      <div className="mt-4">
        <ItemSearch
          campaignId={campaignId}
          openSlug={open?.slug ?? null}
          onOpen={show}
        />
      </div>

      {pack.length === 0 ? (
        <div className="mt-4">
          <EmptyPack description="What you pick up, are given, or are handed at the table will be here." />
        </div>
      ) : (
        <>
          <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
            {pack.length} carried
          </p>

          <ul className="mt-2.5 grid grid-cols-3 gap-2">
            {pack.map((held) => (
              <li key={held.id} className="flex">
                <ItemRow
                  item={rowItem(held)}
                  quantity={held.quantity}
                  open={open?.slug === held.item_slug}
                  onOpen={() => show(rowItem(held))}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {open && (
        <PopoverAside>
          <ItemDetail item={open} quantity={row?.quantity}>
            {row ? (
              <>
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                  {/* Width on the wrapper, not the input: `controlClasses`
                      carries `w-full`, and two width utilities on one element
                      are settled by Tailwind's emit order. */}
                  <div className="w-20 shrink-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={typed}
                      placeholder="Qty"
                      onChange={(event) => setTyped(event.target.value)}
                      disabled={isPending}
                      aria-label={`How many ${open.name}`}
                      className={controlClasses({
                        className: "px-2 py-1 text-center tabular-nums",
                      })}
                    />
                  </div>

                  <p className="mr-auto text-xs text-ink/45">
                    of {row.quantity}
                  </p>

                  <Action
                    onClick={() => ask("use")}
                    disabled={isPending || !usable}
                    pressed={asking === "use"}
                    label={`Use ${count} ${open.name}`}
                  >
                    Use
                  </Action>

                  <Action
                    onClick={() => ask("drop")}
                    disabled={isPending || !usable}
                    pressed={asking === "drop"}
                    tone="danger"
                    label={`Drop ${count} ${open.name}`}
                  >
                    Drop
                  </Action>

                  <Action
                    onClick={() => ask("transfer")}
                    disabled={isPending || !usable || party.length === 0}
                    pressed={asking === "transfer"}
                    tone="gold"
                    label={`Hand ${count} ${open.name} to somebody`}
                  >
                    Give
                  </Action>
                </div>

                {asking === "use" && (
                  <Confirm question={`Use ${count} ${open.name}?`}>
                    <Action onClick={() => ask("use")} label="Keep it">
                      Keep
                    </Action>

                    <Action
                      onClick={() =>
                        run(
                          () =>
                            consumePackItem(
                              campaignId,
                              characterId,
                              open,
                              count,
                            ),
                          {
                            action: "item_used",
                            itemName: open.name,
                            quantity: count,
                          },
                        )
                      }
                      disabled={isPending}
                      tone="gold"
                      label={`Confirm using ${count} ${open.name}`}
                    >
                      Use it
                    </Action>
                  </Confirm>
                )}

                {asking === "drop" && (
                  <Confirm question={`Drop ${count} ${open.name}?`}>
                    <Action onClick={() => ask("drop")} label="Keep it">
                      Keep
                    </Action>

                    <Action
                      onClick={() =>
                        run(
                          () =>
                            dropPackItem(campaignId, characterId, open, count),
                          {
                            action: "item_dropped",
                            itemName: open.name,
                            quantity: count,
                          },
                        )
                      }
                      disabled={isPending}
                      tone="danger"
                      label={`Confirm dropping ${count} ${open.name}`}
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
                          handPackItem(
                            campaignId,
                            characterId,
                            receiver,
                            open,
                            count,
                          ),
                        {
                          action: "item_transferred",
                          itemName: open.name,
                          quantity: count,
                          targetCharacterId: receiver,
                        },
                        receiver,
                      )
                    }
                    disabled={isPending}
                    confirmLabel={`Hand ${count} ${open.name} over`}
                  >
                    Hand it over
                  </PartyChoice>
                )}
              </>
            ) : (
              <p className="text-xs text-ink/45">
                Not in your pack. The head of the table hands this out.
              </p>
            )}

            {error && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </ItemDetail>
        </PopoverAside>
      )}
    </div>
  );
}
