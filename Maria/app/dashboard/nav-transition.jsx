"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState, useTransition } from "react";

import {
  startNavigationProgress,
  stopNavigationProgress,
} from "@/app/components/navigation-progress-control";
import { closeOut, reopen } from "@/app/components/ui/panel-fold";
import { markRouteChange } from "@/app/components/view-nav";

import { playTableEntrance } from "./campaign/[id]/play/table-page-entrance";

/**
 * Moving between the dashboard's pages, played as a closing rather than a cut:
 * panels marked `data-fold` fold away, pieces marked `data-fade` leave with
 * their contents, and the push waits for them — the outgoing DOM is gone once
 * it lands.
 *
 * The bar across the top stays put. It belongs to all of these pages equally,
 * so taking it away and bringing it back on every hop reads as leaving and
 * arriving somewhere else. Signing out is what raises it, from the sign-out
 * button. The greeting keeps its place the same way when only the search
 * changes — `?new` swaps the panel under it, not the page around it. The corner
 * grimoire is out of reach either way, hanging off the changelog panel, which
 * is this component's sibling.
 *
 * Caught in the capture phase, because `Link` cancels the event during the
 * target phase. It sits in the layout so the wordmark inside the bar is covered
 * too, and it *is* the flex column rather than a wrapper around it: an element
 * between the two would take the `flex-1` and leave the column short.
 *
 * Cancelling the click also hides it from the loading bar, which reads a
 * prevented default as a click that goes nowhere — so this arms and releases
 * the bar itself. `useTransition` rather than the bar's own watch on the
 * pathname: `?new` opens and closes the creation sheet without the pathname
 * ever moving, and the bar would be left crawling until its safety timeout.
 *
 * `Curtain` lets the other dashboard routes start loading during their exit.
 * The play page waits for its full sequence before pushing the next route.
 */
export default function NavTransition({ className, children }) {
  const router = useRouter();
  const [navigating, startNavigating] = useTransition();
  const [curtain, setCurtain] = useState(null);
  const rootRef = useRef(null);
  const leaving = useRef(false);
  const closingTable = useRef(null);
  const wasNavigating = useRef(false);

  useEffect(() => {
    if (wasNavigating.current && !navigating) {
      stopNavigationProgress();
      // Whatever the new page kept — the dashboard's greeting is rendered
      // either side of `?new` — is still wearing the closing. Take it off.
      reopen();
      if (closingTable.current?.isConnected)
        playTableEntrance(closingTable.current, true);
      closingTable.current = null;
    }

    wasNavigating.current = navigating;
  }, [navigating]);

  function onClick(event) {
    const root = rootRef.current;
    const link =
      event.target instanceof Element ? event.target.closest("a") : null;
    const href = link?.getAttribute("href");

    if (
      !root ||
      !href ||
      event.defaultPrevented ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self") ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const from = window.location.href;
    const target = new URL(href, from);
    const here = window.location.pathname + window.location.search;
    const leavingRoute = target.pathname !== window.location.pathname;
    const table = leavingRoute
      ? root.querySelector("[data-table-arrival]")
      : null;

    if (
      target.origin !== window.location.origin ||
      !target.pathname.startsWith("/dashboard") ||
      target.pathname + target.search === here ||
      (!table && !root.querySelector("[data-fade], [data-fold]"))
    ) {
      return;
    }

    event.preventDefault();
    if (leaving.current) return;
    leaving.current = true;
    startNavigationProgress();

    /* This one IS a page you are leaving, so the fade is wanted — see the gate
       in globals.css. */
    markRouteChange();

    if (table) {
      closingTable.current = table;
      playTableEntrance(table, false).then(() => {
        leaving.current = false;
        if (root.isConnected && window.location.href === from) {
          startNavigating(() => router.push(href));
        } else {
          stopNavigationProgress();
        }
      });
      return;
    }

    const closing = closeOut(root, { leavingRoute, pressed: link });
    const closed = new Promise((resolve) => {
      window.setTimeout(() => {
        leaving.current = false;
        resolve();
      }, closing);
    });

    startNavigating(() => {
      setCurtain(closed);
      router.push(href);
    });
  }

  return (
    <div ref={rootRef} className={className} onClickCapture={onClick}>
      {curtain && <Curtain until={curtain} />}
      {children}
    </div>
  );
}

/** Holds a navigation's commit until the closing it started has finished. */
function Curtain({ until }) {
  use(until);

  return null;
}
