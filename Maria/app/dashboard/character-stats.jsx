import {
  ABILITIES,
  abilityModifier,
  formatModifier,
  proficiencyBonus,
  SKILLS,
  skillState,
  skillTotal,
  skillsOf,
} from "sina/rules/character";

import {
  abilityEmblem,
  withAlpha,
} from "@/app/dashboard/character-presentation";

/**
 * The numbers half of a character sheet, kept here rather than in the sheet's
 * own panels because the table reads them too — see play/ability-sheet.jsx.
 *
 * Server Components, both: neither needs the browser, and `sina/rules/character`
 * is a 400-line catalogue that has no business travelling to it.
 */

/** Both sections, in printing order — the whole of a sheet's arithmetic. */
export function CharacterStats({ character }) {
  return (
    <>
      <AbilityScores character={character} />
      <SkillList character={character} />
    </>
  );
}

/**
 * Read straight off the row, totals included — those are generated columns, so
 * this prints what the database holds rather than recomputing from the racial
 * table, where a disagreement between the two would go unseen.
 */
function AbilityScores({ character }) {
  const scores = ABILITIES.map((ability) => {
    const base = character[`ability_${ability.id}`];
    const total = character[`ability_${ability.id}_total`];

    return { ...ability, base, total };
  });

  // Nothing to print for a row that predates the columns.
  if (scores.some((score) => typeof score.total !== "number")) {
    return null;
  }

  return (
    <section>
      <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
        Ability scores
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scores.map((score) => {
          const { accent, clip } = abilityEmblem(score.id);

          return (
            <div
              key={score.id}
              className="flex items-center gap-3 rounded-lg border border-gold/15 bg-surface/25 px-3.5 py-3"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/15 bg-white/5"
              >
                <span
                  className="size-5"
                  style={{
                    background: accent,
                    clipPath: clip,
                    filter: `drop-shadow(0 0 6px ${withAlpha(accent, 0.35)})`,
                  }}
                />
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-semibold tracking-wide text-ink/85 uppercase">
                  {score.name}
                </p>
                {/* The modifier of the TOTAL beside it: the racial bonus is
                    already in that number, and counting it again doubled it. */}
                <p className="mt-0.5 font-mono text-[0.65rem] text-ink/45">
                  {`Base ${score.base} · Mod ${formatModifier(
                    abilityModifier(score.total),
                  )}`}
                </p>
              </div>

              <p className="shrink-0 text-right font-display text-xl font-semibold text-ink tabular-nums">
                {score.total}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The eighteen, read off the row — from the generated `_total` columns, for
    the reason the scores above are. */
function SkillList({ character }) {
  const modifiers = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability.id,
      character[`ability_${ability.id}_total`],
    ]),
  );

  // Nothing to print for a row that predates the ability columns.
  if (Object.values(modifiers).some((total) => typeof total !== "number")) {
    return null;
  }

  const abbreviations = Object.fromEntries(
    ABILITIES.map((ability) => [ability.id, ability.abbr]),
  );
  const skills = skillsOf(character);
  const bonus = proficiencyBonus(character.level);

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Skills
        </h3>

        <p className="font-mono text-xs tracking-[0.16em] text-ink/60 uppercase">
          Proficiency:{" "}
          <span className="text-gold">{formatModifier(bonus)}</span>
        </p>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((skill) => {
          const state = skillState(skills, skill.id);

          return (
            <li
              key={skill.id}
              className="flex items-baseline gap-2 border-b border-gold/10 py-1.5"
            >
              {/* Shape as well as colour, the way the choosable cards mark a
                  selection: proficiency is the one fact this list adds. */}
              <span
                aria-hidden="true"
                className={`size-1.5 shrink-0 self-center rounded-full ${
                  state.proficient
                    ? "bg-gold shadow-[0_0_8px_-1px_rgba(255,223,156,0.9)]"
                    : "border border-ink/25"
                }`}
              />

              <span
                className={`truncate text-sm ${
                  state.proficient ? "font-medium text-gold" : "text-ink/75"
                }`}
              >
                {skill.name}
                {state.proficient && (
                  <span className="sr-only"> — proficient</span>
                )}
              </span>

              <span className="ml-auto shrink-0 font-mono text-[0.65rem] text-ink/45 uppercase">
                {abbreviations[skill.ability]}
              </span>

              <span className="w-8 shrink-0 text-right font-display text-sm font-semibold tabular-nums">
                {formatModifier(
                  skillTotal({
                    modifier: abilityModifier(modifiers[skill.ability]),
                    level: character.level,
                    proficient: state.proficient,
                    customBonus: state.custom_bonus,
                  }),
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
