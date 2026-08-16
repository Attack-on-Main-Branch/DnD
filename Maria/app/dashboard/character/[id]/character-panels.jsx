import {
  alignmentDetails,
  alignmentLabel,
  classLabel,
} from "sina/rules/character";

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
  const alignment = alignmentDetails(character.alignment);

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

      {alignment && (
        <div className="rounded-lg border border-gold/15 bg-surface/25 px-4 py-3">
          <p className="text-sm text-ink/60">{alignment.description}</p>
          <p className="mt-2 text-xs text-ink/50">
            Plays like:{" "}
            <span className="font-medium text-ink/75">
              {alignment.examples.join(" · ")}
            </span>
          </p>
        </div>
      )}
    </div>
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
