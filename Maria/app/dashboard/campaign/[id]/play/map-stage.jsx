import { surfaceClasses } from "@/app/components/ui/surface";

import { FRAME_CLASSES, FRAME_DELAY, MAP_CLASSES, MAP_DELAY } from "./entrance";
import { MAP_HEIGHT_CLASS } from "./map-height";
import TableMap from "./table-map";

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
 */
export default function MapStage({
  url,
  title,
  campaignId,
  marks,
  seat,
  canSweep,
}) {
  if (!url) {
    return (
      <div
        className={`grid ${MAP_HEIGHT_CLASS} w-full max-w-xl place-items-center rounded-2xl border-2 border-dashed border-gold/20 px-6 text-center ${MAP_CLASSES}`}
        style={MAP_DELAY}
      >
        <p className="font-display text-base font-medium tracking-wide text-ink/60">
          No map for this campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-fit">
      {/* No `glow`: the rim would light under the pointer, which promises a
          control where there is only a picture. */}
      <span
        aria-hidden="true"
        className={surfaceClasses({
          className: `pointer-events-none absolute -inset-6 rounded-[2.25rem] ${FRAME_CLASSES}`,
        })}
        style={FRAME_DELAY}
      />

      {/* `relative` rather than a z-index: the frame is positioned and this is
          not, so without it the rim would paint over the map. */}
      <TableMap
        url={url}
        title={title}
        campaignId={campaignId}
        marks={marks}
        seat={seat}
        canSweep={canSweep}
        className={`relative ${MAP_CLASSES}`}
        style={MAP_DELAY}
      />
    </div>
  );
}
