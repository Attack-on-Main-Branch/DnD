"use client";

import ActivityLog from "./activity-log";

/**
 * The column opposite the dice rail: the log, and at the head of the table the
 * box of their tools above it (dm-marks.jsx), passed in as `children`.
 */

/** As tall as the dice rail, so the two straddle the board at a matching height.
    A flat literal: the rail's height is its glyphs stacked up, which nothing
    here can derive. In rem, as the rail is, so the two scale together. */
const COLUMN_HEIGHT_CLASS = "h-[32.375rem]";

export default function ActivityColumn({ campaignId, faces, children = null }) {
  /* `hidden lg:block`: below that width the table is one stack. */
  if (!children) {
    return (
      <div className={`hidden w-full lg:block ${COLUMN_HEIGHT_CLASS}`}>
        <ActivityLog campaignId={campaignId} faces={faces} className="h-full" />
      </div>
    );
  }

  return (
    /*
     * AS TALL AS THE ROW, AND NEVER WHAT MAKES IT TALLER. The box and the log
     * are absolute inside, so neither counts towards the row's height — the
     * board does — and opening a panel cannot push the board down. The box
     * takes what its panel needs; the log under it is a player's 32.375rem tall
     * while there is room for it, and gives way down to a floor of its own when
     * a panel needs more. Past that the panel scrolls.
     *
     * THE FLOOR OF THE ROW is the box's closed height (its 4rem strip, its
     * hairline and its two borders), the gap, and a player's log — so with
     * nothing open the log is a player's whatever the board beside it. Spelled
     * out rather than measured: change the strip in dm-marks.jsx and change
     * this with it.
     *
     * Below `lg` the table is one stack: the box stands in it at its own
     * height, over the board, and the log is left out as it is for a player.
     */
    <div className="relative w-full lg:min-h-[calc(37.125rem_+_3px)] lg:self-stretch">
      <div className="flex flex-col gap-3 lg:absolute lg:inset-0">
        {children}

        <div className="hidden max-h-[32.375rem] min-h-48 flex-1 basis-0 lg:flex">
          <ActivityLog
            campaignId={campaignId}
            faces={faces}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
