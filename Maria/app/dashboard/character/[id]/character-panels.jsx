import {
  ABILITIES,
  abilityModifier,
  alignmentLabel,
  classLabel,
  formatModifier,
  healthFraction,
  healthTier,
  MAX_HP,
} from "sina/rules/character";

import HealthBar from "@/app/components/ui/health-bar";
import NoteList from "@/app/components/ui/note-list";
import {
  abilityEmblem,
  withAlpha,
} from "@/app/dashboard/character-presentation";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";
import { healthBarClass } from "@/app/dashboard/health-presentation";

/**
 * The four tab panels, as Server Components — none needs the browser. Inside
 * the client component all four shipped so one could be visible, and they took
 * `sina/rules/character` with them: a 400-line catalogue sent to render a
 * handful of short strings. The tabstrip receives them already rendered.
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

      <Health current={character.current_hp ?? MAX_HP} max={MAX_HP} />

      <AbilityScores character={character} />
    </div>
  );
}

/** The sheet's own reading of the shared bar. */
function Health({ current, max }) {
  return (
    <HealthBar
      current={current}
      max={max}
      fraction={healthFraction(current, max)}
      tierClass={healthBarClass(healthTier(current, max))}
    />
  );
}

/**
 * Read straight off the row, totals included — those are generated columns, so
 * this prints what the database holds rather than recomputing from the racial
 * table. The bonus is the difference between the two for the same reason: a
 * sheet that recomputed would hide a disagreement between the two tables.
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
        Skills
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

/**
 * Read-only, deliberately: an item is used, dropped or handed over at a table,
 * in front of whoever is running it. The pack above the map has the verbs.
 */
export function InventoryPanel({ items }) {
  if (items.length === 0) {
    return (
      <EmptyPack description="What you are given or pick up at a table will be here." />
    );
  }

  return (
    <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((row, index) => (
        <li key={row.id} className="flex">
          <PackItemCard
            item={rowItem(row)}
            index={index}
            quantity={row.quantity}
          />
        </li>
      ))}
    </ul>
  );
}

/** What this character's player wrote at the table. */
export function NotesPanel({ notes }) {
  return (
    <NoteList
      notes={notes}
      emptyTitle="No notes yet"
      emptyDescription="Notes written at the table appear here."
    />
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
