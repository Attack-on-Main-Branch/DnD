import PlasmaBar from "./plasma-bar";

/**
 * One health bar: the readout, and the plasma track under it. Lifted out of the
 * character sheet so the table can show the same object rather than a second one
 * that merely looks like it.
 *
 * The track itself is plasma-bar.jsx, which experience borrows in another hue.
 * What stays here is the part that is about HIT POINTS — the heading, the unit
 * and the sentence a screen reader is given.
 *
 * Takes `tierClass` ready-made rather than deriving it, the way Avatar takes its
 * colour: `components/` never imports from a route directory.
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

      <PlasmaBar
        fraction={fraction}
        toneClass={tierClass}
        label={label}
        valueNow={current}
        valueMax={max}
        valueText={`${current} of ${max} hit points`}
        compact={compact}
        className={compact ? "mt-1" : "mt-3"}
      />
    </section>
  );
}
