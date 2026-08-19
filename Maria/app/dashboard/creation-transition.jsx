"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { foldPanel, revealPanel } from "@/app/components/ui/panel-reveal";

/**
 * The creation sheet folding away. The reveal is shared with the character and
 * campaign sheets; this adds the exit, which has to finish before the push —
 * the outgoing DOM is gone once the navigation lands. Caught in the capture
 * phase, because `Link` cancels the event during the target phase.
 *
 * Not a view transition: that photographs the whole page, and the dashboard
 * behind cannot be faded — its cards *are* the glass, and any opacity below 1
 * is a backdrop root.
 */
export default function CreationTransition({ children }) {
  const router = useRouter();
  const rootRef = useRef(null);
  const leaving = useRef(false);

  useLayoutEffect(() => {
    leaving.current = false;
    revealPanel(rootRef.current?.firstElementChild);
  }, []);

  function onClick(event) {
    const root = rootRef.current;
    const link =
      event.target instanceof Element ? event.target.closest("a") : null;

    if (
      !root ||
      link?.getAttribute("href") !== "/dashboard" ||
      leaving.current ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    leaving.current = true;

    window.setTimeout(
      () => router.push("/dashboard"),
      foldPanel(root.firstElementChild),
    );
  }

  return (
    <div ref={rootRef} onClickCapture={onClick}>
      {children}
    </div>
  );
}
