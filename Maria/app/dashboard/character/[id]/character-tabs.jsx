"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useReducedMotion } from "@/app/components/use-reduced-motion";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "story", label: "Story" },
  { value: "inventory", label: "Inventory" },
  { value: "notes", label: "Notes" },
];

const SLIDE_MS = 320;

/**
 * Tabs following the ARIA authoring pattern: one tab stop for the whole strip,
 * arrow keys to move between tabs, Home/End to jump to the ends. Only the
 * active tab is reachable by Tab, which is what a screen-reader user expects
 * and what a row of four tab stops would ruin.
 *
 * The underline is one element that slides, rather than a border on each tab.
 * It is positioned imperatively from an effect: its geometry is read from the
 * DOM and written straight back, so nothing about it needs to pass through
 * React state or cause a render.
 *
 * `panels` arrives as an object of ALREADY-RENDERED elements keyed by the TABS
 * values. This decides which is visible; it does not build them. Holding them
 * here shipped all four so one could show, and dragged a 400-line catalogue
 * along for two label lookups.
 *
 * The trade: every panel renders on the server each request, shown or not. Worth
 * it while rendering is a few string lookups. If a panel ever needs its own
 * query it wants Suspense, not a move back across the boundary.
 */
export default function CharacterTabs({ panels }) {
  const [active, setActive] = useState("overview");
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

    // The transition is armed one frame late, and only after the first
    // placement. Set up front, the bar would visibly slide in from the left
    // edge on load, and it would animate again every time a resize nudges it.
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
    const index = TABS.findIndex((tab) => tab.value === active);

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab(TABS[(index + 1) % TABS.length].value);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusTab(TABS[(index - 1 + TABS.length) % TABS.length].value);
        break;
      case "Home":
        event.preventDefault();
        focusTab(TABS[0].value);
        break;
      case "End":
        event.preventDefault();
        focusTab(TABS[TABS.length - 1].value);
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
            aria-label="Character sheet sections"
            onKeyDown={handleKeyDown}
            className="flex gap-1"
          >
            {TABS.map((tab) => {
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

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        className="py-6"
      >
        {panels[active]}
      </div>
    </div>
  );
}
