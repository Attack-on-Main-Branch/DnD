"use client";

import { useState } from "react";

import MultiSelectMenu from "@/app/components/ui/multi-select-menu";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import SelectMenu from "@/app/components/ui/select-menu";
import { NESTED_CARD_SELECTED_CLASSES } from "@/app/components/ui/surface";
import {
  chestAudienceLine,
  containerTagClasses,
  containerTypeLabel,
  CONTAINER_CARD_CLASSES,
  HIDDEN_CLASSES,
  NOBODY_YET,
  REVEALED_CLASSES,
} from "@/app/dashboard/container-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";

import {
  hideChestFrom,
  passContainerTo,
  revealChestTo,
  stockChestItem,
} from "./chest-actions";
import ItemSearch from "./item-search";
import { adjustPackItem } from "./pack-actions";
import { useAllPacks, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The Dungeon Master's side of the shelf: everything at the table, and the two
 * switches that decide who else can see any of it.
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
}) {
  const packs = useAllPacks();
  const store = useTableStore();
  const { run } = useTableDeed(campaignId);

  const [open, setOpen] = useState(null);

  /* The audience being ASSEMBLED, which is not yet the audience: a chest is
     revealed on a press. Keyed by container, so switching cards keeps it. */
  const [drafts, setDrafts] = useState({});

  function chosenFor(container) {
    return drafts[container.id] ?? container.visibleTo;
  }

  function setChosen(container, ids) {
    setDrafts((held) => ({ ...held, [container.id]: ids }));
  }

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
  function reveal(container) {
    const chosen = chosenFor(container);

    if (chosen.length === 0) {
      return;
    }

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

    if (from === to || !receiver) {
      return;
    }

    run({
      note: [
        {
          action: "bag_transferred",
          actor: "Dungeon Master",
          container: container.name,
          target: receiver.name,
        },
      ],

      paint: () => store.passContainer(container.id, from, to),
      work: () => passContainerTo(campaignId, container.id, to, null),
      tell: onTold,

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

  return (
    <ul className="flex flex-col gap-3">
      {containers.map((container) => {
        const expanded = open === container.id;
        const contents = contentsOf(container);
        const carrier = members.find(
          (member) => member.id === container.ownerCharacterId,
        );

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
              onClick={() =>
                setOpen((standing) =>
                  standing === container.id ? null : container.id,
                )
              }
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

              <span className="flex shrink-0 items-center gap-2">
                {/* Stacks in it, not a quantity OF it: hence a plain count
                    rather than the pack's `×N`, which beside a name reads as
                    two of the bag. */}
                <span className="font-mono text-[10px] text-ink/45 tabular-nums">
                  {contents.length}
                </span>

                <span className={containerTagClasses(container.type)}>
                  {containerTypeLabel(container.type)}
                </span>
              </span>
            </button>

            {expanded && (
              <div className="mt-3 flex flex-col gap-3 border-t border-gold/15 pt-3">
                {contents.length === 0 ? (
                  <p className="text-xs text-ink/50 italic">
                    Nothing in it. Find something below to put in.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {contents.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-2 rounded-lg border border-gold/15 bg-surface/50 px-2.5 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate font-display text-xs tracking-wide text-ink/85">
                          {row.name}
                        </span>

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

                {/* Pressing a hit puts one in; pressing again puts another. */}
                <ItemSearch
                  campaignId={campaignId}
                  openSlug={null}
                  onOpen={(item) => step(container, item, 1)}
                />

                {container.type === "chest" ? (
                  <div className="flex flex-col gap-2">
                    <MultiSelectMenu
                      label="Who may see it"
                      options={members.map((member) => ({
                        value: member.id,
                        label: member.name,
                      }))}
                      value={chosenFor(container)}
                      onChange={(ids) => setChosen(container, ids)}
                      everything="All party"
                      disabled={members.length === 0}
                    />

                    <div className="flex justify-end">
                      {container.isRevealed ? (
                        <RevealButton
                          revealed
                          onClick={() => hide(container)}
                          label={`Hide ${container.name} again`}
                        >
                          Hide
                        </RevealButton>
                      ) : (
                        <RevealButton
                          onClick={() => reveal(container)}
                          disabled={chosenFor(container).length === 0}
                          label={`Reveal ${container.name} to the chosen`}
                        >
                          Reveal to selected
                        </RevealButton>
                      )}
                    </div>
                  </div>
                ) : (
                  /* No way back to nobody: taking a bag out of somebody's
                     hands and putting it nowhere is not a thing that happens at
                     a table. The only other place it goes is other hands. */
                  <SelectMenu
                    label="Carried by"
                    options={members.map((member) => ({
                      value: member.id,
                      label: member.name,
                    }))}
                    value={container.ownerCharacterId ?? ""}
                    onChange={(id) => hand(container, id)}
                    placeholder={NOBODY_YET}
                    disabled={members.length === 0}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Emerald only while it is ON — see container-presentation.js. */
function RevealButton({ revealed, onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={Boolean(revealed)}
      aria-label={label}
      className={`cursor-pointer rounded-full border px-4 py-1.5 font-display text-xs tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        revealed ? REVEALED_CLASSES : HIDDEN_CLASSES
      }`}
    >
      {children}
    </button>
  );
}
