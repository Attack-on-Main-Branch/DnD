/**
 * One health bar: a track, a plasma fill and the two auras behind it. Lifted
 * out of the character sheet so the table can show the same object rather than
 * a second one that merely looks like it.
 *
 * Takes `tierClass` ready-made rather than deriving it, the way Avatar takes
 * its colour: `components/` never imports from a route directory.
 *
 * `role="progressbar"` on the track, not the fill: a progressbar whose width
 * changes would be announced as though it were resizing.
 *
 * `compact` is the same object standing in a party card rather than on a sheet:
 * the heading goes, because the card already carries the name, and every gap
 * closes up. A variant and not a second bar, for the reason this file exists —
 * and the rail is up to six of these beside a 60vh map, so the height it saves
 * is what keeps the party on one screen.
 */
export default function HealthBar({
  current,
  max,
  fraction,
  tierClass,
  label = "Health",
  compact = false,
}) {
  const width = `${fraction * 100}%`;

  return (
    <section className="w-full">
      {compact ? (
        <p className="text-right font-mono text-[10px] leading-none text-ink/50 tabular-nums">
          {/* `leading-none` again on the span: a line box is sized by the
              tallest inline box in it, so the larger number brought its own
              default leading back and cost six pixels a card. */}
          <span className="text-[11px] leading-none text-gold">{current}</span>{" "}
          / {max} HP
        </p>
      ) : (
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="min-w-0 truncate font-display text-sm font-semibold tracking-wide text-ink/85">
            {label}
          </h3>

          <p className="shrink-0 font-mono text-xs text-ink/50 tabular-nums">
            <span className="text-sm text-gold">{current}</span> / {max} HP
          </p>
        </div>
      )}

      {/* The near aura follows the fill; a glow under an empty track would be
          light coming from health that is not there. */}
      <div
        className={`hp-bar relative ${compact ? "mt-1" : "mt-3"} ${tierClass}`}
      >
        <span
          aria-hidden="true"
          className="hp-aura hp-aura-wide pointer-events-none absolute -inset-x-0 -inset-y-0.3 rounded-full blur-lg"
        />
        <span
          aria-hidden="true"
          className="hp-aura pointer-events-none absolute left-0 -inset-y-0.5 rounded-full blur-lg"
          style={{ width }}
        />

        <div
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={`${current} of ${max} hit points`}
          aria-label={label}
          className={`relative ${compact ? "h-2.5" : "h-3"} w-full overflow-hidden rounded-full border border-gold/15 bg-black/40 shadow-[inset_0_1px_3px] shadow-black/70`}
        >
          {/* Inline width: the value is only known at render. */}
          <div className="hp-fill h-full rounded-full" style={{ width }} />
        </div>
      </div>
    </section>
  );
}
