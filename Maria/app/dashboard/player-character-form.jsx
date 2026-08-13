"use client";

import { useRef, useState } from "react";

import Avatar from "@/app/components/ui/avatar";
import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import SelectMenu from "@/app/components/ui/select-menu";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";

import {
  ALIGNMENTS,
  MAX_NAME_LENGTH,
  MAX_PROSE_LENGTH,
  RACES,
  readCharacterValues,
  validateCharacter,
} from "sina/rules/character";

import { createPlayerCharacter } from "./actions";
import { AVATAR_COLORS, suggestedAvatarColor } from "./character-presentation";

const FEEDBACK_ID = "character-feedback";

const RACE_OPTIONS = RACES.map((race) => ({ value: race, label: race }));

export default function PlayerCharacterForm({ onBack, onCreated }) {
  // Controlled throughout: a rejected handle must not cost the user the
  // backstory they just wrote.
  const [name, setName] = useState("");
  const [discriminator, setDiscriminator] = useState("");
  const [race, setRace] = useState(RACES[0]);
  const [alignment, setAlignment] = useState("");
  const [colorTheme, setColorTheme] = useState(null);
  const [backstory, setBackstory] = useState("");
  const [personality, setPersonality] = useState("");

  const nameRef = useRef(null);

  // Until the user picks one, the colour follows the name — so the preview is
  // never a placeholder grey, and two characters rarely start out alike.
  const effectiveColor = colorTheme ?? suggestedAvatarColor(name);

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
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} colorTheme={effectiveColor} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">
            {name || "New character"}
          </p>
          <p className="font-mono text-xs text-neutral-400">
            {name || "Name"}#{discriminator || "0000"}
          </p>
        </div>
      </div>

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

      <p className="-mt-3 text-xs text-neutral-400">
        This handle is how a Dungeon Master will invite your character to a
        party, so it has to be unique.
      </p>

      <SelectMenu
        label="Race"
        name="race"
        options={RACE_OPTIONS}
        value={race}
        onChange={setRace}
        disabled={isPending}
        invalid={state?.field === "race"}
        describedBy={describedBy}
      />

      <AlignmentPicker
        value={alignment}
        onChange={setAlignment}
        disabled={isPending}
        invalid={state?.field === "alignment"}
      />

      <ColorPicker
        value={effectiveColor}
        onChange={setColorTheme}
        disabled={isPending}
        invalid={state?.field === "colorTheme"}
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
 * The nine alignments as a 3×3 grid of radios, each carrying a one-line gloss,
 * with the film examples for the current pick in a panel underneath.
 *
 * Putting three examples inside all nine tiles was the other option; it turns
 * the grid into a wall of twenty-seven names that nobody reads, and on a phone
 * it is several screens tall.
 *
 * A fieldset rather than a row of buttons, so keyboard and screen-reader users
 * get the grouping and arrow-key behaviour they expect from a single choice.
 */
function AlignmentPicker({ value, onChange, disabled, invalid }) {
  const selected = ALIGNMENTS.find((entry) => entry.value === value) ?? null;

  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium">Alignment</legend>

      <div
        className={`mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3 ${
          invalid ? "rounded-lg ring-2 ring-red-500/40" : ""
        }`}
      >
        {ALIGNMENTS.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 transition select-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-500 ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              <input
                type="radio"
                name="alignment"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />

              <span
                className={`text-xs font-semibold ${
                  isSelected ? "text-indigo-700 dark:text-indigo-300" : ""
                }`}
              >
                {option.label}
              </span>
              <span className="text-[0.7rem] leading-snug text-neutral-600 dark:text-neutral-400">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>

      {selected && (
        <div
          // Politely announced, so a screen reader hears the examples after
          // choosing without being yanked out of the grid.
          aria-live="polite"
          className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <p className="text-sm font-semibold">{selected.label}</p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {selected.description}
          </p>

          <p className="mt-3 text-xs text-neutral-400">
            Plays like:{" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {selected.examples.join(" · ")}
            </span>
          </p>
        </div>
      )}
    </fieldset>
  );
}

function ColorPicker({ value, onChange, disabled, invalid }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-medium">Avatar colour</legend>

      <div
        className={`mt-1.5 flex flex-wrap gap-2 ${
          invalid ? "rounded-lg p-1 ring-2 ring-red-500/40" : ""
        }`}
      >
        {AVATAR_COLORS.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              title={option.label}
              className={`cursor-pointer rounded-full p-0.5 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-500 ${
                isSelected
                  ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="colorTheme"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                className={`block size-7 rounded-full ${option.className}`}
              />
              <span className="sr-only">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
