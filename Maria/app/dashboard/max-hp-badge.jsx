import { raceAbilityBonus } from "sina/rules/character";
import { calculateMaxHP, hitDie } from "sina/rules/hp";

import { LABEL_CLASSES } from "@/app/components/ui/field-styles";
import { surfaceClasses } from "@/app/components/ui/surface";

/**
 * What this sheet's hit points come to, beside the race it is chosen next to.
 *
 * A read-out, not a field: the figure is the path, the rung and the
 * Constitution, and `characters_sync_max_hp` computes the same thing on the row.
 *
 * `px-3 py-2` and a 20px content row are the select menu's own geometry, so the
 * two columns of this grid stand at exactly the same height — see
 * `controlClasses`. The die and the modifier stack beside the number rather than
 * under it for the same reason: there is one line's worth of room.
 */
export default function MaxHpBadge({ race, classId, level = 1, abilities }) {
  const faces = hitDie(classId);
  const conTotal = (abilities?.con ?? 0) + raceAbilityBonus(race, "con");
  const conMod = Math.floor((conTotal - 10) / 2);

  const maxHp = calculateMaxHP({
    className: classId,
    level,
    conScore: conTotal,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL_CLASSES}>Max HP</span>

      <div
        className={surfaceClasses({
          variant: "plain",
          className: "flex items-center gap-2 rounded-lg px-3 py-2",
        })}
      >
        <p
          aria-live="polite"
          className="shrink-0 font-display text-base leading-5 font-semibold text-gold tabular-nums"
        >
          {maxHp ?? "—"}
        </p>

        {/* Two 10px lines: together they are the 20px the number stands in. */}
        <p className="min-w-0 truncate font-mono text-[0.6rem] leading-[0.625rem] text-ink/45">
          {faces === null ? (
            <>
              pick
              <br />a path
            </>
          ) : (
            <>
              d{faces}
              <br />
              CON {conMod >= 0 ? "+" : ""}
              {conMod}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
