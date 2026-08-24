"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useReducedMotion } from "@/app/components/use-reduced-motion";

const SLIDE_MS = 320;

/**
 * A tab strip, shared by the character sheet and the campaign page. Follows the
 * ARIA authoring pattern: one tab stop for the strip, arrow keys between tabs,
 * Home/End to the ends. The underline is one sliding element, positioned
 * imperatively so it never passes through React state.
 *
 * `panels` arrives as ALREADY-RENDERED elements keyed by tab value. This
 * decides which is visible; it does not build them — building them here would
 * drag every panel's imports into the browser so one could show. The trade is
 * that every panel renders on the server each request; a panel that ever needs
 * its own query wants Suspense, not a move back across the boundary.
 *
 * `action` is whatever belongs at the far end of the row — the editing pen.
 * Passed through like the panels, and outside the `tablist` so the role stays
 * honest.
 */
export default function TabStrip({ tabs, label, panels, action = null }) {
  const [active, setActive] = useState(tabs[0].value);
  const baseId = useId();
  const tabRefs = useRef({});
  const stripRef = useRef(null);
  const indicatorRef = useRef(null);

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const indicator = indicatorRef.current;
    const strip = stripRef.current;

    if (!indicator || !strip) {
      return undefined;
    }

    function place() {
      const node = tabRefs.current[active];

      if (!node) {
        return;
      }

      indicator.style.width = `${node.offsetWidth}px`;
      indicator.style.transform = `translateX(${node.offsetLeft}px)`;
    }

    place();

    // Armed one frame late, and only after the first placement: set up front,
    // the bar visibly slides in from the left edge on load.
    const frame = requestAnimationFrame(() => {
      indicator.style.transition = reduceMotion
        ? "none"
        : `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1), width ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    });

    // Tab widths move when the container does — and once more when the display
    // font finishes swapping in, which lands after the first placement.
    const observer = new ResizeObserver(place);
    observer.observe(strip);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active, reduceMotion]);

  function focusTab(value) {
    setActive(value);
    tabRefs.current[value]?.focus();
  }

  function handleKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.value === active);

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab(tabs[(index + 1) % tabs.length].value);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusTab(tabs[(index - 1 + tabs.length) % tabs.length].value);
        break;
      case "Home":
        event.preventDefault();
        focusTab(tabs[0].value);
        break;
      case "End":
        event.preventDefault();
        focusTab(tabs[tabs.length - 1].value);
        break;
      default:
        break;
    }
  }

  return (
    <div>
      {/*
        Four nested elements, each doing one job. The outer is the row and
        carries the rule, so the line runs full width whether or not anything
        sits at the far end. The next scrolls, because four tabs in a serif
        overflow a phone. The third is the positioning context and sits INSIDE
        the scroller, so the sliding bar travels with the tabs. The innermost is
        the tablist proper, holding nothing but tabs — the bar is a sibling, so
        the ARIA role stays honest.
      */}
      <div className="flex items-stretch gap-2 border-b border-gold/15">
        <div className="scroll-gold min-w-0 flex-1 overflow-x-auto">
          <div className="relative w-max min-w-full">
            <div
              ref={stripRef}
              role="tablist"
              aria-label={label}
              onKeyDown={handleKeyDown}
              className="flex gap-1"
            >
              {tabs.map((tab) => {
                const isActive = tab.value === active;

                return (
                  <button
                    key={tab.value}
                    ref={(node) => {
                      tabRefs.current[tab.value] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${tab.value}`}
                    aria-selected={isActive}
                    aria-controls={`${baseId}-panel-${tab.value}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActive(tab.value)}
                    className={`shrink-0 px-4 py-3 font-display text-sm font-medium tracking-wide transition-colors duration-300 ${
                      isActive ? "text-gold" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-gold shadow-[0_0_12px] shadow-gold/70"
            />
          </div>
        </div>

        {/* Centred against the tabs rather than stretched: a button as tall as
            the row would sit low. */}
        {action && (
          <div className="flex shrink-0 items-center pb-1">{action}</div>
        )}
      </div>

      {/*
        Every panel is mounted; the inactive ones are `hidden`. It used to be
        one element whose children were swapped, which meant switching tabs
        unmounted the panel you left and destroyed everything in it.

        That is invisible while panels are static text, and it is not: the
        campaign map remembers whether its full-resolution image has been
        loaded, and losing that on a tab switch made the next open download it
        again. Anything a panel ever holds — a scroll position, a half-typed
        field, an open disclosure — had the same fate.

        An inactive panel is collapsed rather than `hidden`: `display: none`
        leaves in one frame, so the card had no second height to travel towards.
        `.tab-shell` in globals.css also takes it out of the accessibility tree,
        the tab order and Ctrl+F — the three things `hidden` was here for.
      */}
      {tabs.map((tab) => {
        const isActive = tab.value === active;

        return (
          <div
            key={tab.value}
            data-state={isActive ? "open" : "collapsed"}
            className="tab-shell"
          >
            <div className="tab-clip">
              <div
                role="tabpanel"
                id={`${baseId}-panel-${tab.value}`}
                aria-labelledby={`${baseId}-tab-${tab.value}`}
                // The ARIA pattern wants a tab stop only where the panel holds
                // nothing focusable; a panel with its own controls gets a
                // redundant one in front of them. Defaults to a stop, so a tab
                // that says nothing keeps today's behaviour.
                tabIndex={tab.focusable === false ? undefined : 0}
                className={`tab-panel py-6 ${
                  isActive
                    ? "motion-safe:animate-[tab-panel-in_380ms_var(--ease-tray)]"
                    : ""
                }`}
              >
                {panels[tab.value]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
