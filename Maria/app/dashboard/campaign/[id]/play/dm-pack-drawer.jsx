"use client";

import { useMemo, useState } from "react";
import { parseQuantity } from "sina/rules/inventory";

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

import DmPurse from "./dm-purse";
import ItemSearch from "./item-search";
import { Action, QuantityField } from "./pack-controls";
import { adjustPackItem, grantPackItems } from "./pack-actions";
import PartyPills, { Pill } from "@/app/dashboard/party-pills";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  usePopoverOpen,
} from "./table-popover";
import { useContainers, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The Dungeon Master's side of the pack: what the party is carrying, and what
 * they are about to be carrying. Built the way the spellbook's drawer is — a
 * page of names, and the one pressed read out underneath.
 *
 * The pill bar aims both halves. "All party" is a TARGET and not a view — six
 * packs at once is more than this panel can show — so choosing it puts the
 * carried list away and leaves the giving.
 *
 * Nothing is invented here: homebrew is written down on the campaign page and
 * found from the search, beside the SRD's own.
 *
 * Both deeds paint into every pack they touch before the write goes out, and the
 * write is one round trip. Why a grant to one pack and a grant to the party are
 * logged by different mechanisms is in pack-actions.js.
 */

const EVERYONE = "all";

export default function DmPackDrawer({
  campaignId,
  members,
  packs,
  purses,
  actorName,
}) {
  const [target, setTarget] = useState(EVERYONE);
  const [reading, setReading] = useState(null);
  const [openBag, setOpenBag] = useState(null);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState(null);

  const store = useTableStore();
  const containers = useContainers();
  const { run, send } = useTableDeed(campaignId);

  const selected = members.find((member) => member.id === target) ?? null;
  const targets = selected ? [selected.id] : members.map((member) => member.id);

  /* The pack itself and each bag apart, as the player's own drawer shows
     them: a stack is keyed on `(character, slug, container)`, so rope in a bag
     and rope in the pack are two rows. An item opened from a bag is given into
     and taken out of that bag; one from the pack or the search, the pack. */
  const rows = useMemo(
    () => (selected ? (packs.get(selected.id) ?? []) : []),
    [packs, selected],
  );

  const pack = rows.filter((row) => !row.container_id);

  const bags = useMemo(
    () =>
      selected
        ? containers.filter(
            (one) => one.type === "bag" && one.ownerCharacterId === selected.id,
          )
        : [],
    [containers, selected],
  );

  /* An empty purse for a character `campaign_purses` returned no row for. Null
     for "all party": there is no one balance to hold up as a placeholder. */
  const purse = selected ? (purses.get(selected.id) ?? null) : null;

  const held =
    rows.find(
      (row) =>
        row.item_slug === reading?.item.slug &&
        (row.container_id ?? null) === (reading?.containerId ?? null),
    ) ?? null;

  const open = held ? rowItem(held) : (reading?.item ?? null);

  /* Which bag the deeds below work, null being the pack itself. */
  const bag = selected
    ? (bags.find((one) => one.id === reading?.containerId) ?? null)
    : null;
  const bagId = bag?.id ?? null;

  const count = parseQuantity(typed) ?? 0;
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

  function show(item, containerId = null) {
    setTyped("1");
    setNote(null);
    setReading((standing) =>
      standing?.item.slug === item.slug &&
      (standing.containerId ?? null) === containerId
        ? null
        : { item, containerId },
    );
  }

  /** Every pack this deed reaches, told once the server has taken it. */
  function toldPacks(ids) {
    for (const id of ids) {
      send({ kind: "pack", characterId: id });
    }
  }

  /**
   * The status line goes up on the press, because that is when the packs move. A
   * refusal takes it back down: the line outlives the toast, and the two would
   * be answering one press with different words.
   */
  function said(result) {
    if (!result) {
      setNote(null);
    }
  }

  function give() {
    const item = open;
    const giving = count;
    const into = bagId;
    const said = selected
      ? `${giving} × ${item.name} to ${bag?.name ?? selected.name}.`
      : `${giving} × ${item.name} to each of ${targets.length}.`;

    setTyped("");
    setReading(null);
    setNote(said);

    run({
      // One line, whether it went to one pack or to six.
      note: [
        {
          action: "item_granted",
          actor: actorName,
          item: item.name,
          quantity: giving,
          target: selected ? selected.name : "the party",
        },
      ],

      paint: () => {
        for (const id of targets) {
          store.movePack(id, item, giving, into);
        }
      },

      work: () =>
        into
          ? adjustPackItem(campaignId, selected.id, item, giving, into)
          : grantPackItems(campaignId, targets, item, giving),
      tell: () => toldPacks(targets),
      want: { inventory: true, activity: true, characterIds: targets },
    }).then(said);
  }

  /* A CHANGE and not a total, for the reason the health band's reducer takes
     one: a total is computed against a row that may have moved since the panel
     was drawn. */
  function take() {
    const item = open;
    const who = selected;
    const taking = Math.min(count, held.quantity);
    const from = held.container_id ?? null;

    setTyped("");
    setReading(null);
    setNote(`${taking} × ${item.name} from ${bag?.name ?? who.name}.`);

    run({
      note: [
        {
          action: "item_revoked",
          actor: actorName,
          item: item.name,
          quantity: taking,
          target: who.name,
        },
      ],

      paint: () => store.movePack(who.id, item, -taking, from),

      work: () => adjustPackItem(campaignId, who.id, item, -taking, from),
      tell: () => toldPacks([who.id]),
      want: { inventory: true, activity: true, characterIds: [who.id] },
    }).then(said);
  }

  return (
    <div
      data-popover-body
      className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
    >
      <PartyPills
        members={members}
        chosen={target}
        onChoose={setTarget}
        label="Who receives it"
      >
        <Pill
          active={target === EVERYONE}
          onClick={() => setTarget(EVERYONE)}
          disabled={members.length === 0}
        >
          All party
          {members.length > 0 && (
            <span className="font-mono text-[10px] text-ink/50 tabular-nums">
              {members.length}
            </span>
          )}
        </Pill>
      </PartyPills>

      {members.length === 0 ? (
        <p className="mt-6 text-center text-sm text-ink/50 italic">
          Nobody has joined this party yet.
        </p>
      ) : (
        <>
          {/* Paying the party is one press and finding an item is a paragraph
              of typing, so the shorter deed goes first. Only while "all party"
              is aimed — a single character's coins live over their own pack. */}
          {!selected && (
            <section
              aria-label="The party’s coin"
              className={`mt-5 ${COIN_PANEL_CLASSES}`}
            >
              <h3 className="mb-3 font-display text-xs font-semibold tracking-[0.16em] text-ink/60 uppercase">
                The party’s coin
              </h3>

              <DmPurse
                campaignId={campaignId}
                character={null}
                members={members}
                actorName={actorName}
                purse={null}
              />
            </section>
          )}

          {selected && (
            <section
              aria-label={`${selected.name}’s purse`}
              className={`mt-5 ${COIN_PANEL_CLASSES}`}
            >
              <DmPurse
                campaignId={campaignId}
                character={selected}
                members={members}
                actorName={actorName}
                purse={purse}
              />
            </section>
          )}

          <div className="mt-4">
            <ItemSearch
              campaignId={campaignId}
              openSlug={open && !reading?.containerId ? open.slug : null}
              onOpen={show}
            />
          </div>

          {selected &&
            (pack.length === 0 && bags.length === 0 ? (
              <p className="mt-5 text-center text-sm text-ink/50 italic">
                {selected.name} is carrying nothing.
              </p>
            ) : (
              <>
                <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
                  {selected.name} · {pack.length} carried
                </p>

                {pack.length === 0 ? (
                  <p className="mt-2.5 text-xs text-ink/50 italic">
                    Nothing loose — it is all in the bags below.
                  </p>
                ) : (
                  <ul className="mt-2.5 grid grid-cols-3 gap-2">
                    {pack.map((row) => (
                      <li key={row.id} className="flex">
                        <ItemRow
                          item={rowItem(row)}
                          quantity={row.quantity}
                          open={held?.id === row.id}
                          inHand={row.in_hand}
                          onOpen={() => show(rowItem(row), null)}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {bags.map((bag) => (
                  <BagSection
                    key={bag.id}
                    bag={bag}
                    inside={rows.filter((row) => row.container_id === bag.id)}
                    unfolded={openBag === bag.id}
                    onFold={() =>
                      setOpenBag((standing) =>
                        standing === bag.id ? null : bag.id,
                      )
                    }
                    openId={held?.id ?? null}
                    onOpen={(row) => show(rowItem(row), bag.id)}
                  />
                ))}
              </>
            ))}
        </>
      )}

      {note && (
        <p role="status" className="mt-3 text-xs text-gold/75">
          {note}
        </p>
      )}

      {open && members.length > 0 && (
        <PopoverAside>
          <ItemDetail item={open} quantity={held?.quantity}>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
              {/* No ceiling but the rules': a Dungeon Master gives as many as
                  they like, and a take is clamped to the stack. */}
              <QuantityField
                value={typed}
                onChange={setTyped}
                name={open.name}
                of={held?.quantity ?? null}
                className={held ? "mr-auto" : ""}
              />

              {held && selected && (
                <Action
                  onClick={take}
                  disabled={!usable}
                  tone="danger"
                  label={`Take ${count} ${open.name} from ${bag?.name ?? selected.name}`}
                >
                  Take it back
                </Action>
              )}

              <Action
                onClick={give}
                disabled={!usable}
                tone="gold"
                label={
                  selected
                    ? `Give ${count} ${open.name} to ${bag?.name ?? selected.name}`
                    : `Give ${count} ${open.name} to everyone`
                }
              >
                {selected ? `Give to ${selected.name}` : "Give to everyone"}
              </Action>
            </div>
          </ItemDetail>
        </PopoverAside>
      )}
    </div>
  );
}

/** One of the character's bags as the player sees it, without the hand-over. */
function BagSection({ bag, inside, unfolded, onFold, openId, onOpen }) {
  return (
    <section
      aria-label={bag.name}
      className={`mt-3 transition duration-300 ${CONTAINER_CARD_CLASSES} ${
        unfolded ? NESTED_CARD_SELECTED_CLASSES : ""
      }`}
    >
      <button
        type="button"
        onClick={onFold}
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
            <p className="text-xs text-ink/50 italic">Nothing in it yet.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {inside.map((row) => (
                <li key={row.id} className="flex">
                  <ItemRow
                    item={rowItem(row)}
                    quantity={row.quantity}
                    open={openId === row.id}
                    onOpen={() => onOpen(row)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
