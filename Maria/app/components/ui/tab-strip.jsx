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
 */
export default function TabStrip({ tabs, label, panels }) {
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
        Three nested elements, each doing one job. The outer scrolls, because
        four tabs in a serif overflow a phone. The middle is the positioning
        context and sits INSIDE that scroller, so the sliding bar travels with
        the tabs instead of staying pinned to the viewport edge. The inner is
        the tablist proper, holding nothing but tabs — the bar is a sibling, not
        a child, so the ARIA role stays honest.
      */}
      <div className="scroll-gold overflow-x-auto border-b border-gold/15">
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

      {/*
        Every panel is mounted; the inactive ones are `hidden`. It used to be
        one element whose children were swapped, which meant switching tabs
        unmounted the panel you left and destroyed everything in it.

        That is invisible while panels are static text, and it is not: the
        campaign map remembers whether its full-resolution image has been
        loaded, and losing that on a tab switch made the next open download it
        again. Anything a panel ever holds — a scroll position, a half-typed
        field, an open disclosure — had the same fate.

        The `hidden` attribute rather than a class, because it takes the panel
        out of the accessibility tree as well as off the screen. It also fixes
        the ids: each tab's `aria-controls` now names a panel that exists at all
        times, where before it pointed at an id that only appeared while that
        tab was the active one.
      */}
      {tabs.map((tab) => (
        <div
          key={tab.value}
          role="tabpanel"
          id={`${baseId}-panel-${tab.value}`}
          aria-labelledby={`${baseId}-tab-${tab.value}`}
          hidden={tab.value !== active}
          tabIndex={0}
          className="py-6"
        >
          {panels[tab.value]}
        </div>
      ))}
    </div>
  );
}
