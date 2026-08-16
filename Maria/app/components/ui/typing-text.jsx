"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/app/components/use-reduced-motion";

/** Milliseconds per character, and the pause before the first one lands. */
const CHARACTER_MS = 70;
const START_DELAY_MS = 300;

/**
 * Types a line out one character at a time, across segments that can each
 * carry their own styling — so a greeting can stay ivory while the name it
 * ends on comes up in gold.
 *
 * The whole line is present for assistive technology from the first render and
 * the animated copy is hidden from it. A screen reader announcing a greeting
 * one letter at a time, or re-announcing it on every tick, would be unusable;
 * this way it is read once, complete, the moment the page loads.
 *
 * Under `prefers-reduced-motion` the text is simply there. No timer runs.
 */
export default function TypingText({ segments, className = "" }) {
  const reduceMotion = useReducedMotion();

  const full = segments.map((segment) => segment.text).join("");
  const [typed, setTyped] = useState(0);

  // Derived rather than assigned, so the reduced-motion path needs no effect
  // and no state write — it is simply always complete.
  const shown = reduceMotion ? full.length : typed;
  const done = shown >= full.length;

  useEffect(() => {
    if (reduceMotion || typed >= full.length) {
      return undefined;
    }

    // One timeout per character rather than an interval: the first character
    // waits longer, and a timeout cannot drift or stack up if the tab stalls.
    const timer = setTimeout(
      () => setTyped((count) => count + 1),
      typed === 0 ? START_DELAY_MS : CHARACTER_MS,
    );

    return () => clearTimeout(timer);
  }, [reduceMotion, typed, full.length]);

  // Where each segment begins in the combined string, derived rather than
  // accumulated: mutating a counter while rendering is exactly the pattern the
  // React compiler cannot reason about across re-renders, and this runs on
  // every keystroke.
  const offsets = segments.reduce(
    (acc, segment) => [...acc, acc[acc.length - 1] + segment.text.length],
    [0],
  );

  return (
    <span className={className}>
      <span className="sr-only">{full}</span>

      <span aria-hidden="true">
        {segments.map((segment, index) => {
          const start = offsets[index];

          const visible = segment.text.slice(
            0,
            Math.max(0, Math.min(segment.text.length, shown - start)),
          );

          return (
            <span key={index} className={segment.className}>
              {visible}
            </span>
          );
        })}

        {/*
          The caret keeps the line from reflowing as it fills: it is always
          rendered, and only its opacity changes once the text is complete.
        */}
        <span
          className={`ml-0.5 inline-block w-px self-stretch bg-gold align-[-0.1em] transition-opacity duration-500 ${
            done
              ? "opacity-0"
              : "animate-[typing-caret_1s_steps(2,end)_infinite]"
          }`}
          style={{ height: "1em" }}
        />
      </span>
    </span>
  );
}
