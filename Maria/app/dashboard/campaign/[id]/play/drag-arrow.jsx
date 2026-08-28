"use client";

import { FEET_PER_HEX } from "sina/rules/grid";

import { hexDistance } from "@/lib/hex-math";

/**
 * The reach of a move, while it is being made: a line from where a token IS to
 * where the pointer is, and how far that is in feet.
 *
 * IN THE PICTURE'S OWN COORDINATES, like the grid under it: same `viewBox`,
 * same layer transform, so the line stays pinned at every zoom step.
 *
 * IT WEARS THE CHAIR'S OWN COLOUR — the dice colour that chair rolls in, which
 * is what every other thing a person does at this table is already marked with.
 * Gold is the head of the table's, who rolls the house's own dice.
 *
 * TWO LAYERS AND NOT ONE, which is what `DragDistance` below is for: the line
 * belongs UNDER the pieces, so an arrow across a crowded board runs behind the
 * faces rather than over them, and the figure belongs OVER them, or a move of
 * one cell puts the distance behind the very token that moved. table-map.jsx
 * renders one on each side of the tokens; nothing but tree order decides it.
 */

/** A shade off black, so a light colour reads over parchment, forest and water. */
const OUTLINE = "rgba(12, 9, 5, 0.85)";

/**
 * EVERY PART OF THIS ARROW IS MEASURED IN CELLS. The head always was — the shaft
 * was a fixed three screen pixels through `non-scaling-stroke`, so turning the
 * size up grew the head and left the line behind it a thread.
 *
 * THE DARK RIM IS ONE NUMBER for both. A stroke straddles the path it is on, so
 * a shaft drawn dark-then-colour shows `(dark - colour) / 2` of rim on each
 * side, while the head's stroke ate half its own width out of the fill and laid
 * the other half outside — a rim that read heavier than the shaft's at the same
 * declared width. `paint-order: stroke` puts the head's stroke UNDER its fill,
 * so half of it is covered and what stands out is exactly `RIM` again.
 */
const LINE_OF_A_CELL = 0.11;
const RIM_OF_A_CELL = 0.045;
const HEAD_OF_A_CELL = 0.5;

/**
 * How far off the piece's centre the shaft begins. A token covers
 * `TOKEN_OF_A_CELL / 2` of a cell — see table-map.jsx — so this clears its rim.
 *
 * IT IS WHAT MADE THE ARROW CLEAN. It used to start dead centre with a disc
 * marking the spot, which on a small piece was a line drawn straight through a
 * face and a dot on top of it; leaving the piece alone says the same thing with
 * nothing added.
 */
const TAIL_OF_A_CELL = 0.72;

/** Shorter than one cell there is nothing to say yet, and no room to say it. */
const SHORTEST_OF_A_CELL = 1.05;

export default function DragArrow({
  width,
  height,
  from,
  to,
  size,
  color,
  layerStyle,
}) {
  const drawn = reach(width, height, from, to, size);

  if (!drawn) {
    return null;
  }

  const { start, tip, angle } = drawn;

  const line = size * LINE_OF_A_CELL;
  const rim = size * RIM_OF_A_CELL;
  const head = size * HEAD_OF_A_CELL;

  /* The shaft stops short of the point, so the two meet in a single silhouette
     rather than the line showing through the head's own rim. */
  const shaftX = tip.x - Math.cos(angle) * head * 0.72;
  const shaftY = tip.y - Math.sin(angle) * head * 0.72;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={layerStyle}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="size-full"
      >
        {/* Drawn twice, dark underneath: a bright line over a bright map is one
            nobody can follow. */}
        <line
          x1={start.x}
          y1={start.y}
          x2={shaftX}
          y2={shaftY}
          stroke={OUTLINE}
          strokeWidth={line + rim * 2}
          strokeLinecap="round"
        />

        <line
          x1={start.x}
          y1={start.y}
          x2={shaftX}
          y2={shaftY}
          stroke={color}
          strokeWidth={line}
          strokeLinecap="round"
        />

        {/*
         * A triangle rather than a marker, which would inherit the stroke's
         * scaling instead of keeping its proportions against the cell.
         *
         * NARROW, at 2.7 radians off the point rather than 2.5: a broad head on
         * a long shaft reads as a signpost, and this is a hand showing a move.
         */}
        <polygon
          points={`${tip.x},${tip.y} ${
            tip.x + Math.cos(angle + 2.7) * head
          },${tip.y + Math.sin(angle + 2.7) * head} ${
            tip.x + Math.cos(angle - 2.7) * head
          },${tip.y + Math.sin(angle - 2.7) * head}`}
          fill={color}
          stroke={OUTLINE}
          strokeWidth={rim * 2}
          strokeLinejoin="round"
          // Under the fill, so the half that would have eaten into the colour is
          // covered and `rim` is all that stands out — the shaft's rim exactly.
          style={{ paintOrder: "stroke" }}
        />
      </svg>
    </div>
  );
}

/**
 * How far that is, in feet — and OVER the pieces rather than under them.
 *
 * Its own layer for the reason at the head of this file: at one cell the
 * midpoint of the move falls on the piece that is moving, and the figure was
 * being drawn behind a face. It rides in HTML rather than in the SVG because a
 * distance is read by a person rather than measured, so it counter-scales the
 * zoom and stays the same size on screen at every step.
 */
export function DragDistance({ width, height, from, to, size, layerStyle }) {
  const drawn = reach(width, height, from, to, size);

  // Cells or nothing: a board with no grid has no whole number of them to give.
  if (!drawn || !Number.isInteger(from.q) || !Number.isInteger(to.q)) {
    return null;
  }

  const { start, end } = drawn;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={layerStyle}
    >
      <span
        className="absolute font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-gold"
        style={{
          left: `${((start.x + end.x) / 2 / width) * 100}%`,
          top: `${((start.y + end.y) / 2 / height) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <span className="rounded-md border border-gold/40 bg-surface/90 px-1.5 py-0.5">
          {hexDistance(from, to) * FEET_PER_HEX} ft
        </span>
      </span>
    </div>
  );
}

/**
 * The geometry both halves are drawn from, worked out once each so the line and
 * the figure cannot disagree about where the move begins.
 *
 * Null for a move too short to draw — which is also how both layers agree to
 * show nothing rather than one of them drawing alone.
 */
function reach(width, height, from, to, size) {
  if (!from || !to) {
    return null;
  }

  const start = { x: from.x * width, y: from.y * height };
  const end = { x: to.x * width, y: to.y * height };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length < size * SHORTEST_OF_A_CELL) {
    return null;
  }

  const angle = Math.atan2(dy, dx);
  const tail = size * TAIL_OF_A_CELL;

  return {
    // Clear of the piece it comes from, and stopped short of the one it points
    // at — the arrow sits BETWEEN two tokens rather than across them.
    start: {
      x: start.x + Math.cos(angle) * tail,
      y: start.y + Math.sin(angle) * tail,
    },
    tip: {
      x: end.x - Math.cos(angle) * tail,
      y: end.y - Math.sin(angle) * tail,
    },
    end,
    angle,
  };
}
