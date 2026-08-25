"use client";

import { useState, useTransition } from "react";
import {
  COST_UNITS,
  MAX_CAMPAIGN_ITEMS,
  MAX_ITEM_ARMOR_CLASS,
  MAX_ITEM_CATEGORY_LENGTH,
  MAX_ITEM_COST,
  MAX_ITEM_DAMAGE_TYPE_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_ITEM_DICE_LENGTH,
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_PROPERTIES_LENGTH,
  MAX_ITEM_WEIGHT,
} from "sina/rules/inventory";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import SelectMenu from "@/app/components/ui/select-menu";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";

import { writeCampaignItem } from "./item-actions";

/**
 * An item written down in full: the fields the SRD's own entries arrive with,
 * each in a box of its own. Only the NAME is required — a rusted key has no
 * price and no dice, and the rules layer reads an empty box as zero.
 *
 * The columns stay separate here and are composed into one card's worth of text
 * when the item is handed out; see `describeCustom` in api/items/search.
 */

const FEEDBACK_ID = "campaign-item-feedback";

const COST_OPTIONS = COST_UNITS.map((unit) => ({
  value: unit,
  label: unit.toUpperCase(),
}));

const EMPTY = {
  name: "",
  category: "",
  cost: "",
  costUnit: "gp",
  weight: "",
  damageDice: "",
  damageType: "",
  armorClass: "",
  properties: "",
  description: "",
};

export default function ItemForm({ campaignId, written }) {
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const full = written >= MAX_CAMPAIGN_ITEMS;
  const blocked = isPending || full;

  const set = (field) => (event) =>
    setValues((held) => ({ ...held, [field]: event.target.value }));

  function write(event) {
    event.preventDefault();

    if (blocked) {
      return;
    }

    startTransition(async () => {
      const result = await writeCampaignItem(campaignId, values);

      if (result?.kind === "rejected") {
        setError(result.message);
        setNote(null);
        return;
      }

      setValues(EMPTY);
      setError(null);
      setNote(`${result.name} is written down.`);
    });
  }

  return (
    <form onSubmit={write} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          value={values.name}
          maxLength={MAX_ITEM_NAME_LENGTH}
          onChange={set("name")}
          placeholder="Rusted key"
          disabled={blocked}
          aria-describedby={FEEDBACK_ID}
        />

        <TextField
          label="Category"
          value={values.category}
          maxLength={MAX_ITEM_CATEGORY_LENGTH}
          onChange={set("category")}
          placeholder="Equipment"
          disabled={blocked}
        />
      </div>

      {/* The price is two fields and reads as one, so they share a row. */}
      <div className="grid gap-4 sm:grid-cols-4">
        <TextField
          label="Cost"
          type="number"
          min={0}
          max={MAX_ITEM_COST}
          value={values.cost}
          onChange={set("cost")}
          placeholder="0"
          disabled={blocked}
        />

        <SelectMenu
          label="Coin"
          options={COST_OPTIONS}
          value={values.costUnit}
          onChange={(unit) =>
            setValues((held) => ({ ...held, costUnit: unit }))
          }
          disabled={blocked}
        />

        <TextField
          label="Weight (lb)"
          type="number"
          min={0}
          max={MAX_ITEM_WEIGHT}
          step="0.01"
          value={values.weight}
          onChange={set("weight")}
          placeholder="0"
          disabled={blocked}
        />

        <TextField
          label="Armour class"
          type="number"
          min={0}
          max={MAX_ITEM_ARMOR_CLASS}
          value={values.armorClass}
          onChange={set("armorClass")}
          placeholder="0"
          disabled={blocked}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Damage"
          value={values.damageDice}
          maxLength={MAX_ITEM_DICE_LENGTH}
          onChange={set("damageDice")}
          placeholder="1d8"
          disabled={blocked}
        />

        <TextField
          label="Damage type"
          value={values.damageType}
          maxLength={MAX_ITEM_DAMAGE_TYPE_LENGTH}
          onChange={set("damageType")}
          placeholder="Slashing"
          disabled={blocked}
        />

        <TextField
          label="Properties"
          value={values.properties}
          maxLength={MAX_ITEM_PROPERTIES_LENGTH}
          onChange={set("properties")}
          placeholder="Versatile, Finesse"
          disabled={blocked}
        />
      </div>

      <TextAreaField
        label="Description"
        rows={3}
        value={values.description}
        maxLength={MAX_ITEM_DESCRIPTION_LENGTH}
        onChange={set("description")}
        placeholder="What it is, and what it does."
        hint={`${values.description.length} / ${MAX_ITEM_DESCRIPTION_LENGTH}`}
        disabled={blocked}
      />

      <FormAlert id={FEEDBACK_ID}>{error}</FormAlert>
      <FormAlert tone="success">{note}</FormAlert>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={blocked || values.name.trim().length === 0}
        >
          {isPending ? "Writing…" : "Write it down"}
        </Button>
      </div>
    </form>
  );
}
