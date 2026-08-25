import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

import {
  CONCENTRATION_CHIP_CLASSES,
  LEVEL_TAG_CLASSES,
  RITUAL_CHIP_CLASSES,
  SCHOOL_TAG_CLASSES,
  levelBadge,
} from "./spell-presentation";

/**
 * The spell somebody pressed, read out in full — a panel of its own under the
 * book, drawn as the marks' box is so the two read as one thing opened twice.
 *
 * The order is the order a caster asks their questions in: what is it and off
 * which shelf, can I cast it now, can I reach, how long does it last and am I
 * holding it, what does it do to them — then the rule as written.
 *
 * No hooks: what is open is the drawer's business. The controls arrive as
 * children and sit under a rule at the foot, which is the only place the Cast
 * button appears.
 */
export default function SpellDetail({ spell, children }) {
  return (
    <section
      aria-label={spell.name}
      className={surfaceClasses({
        variant: "solid",
        glow: true,
        // Bounded and scrolling inside itself: this hangs under a panel that is
        // already 42vh tall, and Wish runs to two thousand characters.
        // `glass-unfiltered` for the reason the box above carries one — a
        // filtered surface goes on filtering at `opacity: 0`.
        className:
          "scroll-gold max-h-[min(20rem,34vh)] overflow-y-auto rounded-2xl px-5 py-4 text-left glass-unfiltered",
      })}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 font-display text-sm font-semibold tracking-wide text-gold">
          {spell.name}
        </h3>

        <span className={`shrink-0 ${LEVEL_TAG_CLASSES}`}>
          {levelBadge(spell.level)}
        </span>
      </div>

      {(spell.school || spell.concentration || spell.ritual) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {spell.school && (
            <span className={SCHOOL_TAG_CLASSES}>{spell.school}</span>
          )}

          {spell.concentration && (
            <span className={CONCENTRATION_CHIP_CLASSES}>Concentration</span>
          )}

          {spell.ritual && <span className={RITUAL_CHIP_CLASSES}>Ritual</span>}
        </div>
      )}

      {/* Fixed at three columns rather than wrapped: they are read as a row,
          and a duration under the casting time is one that gets missed. */}
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Cell label="Cast" value={spell.castingTime} />
        <Cell label="Range" value={spell.range} />
        <Cell label="Duration" value={spell.duration} />
      </dl>

      {(spell.damage || spell.attackSave) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {spell.damage && (
            <span className="font-mono font-semibold text-orange-300 tabular-nums">
              {spell.damage}
            </span>
          )}

          {spell.damage && spell.attackSave && (
            <span aria-hidden="true" className="text-ink/25">
              ·
            </span>
          )}

          {spell.attackSave && (
            <span className="font-mono tracking-wide text-ink/65">
              {spell.attackSave}
            </span>
          )}
        </p>
      )}

      {spell.components && (
        <p className="mt-3 text-xs leading-relaxed text-ink/70">
          <Label>Components</Label> {spell.components}
          {spell.material && (
            <span className="text-ink/45"> — {spell.material}</span>
          )}
        </p>
      )}

      {spell.description && (
        <p className="mt-3 text-xs leading-relaxed whitespace-pre-wrap text-ink/75">
          {spell.description}
        </p>
      )}

      {spell.higherLevel && (
        <div className="mt-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-ink/70">
            <Label>At higher levels</Label> {spell.higherLevel}
          </p>
        </div>
      )}

      {/* Last, because it answers a question nobody asks mid-turn. */}
      {spell.classes && (
        <p className="mt-3 text-[11px] text-ink/40">
          <Label>Classes</Label> {spell.classes}
        </p>
      )}

      {children && (
        <>
          <div aria-hidden="true" className={`mt-4 ${FADED_RULE_CLASSES}`} />
          <div className="mt-3">{children}</div>
        </>
      )}
    </section>
  );
}

/** An em dash rather than a blank, which would read as "no range" instead of
    "the range has not arrived". */
function Cell({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-ink/40 uppercase">
        {label}
      </dt>
      <dd className="truncate text-xs text-ink/80" title={value || undefined}>
        {value || "—"}
      </dd>
    </div>
  );
}

function Label({ children }) {
  return (
    <span className="font-mono text-[10px] tracking-[0.14em] text-gold/70 uppercase">
      {children}
    </span>
  );
}

export function EmptySpellbook({ title = "No spells are known", description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold/20 py-10 text-center">
      <p className="font-display text-base font-medium tracking-wide text-ink/80">
        {title}
      </p>
      <p className="max-w-sm px-4 text-xs text-ink/50">{description}</p>
    </div>
  );
}
