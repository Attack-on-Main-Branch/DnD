"use client";

import { usePathname } from "next/navigation";

/** The table needs every row of the window, so the bar folds away over it. */
const TABLE_PATH = /^\/dashboard\/campaign\/[^/]+\/play\/?$/;

/**
 * Collapses its row to nothing, and the bar rides out above the viewport on
 * the row's bottom edge. `self-end` is what does it: stretched, the bar would
 * shrink to the 0px row and its contents would spill out visibly instead.
 * Not clipped, because the notification popover hangs below the bar; not
 * faded, because the bar is glass and below full opacity it stops being glass.
 */
export default function HeaderFold({ children }) {
  const tucked = TABLE_PATH.test(usePathname() ?? "");

  return (
    <div
      inert={tucked}
      className={`sticky top-0 z-20 grid transition-[grid-template-rows] duration-500 ease-(--ease-tray) *:min-h-0 *:self-end motion-reduce:transition-none ${
        tucked ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
      }`}
    >
      {children}
    </div>
  );
}
