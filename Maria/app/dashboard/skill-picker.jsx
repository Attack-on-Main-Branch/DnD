"use client";

import { ABILITIES, formatModifier } from "sina/rules/character";
import {
  parseSkillBonus,
  proficiencyBonus,
  skillBonusFieldName,
  skillFieldName,
  skillsForAbility,
  skillsOf,
} from "sina/rules/skills";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  controlClasses,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import SelectionDot from "@/app/components/ui/selection-dot";
import {
  NESTED_CARD_CLASSES,
  NESTED_CARD_SELECTED_CLASSES,
} from "@/app/components/ui/surface";

import { abilityEmblem, withAlpha } from "./character-presentation";

/**
 * The eighteen skills, one column per ability.
 *
 * `bonus` is what is in the box as a string, and an empty box is the whole of
 * "nothing was typed". What goes in it is an extra rather than a total: the
 * character's own page adds the ability and the proficiency bonus to it, so a
 * `0` behind the placeholder is the honest default.
 *
 * `readSkills` in sina/rules/skills reads the inputs back, so the DOM is what
 * submits and this only drives it.
 */
export function skillFormState(character) {
  return Object.fromEntries(
    Object.entries(skillsOf(character)).map(([id, entry]) => [
      id,
      {
        proficient: entry.proficient,
        bonus: entry.custom_bonus === null ? "" : String(entry.custom_bonus),
      },
    ]),
  );
}

const EMPTY = { proficient: false, bonus: "" };

/** Digits and a leading minus, so the box cannot hold a bonus that is not one. */
function sanitizeBonus(text) {
  const negative = text.trimStart().startsWith("-");
  const digits = text.replace(/\D/g, "").slice(0, 2);

  return `${negative ? "-" : ""}${digits}`;
}

export default function SkillPicker({
  level,
  skills,
  onChange,
  disabled,
  invalidField,
}) {
  const bonus = proficiencyBonus(level);
  const invalid = invalidField === "skills";

  function update(id, changes) {
    onChange({ ...skills, [id]: { ...(skills[id] ?? EMPTY), ...changes } });
  }

  return (
    <fieldset disabled={disabled} className="@container min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <legend className={LABEL_CLASSES}>Skills</legend>

        <p
          aria-live="polite"
          aria-atomic="true"
          className="font-mono text-xs tracking-[0.16em] text-ink/60 uppercase"
        >
          Proficiency:{" "}
          <span className="text-gold">{formatModifier(bonus)}</span>
        </p>
      </div>

      {/*
        A column per ability rather than a grid of eighteen: the five fit across
        the sheet, and reading down one of them is reading the group.

        Container queries, not the viewport's: this same form is the creation
        panel at the width of the page and the edit sheet inside a modal, and
        a media query cannot tell those apart. The steps are the width a card
        needs for a skill name beside its box, times the columns.
      */}
      <div
        className={`mt-2 grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @6xl:grid-cols-5 ${
          invalid ? `rounded-lg p-1 ${INVALID_GROUP_CLASSES}` : ""
        }`}
      >
        {ABILITIES.map((ability) => {
          const group = skillsForAbility(ability.id);

          // Constitution has no skills, and that is the rule rather than a gap.
          if (group.length === 0) {
            return null;
          }

          const { accent, clip } = abilityEmblem(ability.id);

          return (
            <section key={ability.id} className="flex flex-col gap-2">
              <header className="flex items-center justify-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0"
                  style={{
                    background: accent,
                    clipPath: clip,
                    filter: `drop-shadow(0 0 6px ${withAlpha(accent, 0.35)})`,
                  }}
                />

                {/* 10px: at a fifth of the sheet, INTELLIGENCE is the width the
                    column has to hold, and text-xs does not clear it. */}
                <h3 className="truncate font-display text-[10px] font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  {ability.name}
                </h3>
              </header>

              {group.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  state={skills[skill.id] ?? EMPTY}
                  onChange={(changes) => update(skill.id, changes)}
                />
              ))}
            </section>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * One skill. The whole card toggles the proficiency: the label is stretched
 * over it and the content sits above, so everything but the number box answers
 * a press and the focus ring lands around the card rather than inside it.
 */
function SkillCard({ skill, state, onChange }) {
  const { proficient, bonus } = state;

  /** A lone minus is not a number; an empty box is the placeholder again. */
  function settle() {
    if (bonus !== "" && parseSkillBonus(bonus) === null) {
      onChange({ bonus: "" });
    }
  }

  return (
    <div
      className={`relative flex items-center gap-1.5 rounded-lg border p-3 transition duration-300 ease-tray motion-reduce:transition-none ${
        proficient ? NESTED_CARD_SELECTED_CLASSES : NESTED_CARD_CLASSES
      }`}
    >
      <label
        className={`absolute inset-0 cursor-pointer rounded-lg ${CHOICE_CARD_FOCUS_CLASSES}`}
      >
        <input
          type="checkbox"
          name={skillFieldName(skill.id)}
          checked={proficient}
          onChange={(event) => onChange({ proficient: event.target.checked })}
          className="sr-only"
        />
        <span className="sr-only">Proficient in {skill.name}</span>
      </label>

      <span
        className={`pointer-events-none relative min-w-0 flex-1 font-display text-sm leading-snug font-semibold tracking-wide break-words transition-colors duration-300 ${
          proficient ? "text-gold" : "text-ink"
        }`}
      >
        {skill.name}
      </span>

      {/* Empty until somebody types in it, and what goes in is the extra: the
          ability and the proficiency are added to it on the character's page.
          `max-w`, not `w` — the base control is `w-full`, and which of two width
          utilities wins is a stylesheet's order to decide. */}
      <input
        type="text"
        inputMode="numeric"
        name={skillBonusFieldName(skill.id)}
        aria-label={`${skill.name} bonus`}
        placeholder="0"
        value={bonus}
        onChange={(event) =>
          onChange({ bonus: sanitizeBonus(event.target.value) })
        }
        onBlur={settle}
        className={controlClasses({
          className: "relative max-w-12 shrink-0 text-center tabular-nums",
        })}
      />

      {/* The corner dot the alignment cards carry, for the same reason: chosen
          is otherwise a slightly different border colour. */}
      <span className="pointer-events-none relative flex shrink-0">
        <SelectionDot selected={proficient} />
      </span>
    </div>
  );
}
