"use client";

import { useState } from "react";
import { parseQuantity } from "sina/rules/inventory";

import { controlClasses } from "@/app/components/ui/field-styles";
import { COIN_PANEL_CLASSES } from "@/app/dashboard/currency-presentation";
import ItemDetail from "@/app/dashboard/item-detail";
import ItemRow from "@/app/dashboard/item-row";
import { rowItem } from "@/app/dashboard/inventory-presentation";

import DmPurse from "./dm-purse";
import ItemSearch from "./item-search";
import { Action } from "./pack-controls";
import { adjustPackItem, grantPackItems } from "./pack-actions";
import PartyPills, { Pill } from "./party-pills";
import {
  PopoverAside,
  POPOVER_BODY_CLASSES,
  POPOVER_BODY_SHORT_CLASSES,
  usePopoverOpen,
} from "./table-popover";
import { useTableStore } from "./table-state";
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
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState(null);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  const selected = members.find((member) => member.id === target) ?? null;
  const targets = selected ? [selected.id] : members.map((member) => member.id);

  const pack = selected ? (packs.get(selected.id) ?? []) : [];

  /* An empty purse for a character `campaign_purses` returned no row for. Null
     for "all party": there is no one balance to hold up as a placeholder. */
  const purse = selected ? (purses.get(selected.id) ?? null) : null;

  const held = pack.find((row) => row.item_slug === reading?.slug) ?? null;
  const open = held ? rowItem(held) : reading;

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

  function show(item) {
    setTyped("");
    setNote(null);
    setReading((standing) => (standing?.slug === item.slug ? null : item));
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
    const said = selected
      ? `${giving} × ${item.name} to ${selected.name}.`
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
          store.movePack(id, item, giving);
        }
      },

      work: () => grantPackItems(campaignId, targets, item, giving),
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

    setTyped("");
    setReading(null);
    setNote(`${taking} × ${item.name} from ${who.name}.`);

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

      paint: () => store.movePack(who.id, item, -taking),

      work: () => adjustPackItem(campaignId, who.id, item, -taking),
      tell: () => toldPacks([who.id]),
      want: { inventory: true, activity: true, characterIds: [who.id] },
    }).then(said);
  }

  return (
    <div
      className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${
        open ? POPOVER_BODY_SHORT_CLASSES : POPOVER_BODY_CLASSES
      }`}
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
              openSlug={open?.slug ?? null}
              onOpen={show}
            />
          </div>

          {selected &&
            (pack.length === 0 ? (
              <p className="mt-5 text-center text-sm text-ink/50 italic">
                {selected.name} is carrying nothing.
              </p>
            ) : (
              <>
                <p className="mt-5 font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
                  {selected.name} · {pack.length} carried
                </p>

                <ul className="mt-2.5 grid grid-cols-3 gap-2">
                  {pack.map((row) => (
                    <li key={row.id} className="flex">
                      <ItemRow
                        item={rowItem(row)}
                        quantity={row.quantity}
                        open={open?.slug === row.item_slug}
                        onOpen={() => show(rowItem(row))}
                      />
                    </li>
                  ))}
                </ul>
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

              {held && (
                <p className="mr-auto text-xs text-ink/45">
                  of {held.quantity}
                </p>
              )}

              {held && selected && (
                <Action
                  onClick={take}
                  disabled={!usable}
                  tone="danger"
                  label={`Take ${count} ${open.name} from ${selected.name}`}
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
                    ? `Give ${count} ${open.name} to ${selected.name}`
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
