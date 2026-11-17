"use client";

import { useState } from "react";

import { ButtonContent } from "@/app/components/ui/button";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import {
  chestAudienceLine,
  CONTAINER_CARD_CLASSES,
  CONTAINER_KINDS,
  NOBODY_YET,
} from "@/app/dashboard/container-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import ItemDetail from "@/app/dashboard/item-detail";

import {
  hideChestFrom,
  passContainerTo,
  revealChestTo,
  stockChestItem,
} from "./chest-actions";
import ChestCoins from "./chest-coins";
import ItemSearch from "./item-search";
import { adjustPackItem } from "./pack-actions";
import PartyAudience from "./party-audience";
import { useAllPacks, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The Dungeon Master's side of the shelf: everything at the table, and the two
 * switches that decide who else can see any of it.
 *
 * BAGS AND CHESTS APART, each kind under a heading that folds away: they are
 * worked on differently, one handed to somebody and the other shown.
 *
 * AN ACCORDION AND NOT A GRID. A container's controls are a contents list, a
 * search field and a menu — more than a card's worth — and only one is ever
 * being worked on. It also keeps exactly one ItemSearch mounted.
 *
 * WHERE THE CONTENTS LIVE depends on whether anybody is carrying it: a bag in
 * somebody's hands keeps its stacks in their pack rows, everything else in the
 * container. Same columns, so only the write differs.
 *
 * Every press paints before it writes, and the paints are COMPLETE, so
 * `useTableDeed` never has to reconcile a success.
 */
export default function DmChestDrawer({
  campaignId,
  containers,
  chests,
  members,
  onTold,
  panelOpen,
}) {
  const packs = useAllPacks();
  const store = useTableStore();
  const { run, resync } = useTableDeed(campaignId);

  const [open, setOpen] = useState(null);
  const [reading, setReading] = useState(null);

  /* Which kinds are unfolded. Both may be at once: a session can be filling a
     chest while it hands a bag over. */
  const [shelves, setShelves] = useState([]);

  const [draft, setDraft] = useState(null);
  const [wasOpen, setWasOpen] = useState(panelOpen);

  if (wasOpen !== panelOpen) {
    setWasOpen(panelOpen);
    if (!panelOpen) setDraft(null);
  }

  const memberIds = new Set(members.map(({ id }) => id));

  /** A bag somebody is holding keeps its stacks in their pack. */
  function carrierOf(container) {
    return container.type === "bag" ? container.ownerCharacterId : null;
  }

  function contentsOf(container) {
    const carrier = carrierOf(container);

    return carrier
      ? (packs[carrier] ?? []).filter(
          (row) => row.container_id === container.id,
        )
      : (chests[container.id] ?? []);
  }

  /** One stack up or down, wherever the rows live. */
  function step(container, item, delta) {
    const carrier = carrierOf(container);

    run({
      paint: () =>
        carrier
          ? store.movePack(carrier, item, delta, container.id)
          : store.moveChest(container.id, item, delta),

      work: () =>
        carrier
          ? adjustPackItem(campaignId, carrier, item, delta, container.id)
          : stockChestItem(campaignId, container.id, item, delta),

      tell: onTold,

      /* Only the carried branch writes a line: a chest being filled is
         preparation, and a line would tell the party what is in it. */
      want: {
        containers: true,
        inventory: Boolean(carrier),
        activity: Boolean(carrier),
        characterIds: carrier ? [carrier] : [],
      },
    });
  }

  /** Shown to the faces currently lit, and to nobody else. */
  function applyAccess(container, chosen) {
    setDraft(null);
    if (chosen.length === 0) return hide(container);

    const alone =
      chosen.length === 1
        ? (members.find((member) => member.id === chosen[0])?.name ?? null)
        : null;

    run({
      /* Shown until the real list lands; `reveal_chest` builds the kept one. */
      note: [
        {
          action: "chest_revealed",
          actor: "Dungeon Master",
          container: container.name,
          shown: chosen.length,
          target: alone,
        },
      ],

      paint: () => store.showContainer(container.id, chosen),
      work: () => revealChestTo(campaignId, container.id, chosen),
      tell: onTold,
      want: { containers: true, activity: true },
    });
  }

  /** And back into the dark. The audience is kept, as `hide_chest` keeps it. */
  function hide(container) {
    run({
      paint: () => store.showContainer(container.id, null),
      work: () => hideChestFrom(campaignId, container.id),
      tell: onTold,
      want: { containers: true },
    });
  }

  /** A bag put into somebody's hands. */
  function hand(container, to) {
    const from = container.ownerCharacterId;
    const receiver = members.find((member) => member.id === to);

    if (from === to || (to && !receiver)) {
      return;
    }

    setDraft(null);
    run({
      note: receiver
        ? [
            {
              action: "bag_transferred",
              actor: "Dungeon Master",
              container: container.name,
              target: receiver.name,
            },
          ]
        : [],

      paint: () => store.passContainer(container.id, from, to),
      work: () => passContainerTo(campaignId, container.id, to, null),
      tell: () => {
        onTold();
        if (!to)
          resync({ containers: true, inventory: true, characterIds: [from] });
      },

      want: {
        containers: true,
        inventory: true,
        activity: true,
        characterIds: [from, to].filter(Boolean),
      },
    });
  }

  if (containers.length === 0) {
    return (
      <p className="mt-4 text-center text-sm text-ink/50 italic">
        Nothing on this table yet. Bags and chests are made on the campaign
        page, under Create.
      </p>
    );
  }

  function card(container) {
    const expanded = open === container.id;
    const contents = contentsOf(container);
    const coinPiles = Object.values(container.purse ?? {}).filter(Boolean).length;
    const held = contents.find((row) => row.id === reading);
    const carrier = members.find(
      (member) => member.id === container.ownerCharacterId,
    );
    const savedAudience = container.isRevealed
      ? container.visibleTo.filter((id) => memberIds.has(id))
      : [];
    const saved =
      container.type === "bag"
        ? [container.ownerCharacterId].filter(Boolean)
        : savedAudience;
    const chosen = (expanded ? (draft ?? saved) : saved).filter((id) =>
      memberIds.has(id),
    );
    const owner = chosen[0] ?? null;
    const audienceChanged =
      expanded &&
      draft !== null &&
      (chosen.length !== savedAudience.length ||
        chosen.some((id) => !savedAudience.includes(id)));

    return (
      <li
        key={container.id}
        /* The open one is lit, as a chosen tile is in the character
               creator: the panel below belongs to this card and no other. */
        className={`${CONTAINER_CARD_CLASSES} transition duration-300 ${
          expanded ? NESTED_CARD_SELECTED_CLASSES : ""
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setOpen(expanded ? null : container.id);
          }}
          aria-expanded={expanded}
          className="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-semibold tracking-wide text-ink">
              {container.name}
            </span>

            <span className="mt-1 block truncate text-xs text-ink/55">
              {container.type === "chest"
                ? chestAudienceLine(container, members)
                : (carrier?.name ?? NOBODY_YET)}
            </span>
          </span>

          {/* Stacks in it, not a quantity OF it: hence a plain count
                  rather than the pack's `×N`, which beside a name reads as two
                  of the bag. No kind tag: the dropdown it is in says that. */}
          <span className="shrink-0 font-mono text-[0.625rem] text-ink/45 tabular-nums">
            {contents.length + coinPiles}
          </span>
        </button>

        {expanded && (
          <div className="mt-3 flex flex-col gap-3 border-t border-gold/15 pt-3">
            {container.type === "chest" && (
              <ChestCoins campaignId={campaignId} container={container} deposit />
            )}
            {contents.length === 0 && coinPiles === 0 && (
              <p className="text-xs text-ink/50 italic">
                Nothing in it. Find something below to put in.
              </p>
            )}
            {contents.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {contents.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-2 rounded-lg border border-gold/15 bg-surface/50 px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setReading((id) => (id === row.id ? null : row.id))
                      }
                      aria-expanded={reading === row.id}
                      aria-label={`Inspect ${row.name}`}
                      className="min-w-0 flex-1 truncate py-1 text-left font-display text-xs tracking-wide text-ink/85 hover:text-gold"
                    >
                      <ButtonContent>{row.name}</ButtonContent>
                    </button>

                    <StepButton
                      onClick={() => step(container, rowItem(row), -1)}
                      tone="danger"
                      label={`One fewer ${row.name} in ${container.name}`}
                    >
                      −
                    </StepButton>

                    <span className="w-8 text-center font-mono text-xs text-ink/70 tabular-nums">
                      {row.quantity}
                    </span>

                    <StepButton
                      onClick={() => step(container, rowItem(row), 1)}
                      label={`One more ${row.name} in ${container.name}`}
                    >
                      +
                    </StepButton>
                  </li>
                ))}
              </ul>
            )}

            {held && (
              <ItemDetail item={rowItem(held)} quantity={held.quantity} />
            )}

            {/* Pressing a hit puts one in; pressing again puts another. */}
            <ItemSearch
              campaignId={campaignId}
              openSlug={null}
              onOpen={(item) => step(container, item, 1)}
            />

            {container.type === "chest" ? (
              <div className="flex flex-col gap-2">
                <PartyAudience
                  label="Who may see it"
                  members={members}
                  value={chosen}
                  onChange={setDraft}
                />

                {audienceChanged && (
                  <div className="flex justify-end">
                    <StepButton
                      wide
                      pill
                      onClick={() => applyAccess(container, chosen)}
                      label={`Apply access for ${container.name}`}
                    >
                      Apply change
                    </StepButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <PartyAudience
                  label="Carried by"
                  members={members}
                  value={chosen}
                  onChange={setDraft}
                  single
                />
                {draft !== null && owner !== container.ownerCharacterId && (
                  <div className="flex justify-end">
                    <StepButton
                      wide
                      pill
                      onClick={() => hand(container, owner)}
                      label={`Apply owner for ${container.name}`}
                    >
                      Apply change
                    </StepButton>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gold/10">
      {CONTAINER_KINDS.map((kind) => {
        const held = containers.filter(
          (container) => container.type === kind.value,
        );
        const unfolded = shelves.includes(kind.value);

        return (
          <section key={kind.value} aria-label={kind.plural} className="py-1">
            <button
              type="button"
              onClick={() => {
                if (
                  unfolded &&
                  held.some((container) => container.id === open)
                ) {
                  setDraft(null);
                }
                setShelves((standing) =>
                  standing.includes(kind.value)
                    ? standing.filter((one) => one !== kind.value)
                    : [...standing, kind.value],
                );
              }}
              aria-expanded={unfolded}
              className="group flex w-full cursor-pointer items-center gap-2.5 rounded-md py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {/* Right while folded, down while open, turned rather than
                  swapped so the one becomes the other. */}
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`size-3.5 shrink-0 text-gold/70 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  unfolded ? "rotate-90" : ""
                }`}
              >
                <path d="m6 3.5 4.5 4.5L6 12.5" />
              </svg>

              <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-ink transition-colors duration-300 group-hover:text-gold">
                {kind.plural}
              </span>

              <span className="shrink-0 font-mono text-[0.625rem] text-ink/45 tabular-nums">
                {held.length}
              </span>
            </button>

            {/* Folded by its row's height rather than unmounted, so it eases
                open and shut. Inert while shut: nothing in there can be
                reached by the keyboard. The outdent leaves room for a card's
                focus ring inside the clip. */}
            <div
              inert={!unfolded}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                unfolded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="-mx-1 min-h-0 overflow-hidden px-1">
                <div className="pt-1 pb-3">
                  {held.length === 0 ? (
                    <p className="text-xs text-ink/50 italic">
                      None yet. Make one on the campaign page, under Create.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">{held.map(card)}</ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
