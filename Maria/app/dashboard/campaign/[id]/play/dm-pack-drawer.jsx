"use client";

import { useOptimistic, useState, useTransition } from "react";
import { MAX_ITEM_QUANTITY } from "sina/rules/inventory";

import Avatar from "@/app/components/ui/avatar";
import QuantityStepper from "@/app/components/ui/quantity-stepper";
import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard from "@/app/dashboard/pack-item-card";

import ItemSearch from "./item-search";
import { adjustPackItem, grantPackItems } from "./pack-actions";
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
 * Nothing is invented here: homebrew is written down on the campaign page and
 * found from the search below, beside the SRD's own.
 */

const EVERYONE = "all";

export default function DmPackDrawer({
  campaignId,
  members,
  packs,
  onWritten,
}) {
  const [target, setTarget] = useState(EVERYONE);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const record = useActivityLog(campaignId);

  const selected = members.find((member) => member.id === target) ?? null;
  const targets = selected ? [selected.id] : members.map((member) => member.id);

  const pack = selected ? (packs.get(selected.id) ?? []) : [];

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
      {/* `role="group"` rather than a tablist: these control no panel of
          their own, they aim the one below. */}
      <div
        role="group"
        aria-label="Who receives it"
        className="flex flex-wrap gap-2"
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

        {members.map((member) => (
          <Pill
            key={member.id}
            active={target === member.id}
            onClick={() => setTarget(member.id)}
            // Named outright: the avatar is `aria-hidden`, so the only
            // text is inside a span.
            label={member.name}
          >
            <Avatar
              initials={characterInitials(member.name)}
              colorClass={avatarColorClass(member.color_theme)}
              size="xs"
            />
            <span className="max-w-32 truncate">{member.name}</span>
          </Pill>
        ))}
      </div>

      {members.length === 0 ? (
        <p className="mt-6 text-center text-sm text-ink/50 italic">
          Nobody has joined this party yet.
        </p>
      ) : (
        <>
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

function Pill({ active, onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 font-display text-xs tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-gold/55 bg-gold/15 text-gold"
          : "border-gold/20 bg-surface/40 text-ink/70 hover:border-gold/45 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
