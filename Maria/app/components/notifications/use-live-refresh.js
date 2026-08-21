"use client";

import { useEffect, useRef } from "react";

import { realtime } from "@/app/components/realtime";

/**
 * "Something you can see has changed on the server — go and re-read it."
 *
 * The payload a Realtime change carries is deliberately thrown away. A row
 * arriving over the socket has not been through the `select()` lists in Sina's
 * data layer, so rendering it would put columns on the page that no query in
 * this project returns; and the page is a Server Component tree, which knows
 * how to fetch itself. So the socket is a doorbell and `router.refresh()` is
 * answering it.
 *
 * The client and its token live in `components/realtime.js` — one socket for
 * the page, shared with the table's presence channel.
 */

/** A tab that has been in the background is a tab that has missed things. */
const REFOCUS_QUIET_MS = 20000;

/**
 * Subscribes to one table and calls `onChange` when a row the viewer is allowed
 * to see moves. `filter` is PostgREST syntax and trims what crosses the wire;
 * RLS is what decides what may cross it at all.
 *
 * Coming back to the tab re-reads as well. Realtime is the fast path, not the
 * only one: a socket that dropped, a database without Supabase's publication,
 * or a laptop that was shut is each a case where the page would otherwise sit
 * on a stale list until somebody pressed reload.
 */
export function useLiveRefresh({ channel, table, filter, onChange }) {
  // Held in a ref, and written from an effect rather than during the render:
  // the subscription below must not be torn down and rebuilt every time the
  // caller hands over a new closure, and a socket is an expensive thing to
  // rebuild. Declared first, so it is current before the effect that reads it.
  const latest = useRef(onChange);

  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let stop = null;
    let cancelled = false;

    realtime()
      .then(({ client, watchTable }) => {
        if (cancelled) {
          return;
        }

        stop = watchTable(client, {
          channel,
          table,
          filter,
          onChange: () => latest.current(),
        });
      })
      // A page without a socket still works; it just waits for a refocus.
      .catch(() => {});

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [channel, table, filter]);

  useEffect(() => {
    let last = 0;

    function onFocus() {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();

      if (now - last < REFOCUS_QUIET_MS) {
        return;
      }

      last = now;
      latest.current();
    }

    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
