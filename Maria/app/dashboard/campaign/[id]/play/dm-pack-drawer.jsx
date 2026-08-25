"use client";

import { useState, useTransition } from "react";
import { readPurse } from "sina/rules/currency";
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
import { useActivityLog } from "./use-activity";

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
 */

const EVERYONE = "all";

export default function DmPackDrawer({
  campaignId,
  members,
  packs,
  purses,
  onWritten,
  onCoinsWritten,
}) {
  const [target, setTarget] = useState(EVERYONE);
  const [reading, setReading] = useState(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  const selected = members.find((member) => member.id === target) ?? null;
  const targets = selected ? [selected.id] : members.map((member) => member.id);

  const pack = selected ? (packs.get(selected.id) ?? []) : [];

  /* An empty purse for a character `campaign_purses` returned no row for. Null
     for "all party": there is no one balance to hold up as a placeholder. */
  const purse = selected ? readPurse(purses.get(selected.id)) : null;

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
    setError(null);
    setReading((standing) => (standing?.slug === item.slug ? null : item));
  }

  function answer(result, said) {
    if (result?.kind === "rejected") {
      setError(result.message);
      setNote(null);
      return false;
    }

    setError(null);
    setNote(said);

    for (const id of targets) {
      onWritten(id);
    }

    return true;
  }

  function give() {
    startTransition(async () => {
      const result = await grantPackItems(campaignId, targets, open, count);

      const landed = answer(
        result,
        selected
          ? `${count} × ${open.name} to ${selected.name}.`
          : `${count} × ${open.name} to each of ${targets.length}.`,
      );

      /* One entry, whether it went to one pack or to six. `null` is the head of
         the table filing it, which `record_campaign_activity` turns into "the
         party" — the recipient's name is never a string this drawer chose. */
      if (landed) {
        setTyped("");
        setReading(null);
        record(null, {
          action: "item_granted",
          itemName: open.name,
          quantity: count,
          targetCharacterId: selected?.id ?? null,
        });
      }
    });
  }

  /* A CHANGE and not a total, for the reason the health band's reducer takes
     one: a total is computed against a row that may have moved since the panel
     was drawn. */
  function take() {
    startTransition(async () => {
      const taking = Math.min(count, held.quantity);
      const result = await adjustPackItem(
        campaignId,
        selected.id,
        open,
        -taking,
      );

      if (answer(result, `${taking} × ${open.name} from ${selected.name}.`)) {
        setTyped("");
        setReading(null);
        record(null, {
          action: "item_revoked",
          itemName: open.name,
          quantity: taking,
          targetCharacterId: selected.id,
        });
      }
    });
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
                purse={null}
                onWritten={onCoinsWritten}
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
                purse={purse}
                onWritten={onCoinsWritten}
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

      {note && !error && (
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
                  disabled={isPending}
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
                  disabled={isPending || !usable}
                  tone="danger"
                  label={`Take ${count} ${open.name} from ${selected.name}`}
                >
                  Take it back
                </Action>
              )}

              <Action
                onClick={give}
                disabled={isPending || !usable}
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
