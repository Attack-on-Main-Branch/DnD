"use client";

import {
  MAX_GRID_LUMINANCE,
  MIN_GRID_LUMINANCE,
  MIN_GRID_SIZE,
} from "sina/rules/grid";

import { useTableMaps } from "./table-maps";

/**
 * The three controls that rule a map, above the shelf they apply to.
 *
 * DEFERRED COMMIT on both sliders: a drag is two hundred frames, so it paints
 * locally and the RELEASE writes — `onPointerUp` for a pointer, `onKeyUp` for
 * the arrow keys, which would otherwise never commit. The toggle does both at
 * once, a press being its own release.
 */

/** Short of the column's ceiling: past this a hex outgrows most maps. */
const MAX_SLIDER_SIZE = 180;

export default function GridRibbon() {
  const { activeId, grid, ruleGrid, commitGrid } = useTableMaps();

  if (!activeId) {
    return null;
  }

  /* One handler for both sliders: paint now, write on release. */
  const settle = () => commitGrid();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2.5">
      <button
        type="button"
        onClick={() => {
          // The same patch to both, or the commit reads the value it replaces.
          const patch = { grid_enabled: !grid.enabled };

          ruleGrid(patch);
          commitGrid(patch);
        }}
        aria-pressed={grid.enabled}
        className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 font-display text-[11px] font-semibold tracking-[0.16em] uppercase transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          grid.enabled
            ? "border-gold bg-gold/20 text-gold shadow-[0_0_10px_var(--gold-40)]"
            : "border-gold/25 text-ink/60 hover:border-gold/50 hover:text-gold"
        }`}
      >
        Hex grid
      </button>

      {/* Dimmed rather than removed: a ribbon that changed height when it was
          switched on would move the whole shelf under it. */}
      <div
        className={`flex min-w-0 flex-1 flex-wrap items-center gap-4 transition-opacity duration-300 ${
          grid.enabled ? "opacity-100" : "pointer-events-none opacity-40"
        }`}
      >
        <label className="flex min-w-40 flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-ink/50 uppercase">
            Size
          </span>

          <input
            type="range"
            min={MIN_GRID_SIZE}
            max={MAX_SLIDER_SIZE}
            step={1}
            value={grid.size}
            disabled={!grid.enabled}
            onChange={(event) =>
              ruleGrid({ grid_size: Number(event.target.value) })
            }
            onPointerUp={settle}
            onKeyUp={settle}
            aria-label="Hex size"
            className="range-gold min-w-0 flex-1"
          />

          <span className="w-9 shrink-0 text-right font-mono text-[10px] text-ink/45 tabular-nums">
            {grid.size}
          </span>
        </label>

        <label className="flex min-w-40 flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-ink/50 uppercase">
            Ink
          </span>

          {/* The track IS the answer: the handle stands on the grey it is
              about to draw with. */}
          <input
            type="range"
            min={MIN_GRID_LUMINANCE}
            max={MAX_GRID_LUMINANCE}
            step={0.01}
            value={grid.luminance}
            disabled={!grid.enabled}
            onChange={(event) =>
              ruleGrid({ grid_luminance: Number(event.target.value) })
            }
            onPointerUp={settle}
            onKeyUp={settle}
            aria-label="Grid contrast"
            className="range-gold range-greyscale min-w-0 flex-1 rounded-full border border-gold/20 bg-gradient-to-r from-black via-zinc-500 to-white"
          />
        </label>
      </div>
    </div>
  );
}
