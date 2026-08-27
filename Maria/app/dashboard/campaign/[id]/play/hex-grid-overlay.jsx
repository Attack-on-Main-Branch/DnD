"use client";

import {
  getHexPolygonPoints,
  gridStroke,
  hexPatternTile,
  hexToPixel,
} from "@/lib/hex-math";

/**
 * The hex grid, drawn over the picture and nothing else.
 *
 * IN THE PICTURE'S OWN COORDINATES: the `viewBox` is the map's natural size, so
 * the browser does the scaling and the grid stays in register at every window
 * size and zoom step without a measurement in JavaScript.
 *
 * ONE PATTERN, NOT SIX THOUSAND POLYGONS — see `hexPatternTile`.
 *
 * `pointer-events-none` throughout, or the board below stops receiving the
 * press that pans it and the button that measures across it.
 */
export default function HexGridOverlay({
  width,
  height,
  size,
  luminance,
  hover = null,
  layerStyle,
}) {
  if (!width || !height) {
    return null;
  }

  const tile = hexPatternTile(size);
  const stroke = gridStroke(luminance);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={layerStyle}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        /* The frame is `w-fit` around the picture, so this box already has its
           aspect; `none` keeps the two in register. */
        preserveAspectRatio="none"
        className="size-full"
      >
        <defs>
          <pattern
            id={PATTERN_ID}
            width={tile.width}
            height={tile.height}
            patternUnits="userSpaceOnUse"
          >
            {tile.polygons.map((points) => (
              <polygon
                key={points}
                points={points}
                fill="none"
                stroke={stroke}
                strokeWidth={STROKE_WIDTH}
                /* A picture pixel is a third of a screen pixel on a map
                   drawn at a fifth of its size. This keeps it a line. */
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </pattern>
        </defs>

        <rect width={width} height={height} fill={`url(#${PATTERN_ID})`} />

        {/* The cell under the pointer while a piece is being placed. */}
        {hover && (
          <polygon
            points={cellPoints(hover, size)}
            fill="var(--gold-25)"
            stroke="var(--color-gold)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

/** A literal id: this goes inside `url(#…)`, and React's `:r1:` is not a
    selector without escaping every colon. One board, one id. */
const PATTERN_ID = "hex-grid-pattern";

const STROKE_WIDTH = 1.25;

function cellPoints({ q, r }, size) {
  const { x, y } = hexToPixel(q, r, size);

  return getHexPolygonPoints(x, y, size);
}
