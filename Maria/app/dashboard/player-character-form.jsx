"use client";

import { useEffect, useRef, useState } from "react";

import Avatar from "@/app/components/ui/avatar";
import Link from "next/link";

import Button, { buttonClasses } from "@/app/components/ui/button";
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
  abilityScoresOf,
  ALIGNMENTS,
  countCharacters,
  DEFAULT_MAX_HP,
  MAX_PROSE_LENGTH,
  RACES,
  alignmentDetails,
  classDetails,
  defaultAbilityScores,
  readCharacterValues,
  validateCharacter,
} from "sina/rules/character";
import { MIN_LEVEL } from "sina/rules/level";

import { updateCharacter } from "@/app/actions/characters";

import AbilityPicker from "./ability-picker";
import { createPlayerCharacter } from "./actions";
import {
  avatarColorClass,
  AVATAR_COLORS,
  characterInitials,
  suggestedAvatarColor,
} from "./character-presentation";
import ClassPicker from "./class-picker";
import SkillPicker, { skillFormState } from "./skill-picker";

const FEEDBACK_ID = "character-feedback";

const RACE_OPTIONS = RACES.map((race) => ({ value: race, label: race }));

/**
 * The character sheet, whether it is being written for the first time or read
 * back and changed. One component and not two: the edit modal holds THIS form,
 * so the likeness is identity rather than a resemblance two files keep up.
 *
 * `character` is the row being edited, or null to make a new one, and
 * everything downstream reads off it — the action posted to, what the fields
 * start as, what the buttons say. `onCancel` is the modal's way out; without
 * one the footer falls back to the link a page-level sheet has. `onPending`
 * tells the modal a save is in flight, so it stops shutting mid-write.
 */
export default function PlayerCharacterForm({
  character = null,
  onDone,
  onCancel = null,
  onPending = null,
}) {
  const editing = Boolean(character);

  // Controlled throughout: a rejected handle must not cost the user the
  // backstory they just wrote.
  const [name, setName] = useState(character?.name ?? "");
  const [discriminator, setDiscriminator] = useState(
    character?.discriminator ?? "",
  );
  const [race, setRace] = useState(character?.race ?? RACES[0]);
  // A string, not a number: this is what is in the box, and an empty box is
  // the placeholder taken at its word rather than a zero.
  const [maxHp, setMaxHp] = useState(
    character ? String(character.max_hp ?? DEFAULT_MAX_HP) : "",
  );
  const [archetype, setArchetype] = useState(character?.archetype ?? "");
  const [classId, setClassId] = useState(character?.class_id ?? "");
  const [alignment, setAlignment] = useState(character?.alignment ?? "");
  const [abilities, setAbilities] = useState(() =>
    character ? abilityScoresOf(character) : defaultAbilityScores(),
  );
  const [skills, setSkills] = useState(() => skillFormState(character));
  const [colorTheme, setColorTheme] = useState(character?.color_theme ?? null);
  const [backstory, setBackstory] = useState(character?.backstory ?? "");
  const [personality, setPersonality] = useState(character?.personality ?? "");

  const nameRef = useRef(null);

  // Until the user picks one, the colour follows the name — so the preview is
  // never a placeholder grey, and two characters rarely start out alike.
  const effectiveColor = colorTheme ?? suggestedAvatarColor(name);

  const chosenClass = classDetails(classId);
  const chosenAlignment = alignmentDetails(alignment);

  const { state, formAction, isPending } = useFormAction({
    // Bound rather than posted as a hidden input: a hidden field is the
    // caller's to set, and this is the one value they must not choose.
    // `update_character` checks it against the session regardless.
    action: editing
      ? (_previous, formData) => updateCharacter(character.id, formData)
      : createPlayerCharacter,
    read: readCharacterValues,
    validate: validateCharacter,
    onResult: (result) => {
      if (result?.kind === "success") {
        onDone();
      }
    },
    refocusRef: nameRef,
  });

  // The same fact the fields disable themselves from, passed up to whatever is
  // holding the form.
  useEffect(() => {
    onPending?.(isPending);
  }, [isPending, onPending]);

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
            {name || (editing ? "Character" : "New character")}
          </p>
          <p className="font-mono text-xs text-ink/50">
            {name || "Name"}#{discriminator || "0000"}
          </p>

          {/*
            The one-line version of the sheet, so the preview says what the
            card will say before the character exists. It waits for a class or
            an alignment rather than showing on mount: race alone is a default
            nobody chose, and a line that is already there cannot register as
            an answer to the choice just made.

            Each part joins as it is picked, which is why this is a filtered
            list rather than three conditionals with separators between them.
          */}
          {(chosenClass || chosenAlignment) && (
            <p className="mt-1 truncate font-display text-xs tracking-[0.1em] text-gold uppercase">
              {[race, chosenClass?.path.name, chosenAlignment?.label]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {/*
            The alignment's film characters, in the handle's voice rather than
            the wordmark's — monospace and dim, so it reads as a footnote to the
            line above instead of competing with it. Not truncated: three names
            are the whole point, and wrapping costs one line at most.
          */}
          {chosenAlignment && (
            <p className="mt-1 font-mono text-xs text-ink/50">
              Plays like: {chosenAlignment.examples.join(" · ")}
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

      {/* The Name and Tag proportions above, repeated: the race is the long
          half of the row and the maximum is the short one, so the two rows
          line up down the sheet rather than each finding their own edge. */}
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
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

        <TextField
          label="Max HP"
          name="maxHp"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={`${DEFAULT_MAX_HP}`}
          maxLength={3}
          value={maxHp}
          // Digits only, like the tag above, so the field cannot hold what
          // the rule will refuse. Empty is allowed: `readMaxHitPoints` reads
          // an empty box as the placeholder.
          onChange={(event) =>
            setMaxHp(event.target.value.replace(/\D/g, "").slice(0, 3))
          }
          disabled={isPending}
          invalid={state?.field === "maxHp"}
          // Left, not centred: it sits under the tag in the same narrow
          // column, and the two read as one column only if they agree.
          className="tabular-nums"
          aria-describedby={describedBy}
        />
      </div>

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

      {/*
        After the class, because the archetype is what most people picture
        first and it is the choice the numbers are being spent to support.
        Before alignment, so the sheet finishes its mechanics before it asks
        about temperament.

        `race` goes in for the bonus badges only — the scores themselves are
        bought free of it.
      */}
      <AbilityPicker
        race={race}
        scores={abilities}
        onChange={setAbilities}
        disabled={isPending}
        invalidField={state?.field}
      />

      {/* Under the scores, because a skill is an ability plus training. The
          totals are printed on the character's own page; this asks what they
          are trained in. The level carries the proficiency bonus and is the
          Dungeon Master's to award, so it is read rather than asked for. */}
      <SkillPicker
        level={character?.level ?? MIN_LEVEL}
        skills={skills}
        onChange={setSkills}
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
        {/*
          Cancel, not Back. Inside the modal it is a button, because there is a
          sheet to shut and nowhere to go; on the page it is a link, because
          there is nothing behind that sheet to go back to any more — the empty
          slot that opened it named the role in the URL, so the only way out is
          the dashboard, and an anchor gets middle-click and open-in-new-tab for
          free.

          `prefetch={false}`: Next prefetches links on viewport entry, so merely
          opening this sheet would start fetching the page you just left.
          `/dashboard` is dynamic, so that payload could never be reused.
        */}
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : (
          <Link
            href="/dashboard"
            prefetch={false}
            className={buttonClasses({ variant: "secondary" })}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" disabled={isPending}>
          {editing
            ? isPending
              ? "Saving…"
              : "Save changes"
            : isPending
              ? "Creating…"
              : "Create character"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The nine alignments as a 3×3 grid of radios. A fieldset rather than a row of
 * buttons, so keyboard and screen-reader users get the grouping and arrow-key
 * behaviour a single choice implies.
 */
function AlignmentPicker({ value, onChange, disabled, invalid }) {
  return (
    <fieldset disabled={disabled}>
      <legend className={LABEL_CLASSES}>Alignment</legend>

      <div
        className={`mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-3 ${
          invalid ? `rounded-lg ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {ALIGNMENTS.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              // The path card's box, to the pixel: these two sections sit one
              // above the other, and a tighter card reads as a different
              // control asking a different question.
              className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition duration-300 select-none ${CHOICE_CARD_FOCUS_CLASSES} ${
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
                  className={`font-display text-base font-semibold tracking-wide transition-colors duration-300 ${
                    isSelected ? "text-gold" : "text-ink"
                  }`}
                >
                  {option.label}
                </span>
                <SelectionDot selected={isSelected} />
              </span>

              <span className="text-xs leading-relaxed text-pretty text-ink/50">
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
