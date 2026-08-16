"use client";

import { useRef, useState } from "react";

import Avatar from "@/app/components/ui/avatar";
import Button from "@/app/components/ui/button";
import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import FormAlert from "@/app/components/ui/form-alert";
import SelectMenu from "@/app/components/ui/select-menu";
import SelectionDot from "@/app/components/ui/selection-dot";
import {
  NESTED_CARD_CLASSES,
  NESTED_CARD_SELECTED_CLASSES,
} from "@/app/components/ui/surface";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";

import {
  ALIGNMENTS,
  countCharacters,
  MAX_PROSE_LENGTH,
  RACES,
  classDetails,
  readCharacterValues,
  validateCharacter,
} from "sina/rules/character";

import { createPlayerCharacter } from "./actions";
import {
  avatarColorClass,
  AVATAR_COLORS,
  characterInitials,
  suggestedAvatarColor,
} from "./character-presentation";
import ClassPicker from "./class-picker";

const FEEDBACK_ID = "character-feedback";

const RACE_OPTIONS = RACES.map((race) => ({ value: race, label: race }));

export default function PlayerCharacterForm({ onBack, onCreated }) {
  // Controlled throughout: a rejected handle must not cost the user the
  // backstory they just wrote.
  const [name, setName] = useState("");
  const [discriminator, setDiscriminator] = useState("");
  const [race, setRace] = useState(RACES[0]);
  const [archetype, setArchetype] = useState("");
  const [classId, setClassId] = useState("");
  const [alignment, setAlignment] = useState("");
  const [colorTheme, setColorTheme] = useState(null);
  const [backstory, setBackstory] = useState("");
  const [personality, setPersonality] = useState("");

  const nameRef = useRef(null);

  // Until the user picks one, the colour follows the name — so the preview is
  // never a placeholder grey, and two characters rarely start out alike.
  const effectiveColor = colorTheme ?? suggestedAvatarColor(name);

  const chosenClass = classDetails(classId);

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
        <Avatar
          initials={characterInitials(name || "?")}
          colorClass={avatarColorClass(effectiveColor)}
          size="lg"
        />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold tracking-wide">
            {name || "New character"}
          </p>
          <p className="font-mono text-xs text-ink/50">
            {name || "Name"}#{discriminator || "0000"}
          </p>

          {/*
            Appears only once there is a class to show. Race and path together
            are the one-line version of the sheet, so the preview says what the
            card will say before the character exists.
          */}
          {chosenClass && (
            <p className="mt-1 truncate font-display text-xs tracking-[0.1em] text-gold uppercase">
              {race} · {chosenClass.path.name}
            </p>
          )}
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

      <p className="-mt-3 text-xs text-ink/50">
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

      <ClassPicker
        archetype={archetype}
        classId={classId}
        onChange={(next) => {
          setArchetype(next.archetype);
          setClassId(next.classId);
        }}
        disabled={isPending}
        invalidField={state?.field}
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

      {/*
        No `maxLength` here, and the counters use `countCharacters`. The rule
        counts code points, matching Postgres `char_length`; the HTML attribute
        counts UTF-16 units, and no single value reconciles the two — the real
        ceiling silently halves the limit for emoji, twice it is too loose for
        everyone else. So `validateCharacter` governs alone, in the browser and
        again on the server. The discriminator keeps `maxLength={4}`: four ASCII
        digits count the same either way.
      */}
      <TextAreaField
        label="Backstory"
        name="backstory"
        hint={`${countCharacters(backstory)}/${MAX_PROSE_LENGTH}`}
        placeholder="Where do they come from, and what set them on the road?"
        rows={5}
        value={backstory}
        onChange={(event) => setBackstory(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "backstory"}
        aria-describedby={describedBy}
      />

      <TextAreaField
        label="Personality"
        name="personality"
        hint={`${countCharacters(personality)}/${MAX_PROSE_LENGTH}`}
        placeholder="Traits, ideals, bonds, flaws."
        rows={4}
        value={personality}
        onChange={(event) => setPersonality(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "personality"}
        aria-describedby={describedBy}
      />

      <FormAlert id={FEEDBACK_ID}>{state?.message}</FormAlert>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gold/15 pt-5">
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
 * The nine alignments as a 3×3 grid of radios, each carrying a one-line gloss.
 *
 * The film examples for the current pick used to appear in a panel underneath.
 * They are still on the character's own sheet, where there is room for them;
 * here they were a block that grew out of the grid the moment anything was
 * chosen, pushing the rest of the form down mid-decision.
 *
 * A fieldset rather than a row of buttons, so keyboard and screen-reader users
 * get the grouping and arrow-key behaviour they expect from a single choice.
 */
function AlignmentPicker({ value, onChange, disabled, invalid }) {
  return (
    <fieldset disabled={disabled}>
      <legend className={LABEL_CLASSES}>Alignment</legend>

      <div
        className={`mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3 ${
          invalid ? `rounded-lg ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {ALIGNMENTS.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 transition duration-300 select-none ${CHOICE_CARD_FOCUS_CLASSES} ${
                isSelected ? NESTED_CARD_SELECTED_CLASSES : NESTED_CARD_CLASSES
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

              {/*
                The same corner dot the path cards carry, for the same reason:
                without it "chosen" is a slightly different border colour, and
                that is the one signal a monochrome display cannot show.
              */}
              <span className="flex items-start justify-between gap-2">
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-gold" : ""
                  }`}
                >
                  {option.label}
                </span>
                <SelectionDot selected={isSelected} />
              </span>

              <span className="text-[0.7rem] leading-snug text-ink/60">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ColorPicker({ value, onChange, disabled, invalid }) {
  return (
    <fieldset disabled={disabled}>
      <legend className={LABEL_CLASSES}>Avatar colour</legend>

      <div
        className={`mt-1.5 flex flex-wrap gap-2 ${
          invalid ? `rounded-lg p-1 ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {AVATAR_COLORS.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              title={option.label}
              className={`cursor-pointer rounded-full p-0.5 transition ${CHOICE_CARD_FOCUS_CLASSES} ${
                isSelected
                  ? "ring-2 ring-gold ring-offset-2 dark:ring-offset-surface"
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
