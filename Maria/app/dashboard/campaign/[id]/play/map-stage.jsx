"use client";

import { useEffect, useRef } from "react";

import { MAP_CLASSES, MAP_DELAY } from "./entrance";
import {
  MAP_HEIGHT_CLASS,
  MAP_MAX_HEIGHT_CLASS,
  MAP_MAX_HEIGHT_TOOLS_CLASS,
} from "./map-height";
import { useMapToolsShown } from "./map-tools";
import MapRim from "./map-rim";
import TableMap from "./table-map";
import { useTableMaps } from "./table-maps";

/**
 * The world, at its own aspect ratio and the height map-height.js allows.
 *
 * Both bounds are maxima with the sizes left `auto`, which hands the ratio back
 * to the browser. A specified `height` beside a `max-width` is the trap: the
 * width clamps, the height does not follow, and `object-contain` letterboxes
 * the picture inside a frame that no longer touches it.
 *
 * A plain `<img>` rather than `next/image`, which wants both dimensions in
 * advance to reserve a box and only one is knowable here. TableMap and the
 * campaign sheet's modal share `useMapZoom`, so the two zoom alike.
 *
 * The frame is a sibling, not a parent: it blooms once the map has landed, and
 * a border wrapped around the picture would have grown with it. `-inset-6` is
 * the same 1.5rem mat on all four sides whatever shape the map turns out to be,
 * and the two radii are concentric — the outer is the inner plus that mat.
 *
 * `children` is the dice board, and it goes inside this box rather than around
 * it because that is the only place a `-inset-6` means the same 1.5rem the mat
 * above does. A table with no map has nowhere to throw onto, so the branch
 * below takes none — the roll still happens, see dice-engine.js.
 *
 * `cast` is what the head of the table just threw. Its own slot rather than
 * more `children`, because a roll with no board to land on still has a number
 * to say — so it is drawn in both branches.
 *
 * No `marks` prop any more: the tokens are held in the browser now, in
 * table-state.jsx, and `faces` is what turns one of them into something to
 * draw. See use-table-marks.js.
 *
 * A CLIENT COMPONENT since the shelf: `url` is what the route rendered, and
 * what is actually on the table is whatever the Dungeon Master last reached
 * for — which arrives over a socket rather than through a render. The prop is
 * still the fallback, and the only picture a table with no shelf ever shows.
 *
 * `canRule` is the head of the table: the map tools stand under the board for
 * them, and the picture gives up their height.
 */
export default function MapStage({
  url: served,
  title,
  campaignId,
  faces,
  seat,
  canSweep,
  canRule = false,
  display = false,
  cast = null,
  children,
}) {
  const { activeUrl, isScene } = useTableMaps();
  const ruled = useMapToolsShown(canRule);

  const url = activeUrl ?? served;
  const drawing = !canSweep && seat?.characterId && !isScene;
  const stageRef = useRef(null);

  // Reserve tool space without enlarging the map-sized dice arena.
  useEffect(() => {
    const stage = stageRef.current;
    const controls = stage?.querySelector("[data-map-controls]");
    if (!controls) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      stage.style.setProperty(
        "--map-controls-height",
        `${entry.contentRect.height}px`,
      );
    });
    observer.observe(controls);
    return () => observer.disconnect();
  }, [url]);

  if (!url) {
    return (
      <div
        data-shrink
        className={`relative grid ${display ? "h-full" : MAP_HEIGHT_CLASS} w-full max-w-xl place-items-center rounded-2xl border-2 border-dashed border-gold/20 px-6 text-center ${MAP_CLASSES}`}
        style={MAP_DELAY}
      >
        <p className="font-display text-base font-medium tracking-wide text-ink/60">
          No map for this campaign.
        </p>

        {cast}
      </div>
    );
  }

  return (
    /* `data-shrink` takes the mat, the marks and the dice board with it, which
       is the whole reason the frame is a child here rather than a sibling.

       `min-w-0` beside `w-fit` is what lets this give way. It is a flex item,
       and a flex item's automatic minimum size is its content — so a window too
       narrow for the map at its own size did not shrink the picture, it painted
       it over the log and the party.

       NO WIDTH CEILING HERE OR ON THE PICTURE: the mat below is `-inset-6` of
       THIS box, and a ceiling on either alone leaves the box wider than what is
       inside it — a mat standing proud of the map on one side. The column is
       the only width limit. See map-height.js. */
    <div
      ref={stageRef}
      data-shrink
      inert={display}
      className="relative w-fit min-w-0 max-sm:mb-[var(--map-controls-height,0px)]"
    >
      {/* No `glow`: the rim would light under the pointer, which promises a
          control where there is only a picture.

          THE MAT IS WHAT SAYS THE PARTY IS FIGHTING. Utilities rather than a
          `.lit-*` class — these have to OUTRANK `.glass`'s own border and
          shadow, which is the way round `.lit-cast` in globals.css warns of. */}
      <MapRim />

      {/* `relative` rather than a z-index: the frame is positioned and this is
          not, so without it the rim would paint over the map. */}
      <TableMap
        url={url}
        title={title}
        campaignId={campaignId}
        faces={faces}
        seat={seat}
        canSweep={canSweep}
        cast={cast}
        heightClass={
          display
            ? "max-h-[100cqh]"
            : ruled || drawing
              ? MAP_MAX_HEIGHT_TOOLS_CLASS
              : MAP_MAX_HEIGHT_CLASS
        }
        className={`relative ${MAP_CLASSES}`}
        style={MAP_DELAY}
      />

      {children}
    </div>
  );
}
