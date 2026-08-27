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
 * The LABEL is not. It rides in HTML at the midpoint and counter-scales the
 * zoom, because a distance is read by a person rather than measured.
 */
/** A shade off black, so the gold reads over parchment, forest and water. */
const OUTLINE = "rgba(12, 9, 5, 0.85)";

export default function DragArrow({
  width,
  height,
  from,
  to,
  size,
  scale,
  layerStyle,
}) {
  if (!from || !to) {
    return null;
  }

  const start = { x: from.x * width, y: from.y * height };
  const end = { x: to.x * width, y: to.y * height };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  // A drag that has not left the cell it started in has nothing to say yet.
  if (length < size / 2) {
    return null;
  }

  const angle = Math.atan2(dy, dx);

  // Stopped short, so the point lands on the piece's edge, not under it.
  const head = size * 0.42;
  const tipX = end.x - Math.cos(angle) * head * 0.6;
  const tipY = end.y - Math.sin(angle) * head * 0.6;

  const steps =
    Number.isInteger(from.q) && Number.isInteger(to.q)
      ? hexDistance(from, to)
      : null;

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
        {/* Drawn twice, dark underneath: a gold line over a gold map is one
            nobody can follow. */}
        <line
          x1={start.x}
          y1={start.y}
          x2={tipX}
          y2={tipY}
          stroke={OUTLINE}
          strokeWidth={6}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        <line
          x1={start.x}
          y1={start.y}
          x2={tipX}
          y2={tipY}
          stroke="var(--color-gold)"
          strokeWidth={3}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* A triangle rather than a marker, which would inherit the stroke's
            scaling instead of keeping its proportions against the cell. */}
        <polygon
          points={`${tipX + Math.cos(angle) * head},${
            tipY + Math.sin(angle) * head
          } ${tipX + Math.cos(angle + 2.5) * head * 0.6},${
            tipY + Math.sin(angle + 2.5) * head * 0.6
          } ${tipX + Math.cos(angle - 2.5) * head * 0.6},${
            tipY + Math.sin(angle - 2.5) * head * 0.6
          }`}
          fill="var(--color-gold)"
          stroke={OUTLINE}
          strokeWidth={3}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Where it started, for a drag long enough to leave the piece off
            the edge of the view. */}
        <circle
          cx={start.x}
          cy={start.y}
          r={size * 0.12}
          fill="var(--color-gold)"
          stroke={OUTLINE}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {steps !== null && (
        <span
          className="absolute font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-gold"
          style={{
            left: `${((start.x + end.x) / 2 / width) * 100}%`,
            top: `${((start.y + end.y) / 2 / height) * 100}%`,
            transform: `translate(-50%, -50%) scale(${1 / scale})`,
          }}
        >
          <span className="rounded-md border border-gold/40 bg-surface/90 px-1.5 py-0.5">
            {steps * FEET_PER_HEX} ft
          </span>
        </span>
      )}
    </div>
  );
}
