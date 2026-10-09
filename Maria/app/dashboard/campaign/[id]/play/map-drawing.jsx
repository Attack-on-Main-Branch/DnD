"use client";

import { FEET_PER_HEX } from "sina/rules/grid";
import { DEFAULT_CONE_ANGLE, MAP_DRAWING_SHAPES } from "sina/rules/map-drawing";

import { hexDistance } from "@/lib/hex-math";
import { conePath, drawingGeometry } from "@/lib/map-drawing";

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
 * TWO LAYERS AND NOT ONE, which is what `DrawingDistance` below is for: the line
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

export default function MapDrawing({
  width,
  height,
  from,
  to,
  size,
  color,
  layerStyle,
  shape = MAP_DRAWING_SHAPES[0],
  angle: coneAngle = DEFAULT_CONE_ANGLE,
}) {
  const drawn = reach(width, height, from, to, size, shape);

  if (!drawn) {
    return null;
  }

  const { start, end: tip, angle } = drawn;

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
        {shape !== "arrow" ? (
          <>
            {[
              {
                stroke: OUTLINE,
                strokeWidth: line + rim * 2,
                fill: color,
                fillOpacity: 0.14,
              },
              { stroke: color, strokeWidth: line, fill: "none" },
            ].map((paint, index) =>
              shape === "circle" ? (
                <circle
                  key={index}
                  cx={start.x}
                  cy={start.y}
                  r={drawn.length}
                  {...paint}
                />
              ) : (
                <path
                  key={index}
                  d={conePath(drawn, coneAngle)}
                  strokeLinejoin="round"
                  {...paint}
                />
              ),
            )}
            {shape === "circle" && (
              <circle
                cx={start.x}
                cy={start.y}
                r={line}
                fill={color}
                stroke={OUTLINE}
                strokeWidth={rim * 2}
                style={{ paintOrder: "stroke" }}
              />
            )}
          </>
        ) : (
          <>
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
          </>
        )}
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
export function DrawingDistance({
  width,
  height,
  from,
  to,
  size,
  layerStyle,
  shape = MAP_DRAWING_SHAPES[0],
}) {
  const drawn = reach(width, height, from, to, size, shape);

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
function reach(width, height, from, to, size, shape) {
  const geometry = drawingGeometry(width, height, from, to);
  if (
    !geometry ||
    (shape === "arrow" && geometry.length < size * HEAD_OF_A_CELL)
  ) {
    return null;
  }

  return geometry;
}
