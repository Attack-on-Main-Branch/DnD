"use client";

import { useRef, useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import SelectField from "@/app/components/ui/select-field";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";

import { createPlayerCharacter } from "./actions";
import {
  ALIGNMENTS,
  MAX_NAME_LENGTH,
  MAX_PROSE_LENGTH,
  RACES,
  readCharacterValues,
  validateCharacter,
} from "./character-schema";

const FEEDBACK_ID = "character-feedback";

const RACE_OPTIONS = RACES.map((race) => ({ value: race, label: race }));

export default function PlayerCharacterForm({ onBack, onCreated }) {
  // Controlled throughout: a rejected handle must not cost the user the
  // backstory they just wrote.
  const [name, setName] = useState("");
  const [discriminator, setDiscriminator] = useState("");
  const [race, setRace] = useState(RACES[0]);
  const [alignment, setAlignment] = useState("");
  const [backstory, setBackstory] = useState("");
  const [personality, setPersonality] = useState("");

  const nameRef = useRef(null);

  const { state, formAction, isPending } = useFormAction({
    action: createPlayerCharacter,
    read: readCharacterValues,
    validate: validateCharacter,
    onResult: (result) => {
      if (result?.kind === "success") {
        onCreated();
      }
    },
    refocusRef: nameRef,
  });

  const describedBy = state?.message ? FEEDBACK_ID : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <TextField
          label="Name"
          name="name"
          type="text"
          autoComplete="off"
          placeholder="Elminster"
          required
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isPending}
          invalid={state?.field === "name"}
          inputRef={nameRef}
          aria-describedby={describedBy}
        />

        <TextField
          label="Tag"
          name="discriminator"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0451"
          required
          maxLength={4}
          value={discriminator}
          // Digits only, so the field cannot hold something the tag rule will
          // reject a moment later.
          onChange={(event) =>
            setDiscriminator(event.target.value.replace(/\D/g, "").slice(0, 4))
          }
          disabled={isPending}
          invalid={state?.field === "discriminator"}
          aria-describedby={describedBy}
        />
      </div>

      <p className="-mt-3 text-xs text-neutral-500">
        Your character is identified as{" "}
        <span className="font-mono">
          {name || "Name"}#{discriminator || "0000"}
        </span>{" "}
        — this is how a Dungeon Master will invite them to a party.
      </p>

      <SelectField
        label="Race"
        name="race"
        options={RACE_OPTIONS}
        required
        value={race}
        onChange={(event) => setRace(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "race"}
        aria-describedby={describedBy}
      />

      <AlignmentPicker
        value={alignment}
        onChange={setAlignment}
        disabled={isPending}
        invalid={state?.field === "alignment"}
      />

      <TextAreaField
        label="Backstory"
        name="backstory"
        hint={`${backstory.length}/${MAX_PROSE_LENGTH}`}
        placeholder="Where do they come from, and what set them on the road?"
        rows={5}
        maxLength={MAX_PROSE_LENGTH}
        value={backstory}
        onChange={(event) => setBackstory(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "backstory"}
        aria-describedby={describedBy}
      />

      <TextAreaField
        label="Personality"
        name="personality"
        hint={`${personality.length}/${MAX_PROSE_LENGTH}`}
        placeholder="Traits, ideals, bonds, flaws."
        rows={4}
        maxLength={MAX_PROSE_LENGTH}
        value={personality}
        onChange={(event) => setPersonality(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "personality"}
        aria-describedby={describedBy}
      />

      <FormAlert id={FEEDBACK_ID}>{state?.message}</FormAlert>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create character"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The nine alignments as a 3×3 grid of radios. A fieldset rather than a set of
 * buttons, so keyboard and screen-reader users get the grouping and the arrow
 * key behaviour they expect from a single choice.
 */
function AlignmentPicker({ value, onChange, disabled, invalid }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium">Alignment</legend>

      <div
        className={`mt-1.5 grid grid-cols-3 gap-2 rounded-lg ${
          invalid ? "ring-2 ring-red-500/40" : ""
        }`}
      >
        {ALIGNMENTS.map((option) => {
          const selected = value === option.value;

          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-3 text-center text-xs font-medium transition select-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-500 ${
                selected
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              <input
                type="radio"
                name="alignment"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
