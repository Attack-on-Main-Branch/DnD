"use client";

import { surfaceClasses } from "@/app/components/ui/surface";

import ActivityLog from "./activity-log";
import CombatTracker from "./combat-tracker";
import { useCombatDrawer } from "./combat-drawer";

/**
 * The column opposite the dice rail, and the two panels that share it.
 *
 * ABSOLUTE AND NOT A FLEX PAIR: the log is pinned to the BOTTOM, so shrinking it
 * moves its top edge down — it compresses and travels on one property. A flex
 * column would have had to animate a gap, a basis and a height against each
 * other.
 *
 * The tracker stays MOUNTED once it exists, collapsed rather than removed: an
 * element merely taken away has no second state to travel towards. `inert` keeps
 * a collapsed one off the Tab order.
 */

/** As tall as the dice rail, so the two straddle the board at a matching height.
    A flat literal: the rail's height is its glyphs stacked up, which nothing
    here can derive. */
const COLUMN_HEIGHT_CLASS = "h-[518px]";

/**
 * And how tall while the ladder is out: THE COLUMN GROWS RATHER THAN THE LOG
 * SHRINKING, because an encounter grows with the fight and ten log lines do not.
 *
 * Bounded by the board's own reserve — `100vh - 20rem` is the middle term of the
 * map's ceiling in map-height.js, measured there against the header, the title,
 * the marks and the mat. A column held to that can never stand taller than the
 * board beside it is already allowed to.
 */
const COLUMN_SPLIT_CLASS = "h-[clamp(518px,100vh_-_20rem,660px)]";

/** The log's half of the ORIGINAL column, flat and not a fraction: a percentage
    would follow the column as it grows, which is the one thing it must not do.
    The ladder is measured from the other end and takes the remainder. */
const LOG_SPLIT_CLASS = "h-[259px]";
const TRACKER_CLASS = "bottom-[calc(259px_+_0.75rem)]";

export default function ActivityColumn({ campaignId, faces, canCommand }) {
  const { open } = useCombatDrawer();

  /* Stated rather than assumed: a player's column holds the log at full height
     and nothing else in the tree at all. */
  const split = canCommand && open;

  return (
    /* `hidden lg:block`: below that width the table is one stack. */
    <div
      className={`relative hidden w-full transition-[height] duration-300 ease-in-out motion-reduce:transition-none lg:block ${
        split ? COLUMN_SPLIT_CLASS : COLUMN_HEIGHT_CLASS
      }`}
    >
      {canCommand && (
        <section
          aria-label="Initiative and combat turns"
          inert={!split || undefined}
          className={surfaceClasses({
            className: `absolute inset-x-0 top-0 flex flex-col overflow-hidden rounded-2xl ${TRACKER_CLASS} transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none ${
              split
                ? "opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0"
            }`,
          })}
        >
          <CombatTracker campaignId={campaignId} faces={faces} />
        </section>
      )}

      <ActivityLog
        campaignId={campaignId}
        faces={faces}
        className={`absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-in-out motion-reduce:transition-none ${
          split ? LOG_SPLIT_CLASS : "h-full"
        }`}
      />
    </div>
  );
}
