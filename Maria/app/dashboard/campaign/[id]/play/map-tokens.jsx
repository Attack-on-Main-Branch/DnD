"use client";

import { CONDITIONS } from "sina/rules/conditions";

import MapToken from "./map-token";

/**
 * The pieces on the board, and nothing else — where they came from is
 * use-map-tokens.js, the geometry is use-map-zoom.js, and one piece is
 * map-token.jsx.
 *
 * The layer rides the picture's own transform, so a piece is pinned to a place
 * on the world rather than on the screen, at no cost in JavaScript. `inset-0`
 * is exact because `w-fit` in table-map.jsx makes frame and picture one box.
 *
 * `pointer-events-none` on the layer and back on for each piece: the map
 * underneath has to keep receiving the press that pans it and the right button
 * that measures across it, and a transparent sheet over the whole board would
 * swallow both. A piece nobody at this chair may move does not stop the press
 * either — see map-token.jsx.
 *
 * `muted` takes that opt-in back for every piece at once, for the fog brush: a
 * stroke has to cross the board without the first face it passes over catching
 * the press.
 */
export default function MapTokens({
  tokens,
  scale,
  layerStyle,
  onGrab = null,
  onMark = null,
  onLift = null,
  cell = null,
  muted = false,
}) {
  return (
    // Announced by TokenRoll instead: nothing inside a `role="button"` is read
    // out, and the map is one.
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={layerStyle}
    >
      {tokens.map((token) => (
        <MapToken
          key={token.id}
          token={token}
          scale={scale}
          cell={cell}
          muted={muted}
          onGrab={onGrab}
          onMark={onMark}
          onLift={onLift}
        />
      ))}
    </div>
  );
}

/**
 * What a screen reader is told is on the map. A live region because the board is
 * shared: a piece can land while somebody is reading, without them doing a
 * thing.
 *
 * What has been DONE to a piece is read out beside its name, because that is the
 * whole of what the tooltip says and the tooltip is `aria-hidden` — it draws
 * what this sentence already carries. A hidden piece reaches this sentence on
 * the Dungeon Master's screen alone — nobody else is sent the row.
 */
export function TokenRoll({ tokens }) {
  return (
    <p className="sr-only" aria-live="polite">
      {tokens.length === 0
        ? "Nothing is standing on the map."
        : `On the map: ${tokens.map(described).join(", ")}.`}
    </p>
  );
}

function described(token) {
  const said = [];

  if (token.isDead) {
    said.push("dead");
  }

  if (token.isHidden) {
    said.push("hidden from the party");
  }

  for (const key of token.conditions) {
    said.push(CONDITIONS[key].name.toLowerCase());
  }

  return said.length === 0
    ? token.label
    : `${token.label} (${said.join(", ")})`;
}
