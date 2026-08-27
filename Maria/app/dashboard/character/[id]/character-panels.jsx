import {
  alignmentLabel,
  classLabel,
  healthFraction,
  healthTier,
  MAX_HP,
} from "sina/rules/character";
import { readSpellSlots } from "sina/rules/spellcasting";

import HealthBar from "@/app/components/ui/health-bar";
import NoteList from "@/app/components/ui/note-list";
import { CharacterStats } from "@/app/dashboard/character-stats";
import { healthBarClass } from "@/app/dashboard/health-presentation";
import { spellsByShelf } from "@/app/dashboard/spell-presentation";
import SpellSlotBar from "@/app/dashboard/spell-slot-bar";
import XpMeter from "@/app/dashboard/xp-meter";

import SheetFeatures from "./sheet-features";
import SheetPack from "./sheet-pack";
import SheetSpellbook from "./sheet-spellbook";

/**
 * The six tab panels, as Server Components — none of them needs the browser,
 * and the two that open something under a press hand that much over to a client
 * component of its own. Inside the client component all of them shipped so one
 * could be visible, and took `sina/rules/character` with them; the tabstrip
 * receives them rendered.
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

      {/* Last on the tab, under the skills, which is exactly where the table
          puts it on the scores sheet — see play/page.jsx. A read-out here as
          much as there: experience is awarded by whoever runs the session.

          Zero for a row written before the column existed. */}
      <XpMeter
        xp={character.xp ?? 0}
        level={character.level}
        name={character.name}
      />
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
 * What this character carries, and the bags and chests it can reach. The
 * drawing is the table's own — see sheet-pack.jsx — and read-only for the
 * reason given there.
 */
export function InventoryPanel({ items, containers, chestItems }) {
  return (
    <SheetPack items={items} containers={containers} chestItems={chestItems} />
  );
}

/**
 * What this character knows, and how many slots are left to cast it with.
 *
 * Both are worked out here rather than in the browser: `spellsByShelf` reads
 * every row's whole SRD entry to sort it, and `readSpellSlots` reaches through
 * the 5e casting matrix. Neither has any business travelling to a page that
 * only reads them out.
 */
export function SpellsPanel({ character, spells }) {
  const shelves = readSpellSlots(
    character.spell_slots,
    character.class_id,
    character.level,
  );

  return (
    <SheetSpellbook
      shelves={spellsByShelf(spells)}
      known={spells.length}
      /* Nothing at all for a path that casts nothing, which is what an empty
         shelf list means — a 5th-level Fighter gets no bar rather than an
         empty box. */
      slots={shelves.length > 0 ? <SpellSlotBar shelves={shelves} /> : null}
    />
  );
}

/**
 * What this character can do that no other tab describes. A Client Component
 * whole: the list is written to and struck from without the route rendering
 * again — see sheet-features.jsx.
 */
export function FeaturePanel({ characterId, features }) {
  return <SheetFeatures characterId={characterId} features={features} />;
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
