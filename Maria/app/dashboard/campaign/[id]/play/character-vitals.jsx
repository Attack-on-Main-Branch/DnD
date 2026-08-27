"use client";

import {
  hitDicePool,
  hitDiceLabel,
  passivePerception,
} from "sina/rules/character-stats";
import { formatModifier } from "sina/rules/skills";

import { surfaceClasses } from "@/app/components/ui/surface";

import { useCharacterLevel, useHitDiceSpent } from "./table-state";

/**
 * Five figures a table asks for out loud and nothing else on this sheet
 * answers: what you roll first, how far you get, what you notice without
 * looking, how much room you take up, and what you have left in the pool.
 *
 * A READ-OUT AND NOTHING ELSE. The pool used to carry a Spend button, which put
 * the one control on the page inside a tile whose whole job was to be glanced
 * at — and a hit die is spent on a rest, which is the session panel's. What
 * moves the tally now is a long rest; `spend_hit_die` is still the door if a
 * control ever wants it back.
 *
 * FOUR OF THE FIVE ARE DERIVED and come in as `vitals` — race, path and the six
 * scores decide them, and none of those can change without a route render. The
 * fifth is a tally with a column, so it is read out of the store and moves under
 * a rest taken from any chair.
 *
 * The LEVEL comes out of the store too, and that is what makes the passive
 * perception and the pool follow an award without a refresh.
 *
 * NOTHING HERE ROLLS INITIATIVE. It is a bonus printed on a tile; the dice rail
 * beside the map is where a table throws it.
 */
const TILE_CLASSES =
  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg " +
  "border border-gold/20 px-2 py-2.5 text-center";

const VALUE_CLASSES =
  "font-display text-base leading-none font-semibold text-ink tabular-nums";

const LABEL_CLASSES =
  "font-mono text-[10px] leading-none tracking-[0.12em] text-ink/45 uppercase";

export default function CharacterVitals({ characterId, name, vitals }) {
  const level = useCharacterLevel(characterId);
  const spent = useHitDiceSpent(characterId);

  const pool = hitDicePool({ classId: vitals.classId, level, spent });
  const label = hitDiceLabel(pool);

  /* Recomputed here rather than handed over: the proficiency bonus moves with
     the rung, and the rung is in the store. */
  const perception = passivePerception({
    wisTotal: vitals.wisTotal,
    level,
    skills: vitals.skills,
  });

  return (
    <section
      aria-label={`${name}’s vitals`}
      className={surfaceClasses({
        variant: "plain",
        className: "rounded-xl p-2",
      })}
    >
      {/* Five across where there is room, and never fewer than two: a tile
          holding "Pass. Perc." needs 72px before it starts wrapping its own
          label onto three lines. */}
      {/* No glyphs. Five emoji across a 300px ribbon were five different
          drawing styles fighting the display face, and each one cost the figure
          beside it the room to be read. */}
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        <Tile
          value={formatModifier(vitals.initiative)}
          label="Init"
          reads={`Initiative ${formatModifier(vitals.initiative)}`}
        />

        <Tile
          value={`${vitals.speed} ft.`}
          label="Speed"
          reads={`Speed ${vitals.speed} feet`}
        />

        <Tile
          value={perception}
          label="Pass. Perc."
          reads={`Passive perception ${perception}`}
        />

        <Tile value={vitals.size} label="Size" reads={`Size ${vitals.size}`} />

        <Tile
          value={label ?? "—"}
          label="Hit dice"
          reads={
            label
              ? `Hit dice, ${pool.remaining} of ${pool.max} ${pool.die} remaining`
              : "No hit dice"
          }
        />
      </ul>
    </section>
  );
}

/**
 * One figure. The value and its label are `aria-hidden` and a sentence stands
 * behind them: "+2 Init" read out is two fragments and "Pass. Perc." is not a
 * word.
 */
function Tile({ value, label, reads }) {
  return (
    <li className={TILE_CLASSES}>
      <span aria-hidden="true" className={VALUE_CLASSES}>
        {value}
      </span>
      <span aria-hidden="true" className={LABEL_CLASSES}>
        {label}
      </span>
      <span className="sr-only">{reads}</span>
    </li>
  );
}
