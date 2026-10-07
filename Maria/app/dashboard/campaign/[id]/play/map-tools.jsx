"use client";

import { MAX_FOG_BRUSH, MIN_FOG_BRUSH } from "sina/rules/fog";
import {
  MAX_GRID_LUMINANCE,
  MIN_GRID_LUMINANCE,
  MIN_GRID_SIZE,
} from "sina/rules/grid";

import { MAP_CLASSES, MAP_DELAY } from "./entrance";
import { useTableMaps } from "./table-maps";

/**
 * What rules the map ON THE TABLE, in one bar under the board: the grid, then
 * the fog. The head of the table’s alone, and absent while a painted scene is
 * up — a scene takes no grid or fog.
 *
 * TWO HALVES THAT WRAP AS WHOLES. Each half keeps its own line together, and
 * the sliders give way before the bar breaks: one line wherever the board’s
 * column has room for it, the grid over the fog where it does not.
 */
export default function MapTools() {
  const shown = useMapToolsShown(true);

  if (!shown) {
    return null;
  }

  return (
    <div
      data-shrink
      className={`mx-auto flex w-full max-w-[56rem] flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 ${MAP_CLASSES}`}
      style={MAP_DELAY}
    >
      <GridTools />

      <FogTools />
    </div>
  );
}

/** Whether the bar is under the board — the stage leaves it room when it is. */
export function useMapToolsShown(canRule) {
  const { activeId, isScene } = useTableMaps();

  return Boolean(canRule && activeId && !isScene);
}

/** One half: its own line, never broken, whose sliders are what give way.
    The buttons are `whitespace-nowrap` for the same reason — a label that
    could wrap tells the bar this half is narrower than it can ever be. */
const GROUP_CLASSES = "flex items-center gap-2";

function toggleClasses(on) {
  return `shrink-0 cursor-pointer rounded-lg border px-2.5 py-1 font-display whitespace-nowrap text-[0.6875rem] font-semibold tracking-[0.16em] uppercase transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
    on
      ? "border-gold bg-gold/20 text-gold shadow-[0_0_10px_var(--gold-40)]"
      : "border-gold/25 text-ink/60 hover:border-gold/50 hover:text-gold"
  }`;
}

function ToolLabel({ dim = false, children }) {
  return (
    <span
      className={`ml-1 shrink-0 font-mono text-[0.625rem] tracking-[0.16em] text-ink/50 uppercase transition-opacity duration-300 ${
        dim ? "opacity-40" : ""
      }`}
    >
      {children}
    </span>
  );
}

/**
 * The three controls that rule a map — the bar's first half.
 *
 * DEFERRED COMMIT on both sliders: a drag is two hundred frames, so it paints
 * locally and the RELEASE writes — `onPointerUp` for a pointer, `onKeyUp` for
 * the arrow keys, which would otherwise never commit. The toggle does both at
 * once, a press being its own release.
 *
 * ONLY THE INK IS THE GRID'S. Size used to be locked with it, and that stopped
 * being right when a piece took its size from the cell whether or not the cell
 * is drawn — see the `cell` prop in table-map.jsx. The number is what the map
 * IS; the toggle only decides whether you can see it. Ink stays behind the
 * toggle because ink is the colour of a line, and with no lines there is
 * nothing for it to be.
 */

/** Short of the column's ceiling: past this a hex outgrows most maps. */
const MAX_SLIDER_SIZE = 180;

function GridTools() {
  const { grid, ruleGrid, commitGrid } = useTableMaps();

  /* One handler for both sliders: paint now, write on release. */
  const settle = () => commitGrid();

  return (
    <div className={`${GROUP_CLASSES} flex-[1.4]`}>
      <button
        type="button"
        onClick={() => {
          // The same patch to both, or the commit reads the value it replaces.
          const patch = { grid_enabled: !grid.enabled };

          ruleGrid(patch);
          commitGrid(patch);
        }}
        aria-pressed={grid.enabled}
        className={toggleClasses(grid.enabled)}
      >
        Hex grid
      </button>

      <label className="contents">
        <ToolLabel>Size</ToolLabel>

        <input
          type="range"
          min={MIN_GRID_SIZE}
          max={MAX_SLIDER_SIZE}
          step={1}
          value={grid.size}
          onChange={(event) =>
            ruleGrid({ grid_size: Number(event.target.value) })
          }
          onPointerUp={settle}
          onKeyUp={settle}
          // What it sizes is the cell AND the pieces standing in one.
          aria-label="Hex and token size"
          className="range-gold w-12 min-w-12 flex-[1.4]"
        />

        <span className="w-7 shrink-0 text-right font-mono text-[0.625rem] text-ink/45 tabular-nums">
          {grid.size}
        </span>
      </label>

      {/* Dimmed rather than removed: a bar that changed width when it was
          switched on would slide the fog along. */}
      <label className="contents">
        <ToolLabel dim={!grid.enabled}>Ink</ToolLabel>

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
          className={`range-gold range-greyscale w-12 min-w-12 flex-1 rounded-full border border-gold/20 bg-gradient-to-r from-black via-zinc-500 to-white transition-opacity duration-300 ${
            grid.enabled ? "opacity-100" : "pointer-events-none opacity-40"
          }`}
        />
      </label>
    </div>
  );
}

/**
 * The darkness, and the brush that opens it — the second half, because like
 * the grid it rules whichever map is ON THE TABLE.
 *
 * A brush is picked up and put down, as a piece on the palette is. While one is
 * held the board is a canvas: no panning, no pieces, no ruler — see
 * table-map.jsx. Putting it down is the WRITE — see `takeBrush` in
 * table-maps.jsx.
 *
 * Not dimmed when the fog is down: painting a map before darkening it is a thing
 * worth being able to do.
 */
function FogTools() {
  const { fog, brush, takeBrush, fogSize, sizeBrush, switchFog } =
    useTableMaps();

  return (
    <div className={`${GROUP_CLASSES} flex-1`}>
      <button
        type="button"
        onClick={() => switchFog(!fog.enabled)}
        aria-pressed={fog.enabled}
        className={toggleClasses(fog.enabled)}
      >
        Fog of war
      </button>

      {/* Only one can be in the hand. */}
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

      <label className="contents">
        <ToolLabel>Brush</ToolLabel>

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
          className="range-gold w-12 min-w-12 flex-1"
        />

        <span className="w-5 shrink-0 text-right font-mono text-[0.625rem] text-ink/45 tabular-nums">
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
      className={`shrink-0 cursor-pointer rounded-lg border px-2 py-1 font-mono whitespace-nowrap text-[0.625rem] tracking-[0.16em] uppercase transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        held
          ? lit
          : "border-gold/25 text-ink/60 hover:border-gold/50 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
