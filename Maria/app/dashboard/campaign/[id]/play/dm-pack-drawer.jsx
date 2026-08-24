"use client";

import { useOptimistic, useState, useTransition } from "react";
import { readPurse } from "sina/rules/currency";
import { MAX_ITEM_QUANTITY } from "sina/rules/inventory";

import QuantityStepper from "@/app/components/ui/quantity-stepper";
import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";
import { COIN_PANEL_CLASSES } from "@/app/dashboard/currency-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard from "@/app/dashboard/pack-item-card";

import DmPurse from "./dm-purse";
import ItemSearch from "./item-search";
import { adjustPackItem, grantPackItems } from "./pack-actions";
import PartyPills, { Pill } from "./party-pills";
import { POPOVER_BODY_CLASSES } from "./table-popover";
import { useActivityLog } from "./use-activity";

/**
 * The Dungeon Master's side of the pack: what the party is carrying, and what
 * they are about to be carrying.
 *
 * The pill bar aims both halves. "All party" is a TARGET and not a view — six
 * packs at once is more than this panel can show — so choosing it puts the
 * inspection grid away and leaves the giving.
 *
 * The purse is aimed by the same pill and is otherwise the SAME control either
 * way — see dm-purse.jsx. With a name chosen it stands over that character's
 * pack, where their balances are; with "all party" it stands alone at the top,
 * because there is no single set of balances to show and nothing to stand over.
 *
 * Nothing is invented here: homebrew is written down on the campaign page and
 * found from the search below, beside the SRD's own.
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
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  const selected = members.find((member) => member.id === target) ?? null;
  const targets = selected ? [selected.id] : members.map((member) => member.id);

  const pack = selected ? (packs.get(selected.id) ?? []) : [];

  /* An empty purse for a character `campaign_purses` returned no row for, which
     at this seat means the party changed under an open panel. Null for "all
     party": there is no one balance, so the capsules have nothing to hold up as
     a placeholder and show a plain zero. */
  const purse = selected ? readPurse(purses.get(selected.id)) : null;

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

  function give(item, quantity) {
    startTransition(async () => {
      const result = await grantPackItems(campaignId, targets, item, quantity);

      const landed = answer(
        result,
        selected
          ? `${quantity} × ${item.name} to ${selected.name}.`
          : `${quantity} × ${item.name} to each of ${targets.length}.`,
      );

      /* One entry, whether it went to one pack or to six. `null` is the head
         of the table filing it, and a null recipient is what
         `record_campaign_activity` turns into "the party" — the recipient's
         name is never a string this drawer chose. */
      if (landed) {
        record(null, {
          action: "item_granted",
          itemName: item.name,
          quantity,
          targetCharacterId: selected?.id ?? null,
        });
      }
    });
  }

  return (
    <div
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
          {/* Above the search rather than beside it: paying the party is one
              press and finding an item is a paragraph of typing, so the shorter
              deed goes first. Only while "all party" is the target — a single
              character's coins live over their own pack, below. */}
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

          {/* Search first: handing something out is why this drawer is
              open, and a full pack pushed the field off the panel. */}
          <div className="mt-5">
            <ItemSearch
              campaignId={campaignId}
              disabled={isPending}
              giveLabel={
                selected ? `Give to ${selected.name}` : "Give to everyone"
              }
              onGive={give}
            />
          </div>

          {selected && (
            <>
              <div
                aria-hidden="true"
                className={`my-5 ${FADED_RULE_CLASSES}`}
              />

              <section aria-label={`${selected.name}’s pack`}>
                <h3 className="font-display text-xs font-semibold tracking-[0.16em] text-ink/60 uppercase">
                  Carrying
                </h3>

                {/* Above the grid, because coins are what a party checks first
                    and because a full pack would otherwise push them off the
                    panel. */}
                {/* A `section` and not a `div`: `aria-label` names an element
                    that has a role to be named, and a bare div has none. */}
                <section
                  aria-label={`${selected.name}’s purse`}
                  className={`mt-3 ${COIN_PANEL_CLASSES}`}
                >
                  <DmPurse
                    campaignId={campaignId}
                    character={selected}
                    members={members}
                    purse={purse}
                    onWritten={onCoinsWritten}
                  />
                </section>

                {pack.length === 0 ? (
                  <p className="mt-3 text-center text-sm text-ink/50 italic">
                    {selected.name} is carrying nothing.
                  </p>
                ) : (
                  <ul className="mt-3 grid auto-rows-fr gap-2.5 sm:grid-cols-2">
                    {pack.map((row, index) => (
                      <li key={row.id} className="flex">
                        <RevokeCard
                          campaignId={campaignId}
                          character={selected}
                          row={row}
                          index={index}
                          onWritten={onWritten}
                          onError={setError}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      )}

      {note && !error && (
        <p role="status" className="mt-3 text-xs text-gold/75">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * `useOptimistic` over the CHANGE rather than the result, which is the health
 * band's reducer exactly: a finished total would be computed against a row that
 * has not moved yet, so two quick presses would both aim at the same number.
 */
function RevokeCard({ campaignId, character, row, index, onWritten, onError }) {
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  const [quantity, adjust] = useOptimistic(row.quantity, (base, delta) =>
    Math.min(MAX_ITEM_QUANTITY, Math.max(0, base + delta)),
  );

  const item = rowItem(row);

  function move(next) {
    const delta = next - quantity;

    if (delta === 0) {
      return;
    }

    startTransition(async () => {
      adjust(delta);

      const result = await adjustPackItem(
        campaignId,
        character.id,
        item,
        delta,
      );

      if (result?.kind === "rejected") {
        onError(result.message);
        return;
      }

      onError(null);
      onWritten(character.id);

      /* The stepper is the same two deeds the search field above does, one at
         a time: up is a grant, down is taking it back. `null` is the head of
         the table filing it — this drawer only ever renders for that seat. */
      record(null, {
        action: delta > 0 ? "item_granted" : "item_revoked",
        itemName: item.name,
        quantity: Math.abs(delta),
        targetCharacterId: character.id,
      });
    });
  }

  return (
    <div className={`flex w-full ${isPending ? "opacity-60" : ""}`}>
      <PackItemCard item={item} index={index} quantity={quantity}>
        <QuantityStepper
          value={quantity}
          min={0}
          max={MAX_ITEM_QUANTITY}
          onChange={move}
          disabled={isPending}
          label={`How many ${item.name} ${character.name} carries`}
          decreaseLabel={`Take a ${item.name} from ${character.name}`}
          increaseLabel={`Give ${character.name} another ${item.name}`}
        />
      </PackItemCard>
    </div>
  );
}
