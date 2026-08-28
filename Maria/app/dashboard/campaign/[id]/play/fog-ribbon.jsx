"use client";

import { MAX_FOG_BRUSH, MIN_FOG_BRUSH } from "sina/rules/fog";

import { useTableMaps } from "./table-maps";

/**
 * The darkness, and the brush that opens it — under the grid's ribbon, because
 * like the grid it rules whichever map is ON THE TABLE.
 *
 * A brush is picked up and put down, as a piece on the palette is. While one is
 * held the board is a canvas: no panning, no pieces, no ruler — see
 * table-map.jsx. Putting it down is the WRITE — see `takeBrush` in
 * table-maps.jsx.
 *
 * Not dimmed when the fog is down: painting a map before darkening it is a thing
 * worth being able to do.
 */
export default function FogRibbon() {
  const { activeId, fog, brush, takeBrush, fogSize, sizeBrush, switchFog } =
    useTableMaps();

  if (!activeId) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5">
      <button
        type="button"
        onClick={() => switchFog(!fog.enabled)}
        aria-pressed={fog.enabled}
        className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 font-display text-[11px] font-semibold tracking-[0.16em] uppercase transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          fog.enabled
            ? "border-gold bg-gold/20 text-gold shadow-[0_0_10px_var(--gold-40)]"
            : "border-gold/25 text-ink/60 hover:border-gold/50 hover:text-gold"
        }`}
      >
        Fog of war
      </button>

      {/* Only one can be in the hand. */}
      <div className="flex shrink-0 items-center gap-1.5">
        <BrushButton
          held={brush === "reveal"}
          tone="reveal"
          onHold={() => takeBrush(brush === "reveal" ? null : "reveal")}
        >
          Reveal
        </BrushButton>

        <BrushButton
          held={brush === "hide"}
          tone="hide"
          onHold={() => takeBrush(brush === "hide" ? null : "hide")}
        >
          Hide
        </BrushButton>
      </div>

      <label className="flex min-w-36 flex-1 items-center gap-2">
        <span className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-ink/50 uppercase">
          Brush
        </span>

        {/* No deferred commit, unlike the grid's two: this number is never
            written down. The stroke it sizes is what gets stored. */}
        <input
          type="range"
          min={MIN_FOG_BRUSH}
          max={MAX_FOG_BRUSH}
          step={1}
          value={fogSize}
          onChange={(event) => sizeBrush(Number(event.target.value))}
          aria-label="Fog brush width"
          className="range-gold min-w-0 flex-1"
        />

        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-ink/45 tabular-nums">
          {fogSize}
        </span>
      </label>
    </div>
  );
}

/** Lit in the colour of what it does. Literal class strings, both branches: a
    class built from a value is one Tailwind's scanner never sees. */
function BrushButton({ held, tone, onHold, children }) {
  const lit =
    tone === "hide"
      ? "border-rose-400 bg-rose-500/20 text-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.5)]"
      : "border-amber-300 bg-amber-400/20 text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.5)]";

  return (
    <button
      type="button"
      onClick={onHold}
      aria-pressed={held}
      className={`cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.16em] uppercase transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        held
          ? lit
          : "border-gold/25 text-ink/60 hover:border-gold/50 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
