"use client";

import Avatar from "@/app/components/ui/avatar";

/**
 * The shadow a token casts, written out in both classes below rather than
 * composed from a constant: a class built from a template is a class Tailwind's
 * scanner never sees. Change one dark term and change the other.
 *
 * It is heavy, and unoffset. These tokens sit on parchment, forest and open
 * water by turns, and a board that pans and zooms has no light source to throw
 * them consistently by. The depth comes from SPREAD — the colour is already
 * near-opaque black, so a blur with no spread behind it is barely black at all.
 *
 * The party's carries a gold halo over that dark. Shadows paint front to back,
 * so the gold is listed first and wins where it overlaps while the dark still
 * reaches further out — that margin is why the token reads as lit AND raised.
 */
const GROUND_SHADOW = "shadow-[0_0_8px_4px_rgba(0,0,0,0.9)]";

const PARTY_SHADOW =
  "shadow-[0_0_0_2px_var(--gold-35),0_0_12px_var(--gold-60),0_0_10px_6px_rgba(0,0,0,1)]";

/**
 * The tokens on the board, and nothing else — where they came from is
 * use-table-marks.js, and the geometry is use-map-zoom.js.
 *
 * The layer rides the picture's own transform, so a mark is pinned to a place
 * on the world rather than on the screen, at no cost in JavaScript. `inset-0`
 * is exact because `w-fit` in table-map.jsx makes frame and picture one box.
 *
 * `pointer-events-none` on the layer and back on only for a token that can be
 * cleared: the map underneath has to keep receiving the right-click that marks
 * it, and a transparent sheet over the whole board would swallow it.
 */
export default function MapMarks({ marks, scale, layerStyle, onClear }) {
  return (
    // Announced by MarkRoll instead: nothing inside a `role="button"` is read
    // out, and the map is one.
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={layerStyle}
    >
      {marks.map((mark) => (
        <Mark
          key={mark.characterId ?? "party"}
          mark={mark}
          scale={scale}
          onClear={onClear}
        />
      ))}
    </div>
  );
}

/**
 * One token, centred on its point.
 *
 * The layer around it carries the picture's scale, so `1 / scale` here keeps
 * the token the same size on screen at every step — which means it covers less
 * ground on the map zoomed in than out. That is the point: the zoom is how a
 * person says precisely where. The transition matches the image's so the two
 * move as one, and per cent rather than pixels because a fraction of the
 * picture is what was stored.
 *
 * The outer span holds nothing but the place: the two branches below are
 * different shapes — a gold rim adds to the box — so sizing it here would pin
 * them to a shared width neither wants.
 */
function Mark({ mark, scale, onClear }) {
  const removable = mark.removable && Boolean(onClear);

  return (
    <span
      className={`absolute ${
        removable ? "pointer-events-auto cursor-context-menu" : ""
      }`}
      style={{
        left: `${mark.x * 100}%`,
        top: `${mark.y * 100}%`,
        transform: `translate(-50%, -50%) scale(${1 / scale})`,
        transition: "transform 250ms ease",
      }}
      onContextMenu={
        removable
          ? (event) => {
              event.preventDefault();
              // Or the map below would take this as "mark here" and put a new
              // token down on the spot the old one was just lifted from.
              event.stopPropagation();
              onClear(mark.characterId);
            }
          : undefined
      }
    >
      {mark.characterId ? (
        /*
         * The gold rim marks the viewer's own token and nothing else — it is
         * how you find yourself on a crowded board of unfamiliar colours.
         *
         * `flex` rather than `block`: the avatar is inline, and the line box
         * under an inline child would make this taller than what it holds and
         * push the token off its own point.
         */
        <span
          className={`flex rounded-full ${GROUND_SHADOW} ${
            mark.mine ? "bg-gold p-[3px]" : ""
          }`}
        >
          <Avatar
            initials={mark.initials}
            colorClass={mark.colorClass}
            size="xs"
          />
        </span>
      ) : (
        /*
         * The Dungeon Master's token is the party itself, so it wears no face:
         * gold through, and the initial of what it stands for. `size-7` is the
         * avatar's own `xs`, so the two tokens are the same coin on the board.
         * The halo's alphas are the theme's, so `--color-gold` repaints both it
         * and the disc.
         */
        <span
          className={`grid size-7 place-items-center rounded-full bg-gold font-display text-xs leading-none font-semibold text-surface ${PARTY_SHADOW}`}
        >
          P
        </span>
      )}
    </span>
  );
}

/**
 * What a screen reader is told is on the map. A live region because the board is
 * shared: a mark can land while somebody is reading, without them doing a thing.
 */
export function MarkRoll({ marks }) {
  return (
    <p className="sr-only" aria-live="polite">
      {marks.length === 0
        ? "Nothing is marked on the map."
        : `Marked on the map: ${marks.map((mark) => mark.label).join(", ")}.`}
    </p>
  );
}
