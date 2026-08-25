"use client";

import { useState, useTransition } from "react";
import {
  MAX_CAMPAIGN_SPELLS,
  MAX_SPELL_CLASSES_LENGTH,
  MAX_SPELL_DESCRIPTION_LENGTH,
  MAX_SPELL_EFFECT_LENGTH,
  MAX_SPELL_FIELD_LENGTH,
  MAX_SPELL_HIGHER_LEVEL_LENGTH,
  MAX_SPELL_MATERIAL_LENGTH,
  MAX_SPELL_NAME_LENGTH,
  SPELL_LEVELS,
  SPELL_SCHOOLS,
} from "sina/rules/spells";

import Button from "@/app/components/ui/button";
import CheckField from "@/app/components/ui/check-field";
import FormAlert from "@/app/components/ui/form-alert";
import SelectMenu from "@/app/components/ui/select-menu";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import { spellLevelLabel } from "@/app/dashboard/spell-presentation";

import { writeCampaignSpell } from "./spell-actions";

/**
 * A spell written down in full: every field the SRD's own entries arrive with,
 * in the order a caster reads them.
 *
 * The NAME and the LEVEL are required — a spell with neither a key nor a shelf
 * is one the table can never find again. The rest is trimmed rather than judged.
 * No scaling table: an upcast homebrew spell throws the dice on its card.
 */

const FEEDBACK_ID = "campaign-spell-feedback";

const LEVEL_OPTIONS = SPELL_LEVELS.map((level) => ({
  value: String(level),
  label: spellLevelLabel(level),
}));

const SCHOOL_OPTIONS = SPELL_SCHOOLS.map((school) => ({
  value: school,
  label: school,
}));

const EMPTY = {
  name: "",
  level: "0",
  school: "",
  castingTime: "",
  range: "",
  duration: "",
  components: "",
  material: "",
  concentration: false,
  ritual: false,
  attackSave: "",
  damage: "",
  description: "",
  higherLevel: "",
  classes: "",
};

export default function SpellForm({ campaignId, written }) {
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const full = written >= MAX_CAMPAIGN_SPELLS;
  const blocked = isPending || full;

  const set = (field) => (event) =>
    setValues((held) => ({ ...held, [field]: event.target.value }));

  const pick = (field) => (value) =>
    setValues((held) => ({ ...held, [field]: value }));

  function write(event) {
    event.preventDefault();

    if (blocked) {
      return;
    }

    startTransition(async () => {
      const result = await writeCampaignSpell(campaignId, values);

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
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Name"
          value={values.name}
          maxLength={MAX_SPELL_NAME_LENGTH}
          onChange={set("name")}
          placeholder="Frost Lash"
          disabled={blocked}
          aria-describedby={FEEDBACK_ID}
        />

        <SelectMenu
          label="Level"
          options={LEVEL_OPTIONS}
          value={values.level}
          onChange={pick("level")}
          disabled={blocked}
        />

        <SelectMenu
          label="School"
          options={SCHOOL_OPTIONS}
          value={values.school}
          onChange={pick("school")}
          placeholder="Choose a school…"
          disabled={blocked}
        />
      </div>

      {/* The three a caster reads first, in the order the card prints them. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Casting time"
          value={values.castingTime}
          maxLength={MAX_SPELL_FIELD_LENGTH}
          onChange={set("castingTime")}
          placeholder="1 action"
          disabled={blocked}
        />

        <TextField
          label="Range"
          value={values.range}
          maxLength={MAX_SPELL_FIELD_LENGTH}
          onChange={set("range")}
          placeholder="30 feet"
          disabled={blocked}
        />

        <TextField
          label="Duration"
          value={values.duration}
          maxLength={MAX_SPELL_FIELD_LENGTH}
          onChange={set("duration")}
          placeholder="Instantaneous"
          disabled={blocked}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Components"
          value={values.components}
          maxLength={MAX_SPELL_FIELD_LENGTH}
          onChange={set("components")}
          placeholder="V, S, M"
          disabled={blocked}
        />

        <TextField
          label="Material"
          value={values.material}
          maxLength={MAX_SPELL_MATERIAL_LENGTH}
          onChange={set("material")}
          placeholder="A shard of river ice."
          disabled={blocked}
        />
      </div>

      {/* The two that change how a spell is PLAYED rather than what it does. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckField
          label="Concentration"
          checked={values.concentration}
          onChange={pick("concentration")}
          disabled={blocked}
        />

        <CheckField
          label="Ritual"
          checked={values.ritual}
          onChange={pick("ritual")}
          disabled={blocked}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Damage"
          value={values.damage}
          maxLength={MAX_SPELL_EFFECT_LENGTH}
          onChange={set("damage")}
          placeholder="3d6 Cold"
          disabled={blocked}
        />

        <TextField
          label="Attack or save"
          value={values.attackSave}
          maxLength={MAX_SPELL_EFFECT_LENGTH}
          onChange={set("attackSave")}
          placeholder="DEX save"
          disabled={blocked}
        />

        <TextField
          label="Classes"
          value={values.classes}
          maxLength={MAX_SPELL_CLASSES_LENGTH}
          onChange={set("classes")}
          placeholder="Wizard, Sorcerer"
          disabled={blocked}
        />
      </div>

      <TextAreaField
        label="Description"
        rows={4}
        value={values.description}
        maxLength={MAX_SPELL_DESCRIPTION_LENGTH}
        onChange={set("description")}
        placeholder="What happens when it is cast."
        hint={`${values.description.length} / ${MAX_SPELL_DESCRIPTION_LENGTH}`}
        disabled={blocked}
      />

      <TextAreaField
        label="At higher levels"
        rows={2}
        value={values.higherLevel}
        maxLength={MAX_SPELL_HIGHER_LEVEL_LENGTH}
        onChange={set("higherLevel")}
        placeholder="What a bigger slot buys."
        hint={`${values.higherLevel.length} / ${MAX_SPELL_HIGHER_LEVEL_LENGTH}`}
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
