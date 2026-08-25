"use client";

import { useState } from "react";
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
import { useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

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
 *
 * ALL THREE PAINT BEFORE THEY WRITE: the stack comes down, the line goes up in
 * the log, the panel shuts, and one Server Action follows — one, because the
 * entry is written by a trigger on the row this moved. A refusal says so in a
 * toast, since by then the panel it would have gone into has closed.
 */
export default function PlayerPackDrawer({
  campaignId,
  characterId,
  actorName,
  pack,
  purse,
  party,
}) {
  const [reading, setReading] = useState(null);
  const [asking, setAsking] = useState(null);
  const [typed, setTyped] = useState("");
  const [receiver, setReceiver] = useState("");

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

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
    setReading((standing) => (standing?.slug === item.slug ? null : item));
  }

  function ask(question) {
    setAsking((standing) => (standing === question ? null : question));
  }

  /**
   * One deed off this panel, which shuts on the press: what is left of the stack
   * is on the row behind it. `whoElse` is the other end of a hand-over.
   */
  function deed(item, quantity, action, work, whoElse) {
    const target = whoElse
      ? (party.find((member) => member.id === whoElse)?.name ?? null)
      : null;

    setAsking(null);
    setTyped("");
    setReading(null);

    run({
      /* Shown to whoever pressed until the real list lands. The entry that is
         KEPT is built by the trigger, and its names come from rows. */
      note: [{ action, actor: actorName, item: item.name, quantity, target }],

      paint: () => {
        store.movePack(characterId, item, -quantity);

        if (whoElse) {
          store.movePack(whoElse, item, quantity);
        }
      },

      work,

      tell: () => {
        // Only once the server has taken it, the way a hit point is told.
        send({ kind: "pack", characterId });

        if (whoElse) {
          send({ kind: "pack", characterId: whoElse });
        }
      },

      want: {
        inventory: true,
        activity: true,
        characterIds: [characterId, whoElse].filter(Boolean),
      },
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
          actorName={actorName}
          purse={purse}
          party={party}
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
                    disabled={!usable}
                    pressed={asking === "use"}
                    label={`Use ${count} ${open.name}`}
                  >
                    Use
                  </Action>

                  <Action
                    onClick={() => ask("drop")}
                    disabled={!usable}
                    pressed={asking === "drop"}
                    tone="danger"
                    label={`Drop ${count} ${open.name}`}
                  >
                    Drop
                  </Action>

                  <Action
                    onClick={() => ask("transfer")}
                    disabled={!usable || party.length === 0}
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
                        deed(open, count, "item_used", () =>
                          consumePackItem(campaignId, characterId, open, count),
                        )
                      }
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
                        deed(open, count, "item_dropped", () =>
                          dropPackItem(campaignId, characterId, open, count),
                        )
                      }
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
                      deed(
                        open,
                        count,
                        "item_transferred",
                        () =>
                          handPackItem(
                            campaignId,
                            characterId,
                            receiver,
                            open,
                            count,
                          ),
                        receiver,
                      )
                    }
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
          </ItemDetail>
        </PopoverAside>
      )}
    </div>
  );
}
