"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback } from "react";

/**
 * `router.refresh()`, with a burst of them collapsed into two.
 *
 * A route render re-runs every query the page is built from, and at a busy
 * table several listeners ask for one in the same breath — a party that
 * changed, a level that moved, a tab coming back. Firing each one raced the
 * others: their answers land in any order, and an older one lays a stale board
 * over a newer.
 *
 * LEADING EDGE, so nothing waits: the first ask goes at once, and anything
 * asked during the quiet window becomes a single ask at the end of it.
 *
 * Module state rather than a hook's, for the reason use-live-refresh.js keeps
 * its refocus window there: there is one route, and these are its callers.
 */
const QUIET_MS = 400;

let lastAt = 0;
let trailing = null;

export function useRouteRefresh() {
  const router = useRouter();

  return useCallback(() => {
    const now = Date.now();

    if (now - lastAt >= QUIET_MS) {
      lastAt = now;
      startTransition(() => router.refresh());
      return;
    }

    if (trailing) {
      return;
    }

    trailing = setTimeout(
      () => {
        trailing = null;
        lastAt = Date.now();
        startTransition(() => router.refresh());
      },
      QUIET_MS - (now - lastAt),
    );
  }, [router]);
}
