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
 * `pointer-events-none` on the layer and back on only for a token somebody may
 * actually pick up: the map underneath has to keep receiving the press that
 * pans it and the right button that measures across it, and a transparent sheet
 * over the whole board would swallow both.
 */
export default function MapMarks({
  marks,
  scale,
  layerStyle,
  onGrab = null,
  cell = null,
}) {
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
          cell={cell}
          onGrab={onGrab}
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
function Mark({ mark, scale, cell, onGrab }) {
  /* Whose hand may drag this one. A Dungeon Master's over every piece at their
     table, a player's over their own — see use-table-marks.js, which decides
     it, and the database, which decides it again. */
  const movable = mark.movable && Boolean(onGrab);

  return (
    <span
      className={`absolute ${
        movable ? "pointer-events-auto cursor-grab active:cursor-grabbing" : ""
      }`}
      onPointerDown={
        movable
          ? (event) => {
              if (event.button !== 0 || !event.isPrimary) {
                return;
              }

              /* Or the map underneath takes this as the start of a pan and the
                 board slides out from under the piece being lifted. */
              event.stopPropagation();
              event.preventDefault();

              onGrab(mark.characterId, event);
            }
          : undefined
      }
      style={{
        left: `${mark.x * 100}%`,
        top: `${mark.y * 100}%`,
        /*
         * OFF THE GRID the token keeps its size on screen at every zoom step —
         * `1 / scale` — so it covers less ground zoomed in than out, which is
         * how the zoom is used to say precisely where.
         *
         * ON THE GRID it does the opposite, because the cell is now the unit of
         * "where": a piece that shrank as you leaned in would stop filling the
         * square it is standing in.
         */
        transform: cell
          ? "translate(-50%, -50%)"
          : `translate(-50%, -50%) scale(${1 / scale})`,
        transition: "transform 250ms ease",
        ...(cell ? { width: `${cell * 100}%`, aspectRatio: "1" } : null),
      }}
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
          /* A RING, not a gold disc with the face padded into it. The padding
             version drew a second rim inside the avatar's own pale one — two
             edges a pixel apart, which is what made a round token look like it
             had been cut out badly. A ring is painted outside the box, so the
             circle stays one circle. */
          className={`flex rounded-full ${GROUND_SHADOW} ${
            cell ? "size-full" : ""
          } ${mark.mine ? "ring-2 ring-gold" : ""}`}
        >
          <Avatar
            src={mark.src}
            colorClass={mark.colorClass}
            size="xs"
            // One rim at a time: the gold one above says whose piece this is.
            ring={!mark.mine}
            /* Last, so it wins over `xs`: on a ruled board the token is the
               size of the cell it stands in, and the cell is the unit. */
            className={cell ? "size-full" : ""}
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
          className={`grid place-items-center rounded-full bg-gold font-display text-xs leading-none font-semibold text-surface ${PARTY_SHADOW} ${
            cell ? "size-full" : "size-7"
          }`}
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
