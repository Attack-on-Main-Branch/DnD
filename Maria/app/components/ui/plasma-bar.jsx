/**
 * The track, the plasma fill and the two auras behind it — everything that makes
 * a bar in this app breathe, and nothing about what it is counting.
 *
 * THE PALETTE IS THE ONLY DIFFERENCE between health and experience: every colour
 * and duration is a custom property set by `toneClass`, so a second bar is a
 * class in globals.css. See `.hp-solar` and its siblings.
 *
 * `role="progressbar"` on the track, not the fill: a progressbar whose width
 * changes would be announced as though it were resizing.
 */
export default function PlasmaBar({
  fraction,
  toneClass,
  label,
  valueNow,
  valueMax,
  valueText,
  compact = false,
  className = "",
}) {
  const width = `${fraction * 100}%`;

  return (
    /* The near aura follows the fill; a glow under an empty track would be
       light coming from a value that is not there. */
    <div className={`hp-bar relative ${toneClass} ${className}`}>
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
        aria-valuenow={valueNow}
        aria-valuemin={0}
        aria-valuemax={valueMax}
        aria-valuetext={valueText}
        aria-label={label}
        className={`relative ${compact ? "h-2.5" : "h-3"} w-full overflow-hidden rounded-full border border-gold/15 bg-black/40 shadow-[inset_0_1px_3px] shadow-black/70`}
      >
        {/* Inline width: the value is only known at render. */}
        <div className="hp-fill h-full rounded-full" style={{ width }} />
      </div>
    </div>
  );
}
