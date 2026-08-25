"use client";

import { useCallback, useMemo, useState } from "react";
import { canOpenContainer } from "sina/rules/containers";
import { parseQuantity } from "sina/rules/inventory";

import { controlClasses } from "@/app/components/ui/field-styles";
import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import {
  containerTagClasses,
  containerTypeLabel,
  CONTAINER_CARD_CLASSES,
} from "@/app/dashboard/container-presentation";
import { COIN_PANEL_CLASSES } from "@/app/dashboard/currency-presentation";
import ItemDetail from "@/app/dashboard/item-detail";
import ItemRow from "@/app/dashboard/item-row";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import { EmptyPack } from "@/app/dashboard/pack-item-card";

import { passContainerTo } from "./chest-actions";
import ItemSearch from "./item-search";
import { Action, Confirm, PartyChoice, StowChoice } from "./pack-controls";
import {
  consumePackItem,
  dropPackItem,
  handPackItem,
  stowPackItem,
} from "./pack-actions";
import PlayerChestDrawer from "./player-chest-drawer";
import PlayerPurse from "./player-purse";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  POPOVER_BODY_SHORT_CLASSES,
  usePopoverOpen,
} from "./table-popover";
import { useChestItems, useContainers, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * A player's own purse, their own pack, the bags they carry and the chests
 * opened to them.
 *
 * THE PURSE IS PINNED AT THE TOP AND BELONGS TO THE CHARACTER, never to a bag:
 * a purse that moved with one would make "how much gold do you have" a question
 * with more than one answer.
 *
 * BELOW IT, ONE SECTION PER PLACE A STACK CAN BE. A stack is keyed on
 * `(character, slug, container)` since 20260831090000, so rope in the Bag of
 * Holding and rope in the pack are two stacks and must never be shown as one.
 * Every deed below carries the container the row was read from; without it the
 * wrong rope is spent.
 *
 * ONE ITEM IS OPEN AT A TIME, from any section or from the search, which is
 * what decides the panel's footer: a search hit is only something to read.
 *
 * FIVE DEEDS. Use, Drop and Give ask first — they are irreversible. Move is the
 * one that writes nothing in the log: a rope going into a bag is tidying, not
 * something that happened at the table. Handing over a BAG asks the same way
 * and lives on the section, because what moves is the bag.
 *
 * ALL OF THEM PAINT BEFORE THEY WRITE, and a refusal says so in a toast, since
 * by then the panel it would have gone into has closed.
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

  /* Two states and not one: a bag can be open while another is passed. */
  const [openBag, setOpenBag] = useState(null);
  const [passing, setPassing] = useState(null);
  const [heir, setHeir] = useState("");

  /* Undefined and not null while nothing is chosen: null IS a destination
     here — the pack itself. */
  const [stowTo, setStowTo] = useState(undefined);

  const store = useTableStore();
  const containers = useContainers();
  const chests = useChestItems();
  const { run, send } = useTableDeed(campaignId);

  /** Every bag this character is carrying, oldest first, as the shelf came. */
  const bags = useMemo(
    () =>
      containers.filter(
        (one) => one.type === "bag" && one.ownerCharacterId === characterId,
      ),
    [containers, characterId],
  );

  /* A convenience and never a permission: the policy has already narrowed
     the shelf, and `take_chest_item` asks again. */
  const myChests = useMemo(
    () =>
      containers.filter(
        (one) => one.type === "chest" && canOpenContainer(one, characterId),
      ),
    [containers, characterId],
  );

  const chestTold = useCallback(() => send({ kind: "chest" }), [send]);

  /* The pack itself, then one list per bag, in one pass over the rows. */
  const carried = useMemo(() => {
    const loose = [];
    const inBags = new Map();

    for (const row of pack) {
      if (row.container_id) {
        const held = inBags.get(row.container_id);

        if (held) {
          held.push(row);
        } else {
          inBags.set(row.container_id, [row]);
        }
      } else {
        loose.push(row);
      }
    }

    return { loose, inBags };
  }, [pack]);

  /* Held as a slug AND the bag it was read from, so the rope in the pack is
     never spent for the rope in the bag. */
  const row =
    pack.find(
      (held) =>
        held.item_slug === reading?.item.slug &&
        (held.container_id ?? null) === (reading?.containerId ?? null),
    ) ?? null;

  const open = row ? rowItem(row) : (reading?.item ?? null);

  /* Clamped on the way out rather than on the way in: the shared stack can
     shrink under a field already showing five. */
  const count = row ? Math.min(parseQuantity(typed) ?? 0, row.quantity) : 0;
  const usable = count >= 1;

  /* Closing the mark forgets what was open under it. Adjusted during render
     rather than in an effect — React's own answer for derived state. */
  const panelOpen = usePopoverOpen();
  const [wasOpen, setWasOpen] = useState(panelOpen);

  if (wasOpen !== panelOpen) {
    setWasOpen(panelOpen);
    setReading(null);
    setPassing(null);
  }

  function show(item, containerId = null) {
    setAsking(null);
    setTyped("");
    setReading((standing) =>
      standing?.item.slug === item.slug &&
      (standing.containerId ?? null) === containerId
        ? null
        : { item, containerId },
    );
  }

  function ask(question) {
    setAsking((standing) => (standing === question ? null : question));
  }

  /** One deed off this panel, which shuts on the press. */
  function deed(item, quantity, action, work, whoElse) {
    const containerId = reading?.containerId ?? null;
    const target = whoElse
      ? (party.find((member) => member.id === whoElse)?.name ?? null)
      : null;

    setAsking(null);
    setTyped("");
    setReading(null);

    run({
      /* Shown until the real list lands; the trigger builds the kept one. */
      note: [{ action, actor: actorName, item: item.name, quantity, target }],

      paint: () => {
        store.movePack(characterId, item, -quantity, containerId);

        if (whoElse) {
          // Into the hand and never into a bag, as the function does it.
          store.movePack(whoElse, item, quantity, null);
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

  /** One stack into another pocket of the same coat. No line in the log. */
  function stow(item, quantity, to) {
    const from = reading?.containerId ?? null;

    setAsking(null);
    setTyped("");
    setReading(null);
    setStowTo(undefined);

    run({
      paint: () => {
        store.movePack(characterId, item, -quantity, from);
        store.movePack(characterId, item, quantity, to);
      },

      work: () => stowPackItem(characterId, item, quantity, from, to),
      tell: () => send({ kind: "pack", characterId }),
      want: { inventory: true, characterIds: [characterId] },
    });
  }

  /** The whole bag, and everything in it, into somebody else's hands. */
  function passBag(container, to) {
    const receiving = party.find((member) => member.id === to) ?? null;

    setPassing(null);
    setHeir("");
    setOpenBag(null);
    setReading(null);

    if (!receiving) {
      return;
    }

    run({
      note: [
        {
          action: "bag_transferred",
          actor: actorName,
          container: container.name,
          target: receiving.name,
        },
      ],

      paint: () => store.passContainer(container.id, characterId, to),

      work: () => passContainerTo(campaignId, container.id, to, characterId),

      tell: () => {
        send({ kind: "pack", characterId });
        send({ kind: "pack", characterId: to });
        // The shelf moved too, and that is a different subscriber.
        send({ kind: "chest" });
      },

      want: {
        containers: true,
        inventory: true,
        activity: true,
        characterIds: [characterId, to],
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
      {/* Drawn whether or not anything is carried: an empty pack is not an
          empty purse, and neither belongs to a bag. */}
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
          openSlug={open && !reading?.containerId ? open.slug : null}
          onOpen={show}
        />
      </div>

      {carried.loose.length === 0 && bags.length === 0 ? (
        <div className="mt-4">
          <EmptyPack description="What you pick up, are given, or are handed at the table will be here." />
        </div>
      ) : (
        <>
          <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
            {carried.loose.length} carried
          </p>

          {carried.loose.length === 0 ? (
            <p className="mt-2.5 text-xs text-ink/50 italic">
              Nothing in hand — it is all in the bags below.
            </p>
          ) : (
            <ul className="mt-2.5 grid grid-cols-3 gap-2">
              {carried.loose.map((held) => (
                <li key={held.id} className="flex">
                  <ItemRow
                    item={rowItem(held)}
                    quantity={held.quantity}
                    open={row?.id === held.id}
                    onOpen={() => show(rowItem(held), null)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {bags.map((bag) => {
        const inside = carried.inBags.get(bag.id) ?? [];
        const unfolded = openBag === bag.id;

        return (
          <section
            key={bag.id}
            aria-label={bag.name}
            /* The open one is lit, as a chosen tile is in the character
               creator: the list below belongs to this section and no other. */
            className={`mt-3 transition duration-300 ${CONTAINER_CARD_CLASSES} ${
              unfolded ? NESTED_CARD_SELECTED_CLASSES : ""
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setOpenBag((standing) => (standing === bag.id ? null : bag.id))
              }
              aria-expanded={unfolded}
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-ink">
                {bag.name}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-ink/45 tabular-nums">
                  {inside.length}
                </span>

                <span className={containerTagClasses(bag.type)}>
                  {containerTypeLabel(bag.type)}
                </span>
              </span>
            </button>

            {unfolded && (
              <div className="mt-3 border-t border-gold/15 pt-3">
                {inside.length === 0 ? (
                  <p className="text-xs text-ink/50 italic">
                    Nothing in it yet.
                  </p>
                ) : (
                  <ul className="grid grid-cols-3 gap-2">
                    {inside.map((held) => (
                      <li key={held.id} className="flex">
                        <ItemRow
                          item={rowItem(held)}
                          quantity={held.quantity}
                          open={row?.id === held.id}
                          onOpen={() => show(rowItem(held), bag.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-2.5 flex justify-end">
                  <Action
                    onClick={() =>
                      setPassing((standing) =>
                        standing === bag.id ? null : bag.id,
                      )
                    }
                    disabled={party.length === 0}
                    pressed={passing === bag.id}
                    tone="gold"
                    label={`Hand ${bag.name} and everything in it to somebody`}
                  >
                    Trade bag
                  </Action>
                </div>

                {passing === bag.id && (
                  <PartyChoice
                    party={party}
                    receiver={heir}
                    onChoose={setHeir}
                    onCancel={() => setPassing(null)}
                    onConfirm={() => passBag(bag, heir)}
                    confirmLabel={`Hand ${bag.name} over with everything in it`}
                  >
                    Hand the bag over
                  </PartyChoice>
                )}
              </div>
            )}
          </section>
        );
      })}

      <PlayerChestDrawer
        campaignId={campaignId}
        characterId={characterId}
        actorName={actorName}
        chests={myChests}
        contents={chests}
        onTold={chestTold}
      />

      {open && (
        <PopoverAside>
          <ItemDetail item={open} quantity={row?.quantity}>
            {row ? (
              <>
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                  {/* Width on the wrapper: `controlClasses` carries `w-full`. */}
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
                    onClick={() => ask("stow")}
                    disabled={!usable || bags.length === 0}
                    pressed={asking === "stow"}
                    label={`Move ${count} ${open.name} to another bag`}
                  >
                    Move
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
                          consumePackItem(
                            campaignId,
                            characterId,
                            open,
                            count,
                            row.container_id ?? null,
                          ),
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
                          dropPackItem(
                            campaignId,
                            characterId,
                            open,
                            count,
                            row.container_id ?? null,
                          ),
                        )
                      }
                      tone="danger"
                      label={`Confirm dropping ${count} ${open.name}`}
                    >
                      Drop it
                    </Action>
                  </Confirm>
                )}

                {asking === "stow" && (
                  <StowChoice
                    /* Everywhere but where it already is. The pack is a null
                       container, hence the list rather than `bags` alone. */
                    places={[
                      { id: null, name: "The pack itself" },
                      ...bags.map((bag) => ({ id: bag.id, name: bag.name })),
                    ].filter(
                      (place) => place.id !== (row.container_id ?? null),
                    )}
                    chosen={stowTo}
                    onChoose={setStowTo}
                    onCancel={() => ask("stow")}
                    onConfirm={() => stow(open, count, stowTo)}
                    confirmLabel={`Move ${count} ${open.name}`}
                  >
                    Move it
                  </StowChoice>
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
                            row.container_id ?? null,
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
