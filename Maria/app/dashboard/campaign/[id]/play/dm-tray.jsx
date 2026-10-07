"use client";

import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { useDmMarks } from "./dm-marks";

/**
 * One mark along the top of the head of the table's box, and the panel it
 * opens: the drawing stays in the strip, the body goes through a portal into
 * the box under it. TablePopover's shell, class for class.
 *
 * A DISCLOSURE AND NOT A DIALOG: the panel stands in the column beside the
 * board rather than over it, so nothing traps the focus and nothing closes it
 * but its own mark or Escape.
 *
 * `alarm` is the mark lit in the fight's own rose, whatever is open. `bare`
 * leaves the title row to the panel itself.
 */
export default function DmTray({
  mark,
  markLabel,
  title,
  meta,
  panelLabel,
  alarm = false,
  bare = false,
  children,
}) {
  const value = useId();
  const panelId = `${value}-panel`;

  const triggerRef = useRef(null);

  const { body, open, hold, toggle, close } = useDmMarks();
  const isOpen = open === value;

  function onKeyDown(event) {
    if (event.key !== "Escape") {
      return;
    }

    event.stopPropagation();
    close();
    triggerRef.current?.focus();
  }

  const tone = alarm
    ? "text-rose-400 hover:text-rose-300"
    : isOpen
      ? "text-gold"
      : "text-ink/60 hover:text-gold";

  return (
    <>
      {/* A mark and not a button: no rim, no fill, nothing behind the drawing,
          exactly as the dice and the marks above the board. */}
      <button
        ref={(node) => {
          triggerRef.current = node;
          hold(value, node);
        }}
        type="button"
        onClick={() => toggle(value)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={markLabel}
        className={`grid size-13 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-300 focus-visible:text-gold ${tone}`}
      >
        {mark}
      </button>

      {/* Always mounted once the box exists, so it can collapse rather than
          vanish — a row that is merely removed has no second height to travel
          towards. */}
      {body &&
        createPortal(
          <div className="tab-shell" data-state={isOpen ? "open" : "collapsed"}>
            <div className="tab-clip">
              <div
                id={panelId}
                role="region"
                aria-label={panelLabel}
                inert={!isOpen || undefined}
                onKeyDown={onKeyDown}
                className={`tab-panel ${
                  isOpen
                    ? "motion-safe:animate-[tab-panel-in_380ms_var(--ease-tray)]"
                    : ""
                }`}
              >
                {!bare && (
                  <>
                    <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
                      <h2 className="min-w-0 truncate font-display text-sm font-semibold tracking-wide text-gold">
                        {title}
                      </h2>

                      {meta !== undefined && meta !== null && (
                        <p className="shrink-0 font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
                          {meta}
                        </p>
                      )}
                    </div>

                    {/* The hairline the header and the changelog drawer carry. */}
                    <div aria-hidden="true" className={FADED_RULE_CLASSES} />
                  </>
                )}

                {children}
              </div>
            </div>
          </div>,
          body,
        )}
    </>
  );
}
