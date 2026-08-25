"use client";

import { memo, useCallback, useState } from "react";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

import ActivityLine, { accentClass } from "./activity-presentation";
import { LOG_CLASSES, logEntrance } from "./entrance";
import { useActivityEntries } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import { useWireMessage } from "./table-wire";

/**
 * As tall as the dice rail down the other side of the board, so the two
 * straddle it at a matching height whatever the map turns out to be.
 *
 * A literal, and a flat one: the rail's height is its seven glyphs, its rule
 * and its veil switch stacked up, which no expression here can derive — and a
 * class assembled from a template is one Tailwind's scanner never sees.
 */
const LOG_HEIGHT_CLASS = "h-[518px]";

/**
 * The last ten things this table has seen, newest at the top, standing opposite
 * the dice rail at the same height.
 *
 * It keeps itself current the two ways the pack next door does: Postgres
 * changes are the honest half, the table's wire the fast one. Both are
 * DOORBELLS — neither payload is read, since a row off the socket has not been
 * through the `select()` list in Sina's data layer — and both are answered by
 * `readTableSlice` asking for the log alone, not by a route render.
 *
 * A NAME ONLY EVER COMES OFF A ROW, which is why the wire is answered by a read
 * rather than by rendering what was said; see
 * 20260823090000_campaign_activity_log.sql. The one line this panel draws from
 * something the browser composed is the writer's own, on the writer's own screen,
 * until the real list lands.
 *
 * Real glass, and the budget was counted first: `backdrop-filter` is charged
 * per element — see surface.js — and this is the ninth on a full table, beside
 * six party cards, the map's frame and the application bar. That is over the
 * line party-rail.jsx warns at rather than near it, and it is affordable
 * because this one never animates its own backdrop after the entrance.
 *
 * Ten entries is the whole of what exists — `purge_campaign_activity` sees to
 * that — and at this height they very nearly all fit; the scroller inside is
 * for the last of them, where the alternative was cutting the oldest off with
 * nothing to say it had happened.
 */
function ActivityLog({ campaignId }) {
  const entries = useActivityEntries();
  const { resync } = useTableDeed(campaignId);

  const reread = useCallback(() => resync({ activity: true }), [resync]);

  useLiveRefresh({
    channel: `log:${campaignId}`,
    table: "campaign_activity_logs",
    // Bandwidth, not security — the SELECT policy is what decides what may be
    // delivered at all, and it answers for this table's chairs alone.
    filter: `campaign_id=eq.${campaignId}`,
    onChange: reread,
  });

  useWireMessage("log", reread);

  /**
   * What was already here when this panel opened, and therefore what must NOT
   * glide in. Without it every entry on the page raced in at once on a cold
   * load, which reads as ten things having just happened.
   *
   * State with a lazy initialiser rather than a ref: it is read while
   * rendering, and it is never written again — so React rendering this twice
   * answers the same both times. An id outside it stays "fresh" for the life of
   * the panel, which costs nothing: a CSS animation runs when its element
   * mounts and on no render after.
   */
  const [opened] = useState(() => new Set(entries.map((entry) => entry.id)));

  return (
    <section
      data-fold
      aria-label="Activity log"
      style={logEntrance()}
      /* `hidden lg:flex`, exactly as the balancing column it replaces was:
         below that width the table is one stack, and a panel the height of the
         board would stand between the reader and the board itself. */
      className={surfaceClasses({
        className: `hidden w-full flex-col overflow-hidden rounded-2xl lg:flex ${LOG_HEIGHT_CLASS} ${LOG_CLASSES}`,
      })}
    >
      {/* One element child, which is what panel-fold.js fades before it folds
          the shell around it. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="px-4 pt-4 pb-3 font-display text-xs font-semibold tracking-[0.18em] text-gold/80 uppercase">
          Activity log
        </h2>

        {/* The hairline the header and the changelog drawer carry. */}
        <div aria-hidden="true" className={FADED_RULE_CLASSES} />

        {entries.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink/50 italic">
            Nothing has happened at this table yet.
          </p>
        ) : (
          /* `aria-live` rather than a list that merely changes: an entry
             arrives because somebody else acted, and a reader who cannot see
             the glide has no other way of knowing it did.

             The sideways axis is stated rather than left to itself: a scroller
             on one axis makes the other `auto` unless told otherwise, and that
             is a horizontal scrollbar every time a row glides in from off the
             left edge. `clip` would be the truer word for what is wanted and is
             not available here — beside a scrolling value the browser reads it
             back as `hidden`, which for a box nothing overflows leftward into
             behaves the same. */
          <ol
            aria-live="polite"
            className="scroll-gold flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-3 py-3"
          >
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={
                  opened.has(entry.id) || entry.settled ? "" : "log-entry-in"
                }
              >
                {/* An outline all the way round, with the accent replacing
                    the left of it. No nested glass: the panel above is already
                    a backdrop root, so a filter here would sample its flat fill
                    and return it unchanged while still costing a compositor
                    readback. */}
                <div
                  className={`rounded-md border border-l-4 border-gold/15 bg-surface/40 px-2.5 py-1.5 ${accentClass(entry)}`}
                >
                  <ActivityLine entry={entry} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/**
 * Memoised, and its one prop is a string. The panel therefore renders when the
 * log changes and at no other time — not when a hit point moves on a card, not
 * when a die lands, not when somebody opens a drawer. That is the whole of what
 * `React.memo` buys here, and it only holds because the entries arrive through
 * a subscription rather than as a prop from a parent that re-renders.
 */
export default memo(ActivityLog);
