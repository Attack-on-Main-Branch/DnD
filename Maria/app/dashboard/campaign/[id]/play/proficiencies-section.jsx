import { surfaceClasses } from "@/app/components/ui/surface";

/**
 * What a path is trained to wear, hold and use, as two lists of pills.
 *
 * ARMOUR IS ITS OWN LIST because a Wizard's answer is "none" and that is worth a
 * pill of its own rather than an empty row — knowing somebody has no armour
 * proficiency is exactly as useful as knowing they have three.
 *
 * The weapons and the tools share a row: a table asks "what can they swing",
 * and thieves' tools are an answer to that in the same breath as a rapier.
 *
 * No `"use client"` and no hooks. Nothing here moves without a route render —
 * the path decides it — so this renders on the server and the drawer around it
 * holds the numbers that do.
 */
const PILL_CLASSES =
  "inline-flex items-center rounded-full border px-2 py-0.5 " +
  "font-mono text-[10px] tracking-[0.12em] uppercase";

/** Slate for what is worn, gold for what is held: the pack's own division. */
const ARMOR_PILL = `${PILL_CLASSES} border-slate-400/30 bg-slate-400/10 text-slate-200/90`;

const WEAPON_PILL = `${PILL_CLASSES} border-gold/25 bg-gold/10 text-gold/85`;

/** Nothing at all, which is a fact rather than an absence. */
const NONE_PILL = `${PILL_CLASSES} border-ink/20 bg-black/30 text-ink/45`;

export default function ProficienciesSection({ proficiencies }) {
  const { armor, weapons, tools, qualifier } = proficiencies;

  return (
    <section
      aria-label="Proficiencies"
      className={surfaceClasses({
        variant: "plain",
        className: "flex flex-col gap-2.5 rounded-xl p-3",
      })}
    >
      <Group
        label="Armor"
        /* The condition rides beside the heading rather than inside each pill:
           "Light Armor (non-metal)" three times says one thing three times, and
           a Druid's refusal is about the whole line. */
        note={qualifier?.armor}
      >
        {armor.length === 0 ? (
          <li>
            <span className={NONE_PILL}>No Armor</span>
          </li>
        ) : (
          armor.map((one) => (
            <li key={one}>
              <span className={ARMOR_PILL}>{one}</span>
            </li>
          ))
        )}
      </Group>

      <Group label="Weapons & Tools">
        {weapons.length + tools.length === 0 ? (
          <li>
            <span className={NONE_PILL}>None</span>
          </li>
        ) : (
          [...weapons, ...tools].map((one) => (
            <li key={one}>
              <span className={WEAPON_PILL}>{one}</span>
            </li>
          ))
        )}
      </Group>
    </section>
  );
}

function Group({ label, note, children }) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-[0.16em] text-ink/45 uppercase">
        {label}
        {note && (
          <span className="ml-1.5 text-ink/35 normal-case">({note})</span>
        )}
      </p>

      <ul className="mt-1.5 flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}
