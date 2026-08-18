import {
  ABILITIES,
  abilityModifier,
  alignmentLabel,
  classLabel,
  formatModifier,
} from "sina/rules/character";

import {
  abilityEmblem,
  withAlpha,
} from "@/app/dashboard/character-presentation";

/**
 * The four tab panels, as Server Components.
 *
 * None of them needs the browser — no state, no handlers, no effects, and two
 * are hard-coded placeholders. Inside the client component all four shipped so
 * one could be visible, and they took `sina/rules/character` with them: a
 * 400-line catalogue sent to render a handful of short strings.
 *
 * The tabstrip receives them already rendered. It still decides which one shows.
 */
export function OverviewPanel({ character, createdLabel }) {
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Fact label="Level" value={character.level} />
        <Fact label="Race" value={character.race} />
        {/* Null for the characters made before classes existed. */}
        <Fact
          label="Class"
          value={classLabel(character.class_id) ?? "Not chosen"}
        />
        <Fact label="Alignment" value={alignmentLabel(character.alignment)} />
        {/* Formatted on the server — see the note in page.jsx. */}
        <Fact label="Created" value={createdLabel} />
      </dl>

      <AbilityScores character={character} />
    </div>
  );
}

/**
 * The six scores as played: what was bought, what the race added, and the
 * modifier that comes out.
 *
 * Read straight off the row, including the totals — those are generated
 * columns, so the number here is the one the database holds rather than one
 * this page worked out again from the racial table. The bonus is the
 * difference between the two for the same reason: if the table in
 * `character.js` and the one in the migration ever disagreed, a sheet that
 * recomputed would hide it and this one shows it.
 */
function AbilityScores({ character }) {
  const scores = ABILITIES.map((ability) => {
    const base = character[`ability_${ability.id}`];
    const total = character[`ability_${ability.id}_total`];

    return { ...ability, base, total, bonus: total - base };
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
                <p className="mt-0.5 font-mono text-[0.65rem] text-ink/45">
                  Base {score.base}
                  {score.bonus > 0 ? ` · Race +${score.bonus}` : ""}
                </p>
              </div>

              <p className="shrink-0 text-right">
                <span className="font-display text-xl font-semibold text-ink tabular-nums">
                  {score.total}
                </span>{" "}
                <span className="font-mono text-xs text-gold/80 tabular-nums">
                  {formatModifier(abilityModifier(score.total))}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StoryPanel({ character }) {
  return (
    <div className="flex flex-col gap-6">
      <Prose title="Backstory" body={character.backstory} />
      <Prose title="Personality" body={character.personality} />
    </div>
  );
}

function Prose({ title, body }) {
  return (
    <section>
      <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
        {title}
      </h3>
      {body ? (
        <p className="mt-2 text-sm whitespace-pre-wrap text-ink/75">{body}</p>
      ) : (
        <p className="mt-2 text-sm text-ink/50 italic">Nothing written yet.</p>
      )}
    </section>
  );
}

/** Placeholder until items exist. */
export function InventoryPanel() {
  return (
    <EmptyPanel
      title="The pack is empty"
      description="Items, coin and equipment will live here once loot exists."
    />
  );
}

/** Placeholder until sessions exist to take notes during. */
export function NotesPanel() {
  return (
    <EmptyPanel
      title="No notes yet"
      description="Notes from playing will appear here."
    />
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold/20 py-14 text-center">
      <p className="font-display text-base font-medium tracking-wide text-ink/80">
        {title}
      </p>
      <p className="max-w-sm text-xs text-ink/50">{description}</p>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="font-sans text-xs text-ink/60">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
