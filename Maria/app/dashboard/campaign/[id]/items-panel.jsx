"use client";

import { useState, useTransition } from "react";
import {
  MAX_CAMPAIGN_ITEMS,
  MAX_ITEM_CATEGORY_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_ITEM_NAME_LENGTH,
} from "sina/rules/inventory";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";

import { strikeCampaignItem, writeCampaignItem } from "./item-actions";

/**
 * The campaign's own items: everything the SRD has never heard of.
 *
 * Written here rather than at the table, where a form inside a popover had
 * nowhere to keep an item between sessions. The table's search finds these.
 */
const FEEDBACK_ID = "campaign-items-feedback";

export default function ItemsPanel({ campaignId, items }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const full = items.length >= MAX_CAMPAIGN_ITEMS;

  function write(event) {
    event.preventDefault();

    if (isPending || full) {
      return;
    }

    startTransition(async () => {
      const result = await writeCampaignItem(campaignId, {
        name,
        category,
        description,
      });

      if (result?.kind === "rejected") {
        setError(result.message);
        setNote(null);
        return;
      }

      setName("");
      setCategory("");
      setDescription("");
      setError(null);
      setNote(`${result.name} is written down.`);
    });
  }

  function strike(id) {
    startTransition(async () => {
      const result = await strikeCampaignItem(campaignId, id);

      setError(result?.kind === "rejected" ? result.message : null);
      setNote(null);
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
            {items.length} of {MAX_CAMPAIGN_ITEMS} written
          </p>
        </div>

        <p className="mt-2 text-xs text-ink/50">
          Anything the rulebook has never heard of. What you write here is found
          from the pack at the table, beside the SRD’s own — and handed out from
          there.
        </p>

        <form onSubmit={write} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Name"
              value={name}
              maxLength={MAX_ITEM_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rusted key"
              disabled={isPending || full}
              aria-describedby={FEEDBACK_ID}
            />

            <TextField
              label="Category"
              value={category}
              maxLength={MAX_ITEM_CATEGORY_LENGTH}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Equipment"
              disabled={isPending || full}
            />
          </div>

          <TextAreaField
            label="Description"
            rows={3}
            value={description}
            maxLength={MAX_ITEM_DESCRIPTION_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What it is, and what it does."
            hint={`${description.length} / ${MAX_ITEM_DESCRIPTION_LENGTH}`}
            disabled={isPending || full}
          />

          <FormAlert id={FEEDBACK_ID}>{error}</FormAlert>
          <FormAlert tone="success">{note}</FormAlert>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending || full || name.trim().length === 0}
            >
              {isPending ? "Writing…" : "Write it down"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Your items
        </h2>

        {items.length === 0 ? (
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
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => strike(row.id)}
                      disabled={isPending}
                      aria-label={`Remove ${row.name}`}
                      // The dashboard's Retire and Delete: ink at rest, red
                      // under the pointer.
                      className="cursor-pointer rounded-md px-2 py-1 font-display text-xs tracking-wide text-ink/60 transition-colors duration-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-ink/25"
                    >
                      Remove
                    </button>
                  </div>
                </PackItemCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
