import { formatModifier } from "sina/rules/skills";

import { abilityEmblem, withAlpha } from "./character-presentation";

/**
 * One ability score, drawn the same way wherever it is read: the sheet, the
 * table's scores panel above the map, and the creation sheet's stepper, which
 * borrows the meta line alone.
 *
 * `Base` used to lead that line and is gone. The score itself is printed on the
 * card, so the two said the same thing twice — and what a table actually asks
 * mid-turn is the modifier and the save, which now has the room.
 *
 * No `"use client"`: the sheet renders this on the server, and the creation
 * sheet pulls it into its own bundle. The arithmetic is the caller's, so this
 * decides nothing but how a number looks.
 *
 * `field` is the score as something you can TYPE IN rather than read. A node
 * and not a flag, so the client component that carries a Server Action is
 * imported by the one page that has a table behind it.
 */
export default function AbilityCard({
  ability,
  total,
  modifier,
  save,
  field = null,
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gold/15 bg-surface/25 px-3.5 py-3">
      <AbilityEmblem id={ability.id} />

      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-semibold tracking-wide text-ink/85 uppercase">
          {ability.name}
        </p>

        <AbilityMeta modifier={modifier} save={save} className="mt-0.5" />
      </div>

      {field ?? (
        <p className="shrink-0 text-right font-display text-xl font-semibold text-ink tabular-nums">
          {total}
        </p>
      )}
    </div>
  );
}

/**
 * What the score grants, and the saving throw beside it where the path is
 * proficient. `save` is null for the other four abilities — see
 * `getSavingThrowBonus`, which draws that line rather than handing back a bare
 * modifier nobody can tell apart from a bonus.
 *
 * Gold on the save alone: everything a character is PROFICIENT in wears it on
 * this sheet — the skills list marks its own the same way — so the colour is
 * the fact rather than decoration.
 */
export function AbilityMeta({ modifier, save, className = "" }) {
  return (
    <p className={`font-mono text-[0.65rem] text-ink/45 ${className}`}>
      Mod {formatModifier(modifier)}
      {save !== null && save !== undefined && (
        <>
          {/* The separator is punctuation and not a word: read aloud, "Mod +1
              Save +3" is the sentence, and a middle dot in it is noise. */}
          <span aria-hidden="true"> · </span>
          <span className="font-medium text-gold/90">
            Save {formatModifier(save)}
          </span>
        </>
      )}
    </p>
  );
}

/** The ability's mark, in the ring the sheet's cards set it in. */
function AbilityEmblem({ id }) {
  const { accent, clip } = abilityEmblem(id);

  return (
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
  );
}
