"use client";

import { useRef, useState, useTransition } from "react";
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
import {
  ITEM_DOCUMENT_MIME_TYPE,
  itemDocumentFileError,
  validateItemDocument,
} from "sina/rules/item-document";

import { stopNavigationProgress } from "@/app/components/navigation-progress-control";
import Button from "@/app/components/ui/button";
import FormActions from "@/app/components/ui/form-actions";
import FormAlert from "@/app/components/ui/form-alert";
import SelectMenu from "@/app/components/ui/select-menu";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import {
  ITEM_DOCUMENT_COPY,
  ITEM_DOCUMENT_SIZE_LABEL,
} from "@/app/dashboard/item-document-copy";

import {
  beginItemDocumentUpload,
  discardItemDocumentUpload,
  editCampaignItem,
  writeCampaignItem,
} from "./item-actions";

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

/** A catalogue row back in the boxes it was written from; zero reads as empty. */
function fromRow(row) {
  return {
    name: row.name ?? "",
    category: row.category ?? "",
    cost: row.cost_quantity ? String(row.cost_quantity) : "",
    costUnit: row.cost_unit || "gp",
    weight: Number(row.weight) ? String(row.weight) : "",
    damageDice: row.damage_dice ?? "",
    damageType: row.damage_type ?? "",
    armorClass: row.armor_class ? String(row.armor_class) : "",
    properties: row.properties ?? "",
    description: row.description ?? "",
  };
}

/**
 * `editing` is the row being rewritten, or null for a new one; the caller keys
 * this form on it, so the boxes start from that row. `onDone` ends the edit.
 */
export default function ItemForm({
  campaignId,
  written,
  editing = null,
  onDone,
  notice = null,
}) {
  const [values, setValues] = useState(() =>
    editing ? fromRow(editing) : EMPTY,
  );
  const [error, setError] = useState(null);
  const [note, setNote] = useState(notice);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [removeDocument, setRemoveDocument] = useState(false);

  const full = !editing && written >= MAX_CAMPAIGN_ITEMS;
  const blocked = isPending || full;

  const set = (field) => (event) =>
    setValues((held) => ({ ...held, [field]: event.target.value }));

  function write(event) {
    event.preventDefault();

    if (blocked) {
      stopNavigationProgress();
      return;
    }

    startTransition(async () => {
      let uploaded = null;
      let saved = false;

      try {
        if (document) {
          const checked = validateItemDocument({
            name: document.name,
            html: await document.text(),
          });
          if (checked.error) {
            setError(ITEM_DOCUMENT_COPY[checked.error]);
            setNote(null);
            return;
          }

          const ticket = await beginItemDocumentUpload(campaignId, {
            name: document.name,
            size: document.size,
          });
          if (ticket.kind === "rejected") {
            setError(ticket.message);
            setNote(null);
            return;
          }

          uploaded = { name: document.name, path: ticket.path };
          const response = await fetch(ticket.url, {
            method: "PUT",
            headers: {
              "Content-Type": ITEM_DOCUMENT_MIME_TYPE,
              "Cache-Control": "max-age=0",
            },
            body: document,
            credentials: "omit",
          });
          if (!response.ok) throw new Error("Upload failed");
        }

        const result = editing
          ? await editCampaignItem(
              campaignId,
              editing.id,
              { ...values, removeDocument },
              uploaded,
            )
          : await writeCampaignItem(campaignId, values, uploaded);

        if (result?.kind === "rejected") {
          setError(result.message);
          setNote(null);
          return;
        }

        saved = true;
        if (editing) {
          onDone(`${result.name} is saved.`);
          return;
        }

        setValues(EMPTY);
        setDocument(null);
        setRemoveDocument(false);
        if (fileRef.current) fileRef.current.value = "";
        setError(null);
        setNote(`${result.name} is written down.`);
      } catch {
        setError(
          document
            ? ITEM_DOCUMENT_COPY.document_upload_failed
            : "Could not save that item. Try again.",
        );
        setNote(null);
      } finally {
        stopNavigationProgress();
        if (uploaded && !saved) {
          await discardItemDocumentUpload(campaignId, uploaded.path).catch(
            () => {},
          );
        }
      }
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

      <section className="rounded-xl border border-gold/20 bg-surface/30 p-4">
        <h3 className="font-display text-sm font-semibold tracking-wide text-gold">
          Checkable item
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-ink/55">
          Attach a self-contained HTML file, up to {ITEM_DOCUMENT_SIZE_LABEL}.
          Players can check it from their inventory. Include styles, scripts and
          pictures in the file.
        </p>
        <div className="mt-3">
          <TextField
            label={editing?.document_id ? "Replace HTML file" : "HTML file"}
            type="file"
            accept=".html,.htm,text/html"
            inputRef={fileRef}
            disabled={blocked}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              const error = file ? itemDocumentFileError(file) : null;

              if (error) {
                setError(ITEM_DOCUMENT_COPY[error]);
                event.target.value = "";
                setDocument(null);
                return;
              }

              setError(null);
              setDocument(file);
              if (file) setRemoveDocument(false);
            }}
          />
        </div>
        {(document || (editing?.document_id && !removeDocument)) && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-ink/65">
              Attached:{" "}
              {document?.name ?? editing.document?.name ?? "HTML file"}
            </p>
            <Button
              variant="ghost"
              disabled={blocked}
              onClick={() => {
                setDocument(null);
                setRemoveDocument(Boolean(editing?.document_id));
                fileRef.current.value = "";
              }}
            >
              Remove file
            </Button>
          </div>
        )}
        {removeDocument && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-ink/55">
              The file will be removed when saved.
            </p>
            <Button
              variant="ghost"
              disabled={blocked}
              onClick={() => setRemoveDocument(false)}
            >
              Undo
            </Button>
          </div>
        )}
      </section>

      <FormAlert id={FEEDBACK_ID}>{error}</FormAlert>
      <FormAlert tone="success">{note}</FormAlert>

      <FormActions
        editing={Boolean(editing)}
        pending={isPending}
        disabled={blocked || values.name.trim().length === 0}
        label="Write it down"
        pendingLabel={document ? "Uploading…" : "Writing…"}
        onCancel={() => onDone(null)}
      />
    </form>
  );
}
