import {
  alignmentLabel,
  classLabel,
  healthFraction,
  healthTier,
  MAX_HP,
} from "sina/rules/character";

import HealthBar from "@/app/components/ui/health-bar";
import NoteList from "@/app/components/ui/note-list";
import { CharacterStats } from "@/app/dashboard/character-stats";
import { rowItem } from "@/app/dashboard/inventory-presentation";
import PackItemCard, { EmptyPack } from "@/app/dashboard/pack-item-card";
import { healthBarClass } from "@/app/dashboard/health-presentation";

/**
 * The four tab panels, as Server Components — none needs the browser. Inside
 * the client component all four shipped so one could be visible, and took
 * `sina/rules/character` with them; the tabstrip receives them rendered.
 *
 * The scores and the skills live in character-stats.jsx, because the table
 * reads the same two sections — see play/ability-sheet.jsx.
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

      {/* The character's own maximum, falling back to the global ceiling only
          for a row written before the column existed. */}
      <Health
        current={character.current_hp ?? character.max_hp ?? MAX_HP}
        max={character.max_hp ?? MAX_HP}
      />

      <CharacterStats character={character} />
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
