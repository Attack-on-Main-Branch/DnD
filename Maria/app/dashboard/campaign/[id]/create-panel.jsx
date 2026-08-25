"use client";

import { useState, useTransition } from "react";
import { MAX_CAMPAIGN_ITEMS } from "sina/rules/inventory";
import { MAX_CAMPAIGN_SPELLS } from "sina/rules/spells";

import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";
import {
  catalogueFacts,
  itemFactList,
  rowItem,
} from "@/app/dashboard/inventory-presentation";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";
import {
  LEVEL_TAG_CLASSES,
  SCHOOL_TAG_CLASSES,
  levelBadge,
} from "@/app/dashboard/spell-presentation";

import ItemForm from "./item-form";
import { strikeCampaignItem } from "./item-actions";
import SpellForm from "./spell-form";
import { strikeCampaignSpell } from "./spell-actions";

/**
 * Where homebrew is invented, both kinds of it. Written here rather than at the
 * table, where a form inside a popover had nowhere to keep what it made between
 * sessions; the table's own searches find these.
 *
 * WHAT is being made comes first: the two forms have almost nothing in common
 * past a name, and one carrying both would be a form where most of the boxes
 * are always wrong.
 */

const KINDS = [
  { value: "item", label: "Item" },
  { value: "spell", label: "Spell" },
];

export default function CreatePanel({ campaignId, items, spells }) {
  const [kind, setKind] = useState("item");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const making = kind === "spell";

  function strike(remove, id) {
    startTransition(async () => {
      const result = await remove(campaignId, id);

      setError(result?.kind === "rejected" ? result.message : null);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
          <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
            Write something down
          </h2>

          <p className="font-sans text-xs tracking-wide text-ink/50 uppercase">
            {making
              ? `${spells.length} of ${MAX_CAMPAIGN_SPELLS} written`
              : `${items.length} of ${MAX_CAMPAIGN_ITEMS} written`}
          </p>
        </div>

        <p className="mt-2 text-xs text-ink/50">
          Anything the rulebook has never heard of. What you write here is found
          at the table beside the SRD’s own — handed out from the pack, or
          taught from the spellbook.
        </p>

        {/* A group of two rather than a tab strip: these select a FORM. */}
        <div
          role="group"
          aria-label="What to create"
          className="mt-4 flex flex-wrap gap-2"
        >
          {KINDS.map((one) => (
            <button
              key={one.value}
              type="button"
              onClick={() => setKind(one.value)}
              aria-pressed={kind === one.value}
              className={`cursor-pointer rounded-full border px-4 py-1.5 font-display text-xs tracking-wide transition duration-300 ${
                kind === one.value
                  ? "border-gold/55 bg-gold/15 text-gold"
                  : "border-gold/20 bg-surface/40 text-ink/70 hover:border-gold/45 hover:text-gold"
              }`}
            >
              {one.label}
            </button>
          ))}
        </div>

        {/* Keyed, so switching kinds is a fresh form. */}
        {making ? (
          <SpellForm
            key="spell"
            campaignId={campaignId}
            written={spells.length}
          />
        ) : (
          <ItemForm key="item" campaignId={campaignId} written={items.length} />
        )}
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          {making ? "Your spells" : "Your items"}
        </h2>

        {making ? (
          spells.length === 0 ? (
            <div className="mt-3">
              <EmptyPack
                title="Nothing written down"
                description="Spells you invent for this campaign are kept here, and taught from the table."
              />
            </div>
          ) : (
            <ul className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spells.map((row) => (
                <li key={row.id} className="flex">
                  <SpellEntry
                    spell={row}
                    disabled={isPending}
                    onStrike={() => strike(strikeCampaignSpell, row.id)}
                  />
                </li>
              ))}
            </ul>
          )
        ) : items.length === 0 ? (
          <div className="mt-3">
            <EmptyPack
              title="Nothing written down"
              description="Items you invent for this campaign are kept here, and found from the table."
            />
          </div>
        ) : (
          // Three to a row, as on the character sheet: same width, same cards.
          <ul className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((row, index) => (
              <li key={row.id} className="flex">
                <PackItemCard item={rowItem(row)} index={index}>
                  {/* What the panel at the table will print, on one line. */}
                  <ItemFacts row={row} />

                  <div className="mt-2 flex justify-end">
                    <StrikeButton
                      label={`Remove ${row.name}`}
                      disabled={isPending}
                      onClick={() => strike(strikeCampaignItem, row.id)}
                    />
                  </div>
                </PackItemCard>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-300">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * Built to PackItemCard's shape so the two lists read as one thing: the level
 * where a stack count goes, the school where a category tag goes.
 */
function SpellEntry({ spell, disabled, onStrike }) {
  return (
    <div
      className={`flex h-full w-full flex-col rounded-xl border p-3.5 text-left transition duration-300 ${NESTED_CARD_CLASSES}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 font-display text-sm font-semibold tracking-wide text-ink">
          {spell.name}
        </p>

        <span className={`shrink-0 ${LEVEL_TAG_CLASSES}`}>
          {levelBadge(spell.level)}
        </span>
      </div>

      {spell.school && (
        <p className="mt-1.5">
          <span className={SCHOOL_TAG_CLASSES}>{spell.school}</span>
        </p>
      )}

      {spell.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/55">
          {spell.description}
        </p>
      )}

      <div className="mt-auto flex justify-end pt-3">
        <StrikeButton
          label={`Remove ${spell.name}`}
          disabled={disabled}
          onClick={onStrike}
        />
      </div>
    </div>
  );
}

/** The written-down facts, run together — the card has one line for them. */
function ItemFacts({ row }) {
  const facts = itemFactList(catalogueFacts(row));

  if (facts.length === 0) {
    return null;
  }

  return (
    <p className="font-mono text-[11px] text-ink/45 tabular-nums">
      {facts.map((fact) => fact.value).join(" · ")}
    </p>
  );
}

/** The dashboard's Retire and Delete: ink at rest, red under the pointer. */
function StrikeButton({ label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="cursor-pointer rounded-md px-2 py-1 font-display text-xs tracking-wide text-ink/60 transition-colors duration-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-ink/25"
    >
      Remove
    </button>
  );
}
