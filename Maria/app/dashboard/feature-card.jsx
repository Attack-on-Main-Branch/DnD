"use client";

import { useRef, useState } from "react";

import { surfaceClasses } from "@/app/components/ui/surface";

/**
 * One feature: its name, a way to strike it out, and everything it actually
 * says in a panel that opens under the pointer.
 *
 * THE CARD IS THE NAME ALONE. A feat runs to a paragraph and a character can
 * hold forty of them; printed in full they would be a page nobody reads, and
 * clipped to two lines they would be forty half-sentences. So the grid is a
 * list of names and the description is one hover away.
 *
 * NOT A `title` ATTRIBUTE. That waits a second, cannot be styled, and draws an
 * OS-grey box over a very dark card — the same argument pack-item-card.jsx
 * makes for its own tooltip, and this is that tooltip with the app's glass on
 * it.
 *
 * IT FLIPS RATHER THAN OVERFLOWS. Measured on the way in, once per hover: a
 * card near the foot of a drawer opens upward instead of off the bottom of it.
 * Absolutely positioned either way, so nothing on the page moves.
 */
export default function FeatureCard({ feature, onRemove, disabled = false }) {
  const [above, setAbove] = useState(false);
  const card = useRef(null);

  /*
   * The panel is ~9rem at its tallest; anything with less than that under it
   * opens the other way. Read on enter rather than on every frame — a card does
   * not move while somebody is hovering it.
   *
   * MEASURED AGAINST WHATEVER CLIPS, and not against the window, which is what
   * cut the last line off every tooltip on the sheet: a tab panel ends a long
   * way above the fold, so there was room on SCREEN and none inside the box.
   * The nearest ancestor that clips is the one that decides.
   */
  function place() {
    const box = card.current?.getBoundingClientRect();

    if (!box) {
      return;
    }

    let floor = window.innerHeight;

    for (
      let node = card.current?.parentElement;
      node;
      node = node.parentElement
    ) {
      const style = window.getComputedStyle(node);

      if (style.overflow !== "visible" || style.clipPath !== "none") {
        floor = Math.min(floor, node.getBoundingClientRect().bottom);
      }
    }

    setAbove(floor - box.bottom < 160);
  }

  return (
    <div
      ref={card}
      onPointerEnter={place}
      onFocusCapture={place}
      className="group/feature relative"
    >
      <div
        className={surfaceClasses({
          variant: "plain",
          className:
            "flex items-center gap-2 rounded-lg border-gold/20 px-2.5 py-2 " +
            "transition duration-300 group-hover/feature:border-gold/45",
        })}
      >
        <p className="min-w-0 flex-1 truncate font-display text-xs tracking-wide text-ink/85">
          {feature.name}
        </p>

        {onRemove && (
          /* The dashboard's Retire and Delete: ink at rest, red under the
             pointer, so the warning arrives when the click is about to. */
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${feature.name}`}
            className="shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 font-display text-[12px] tracking-wide text-ink/50 transition-colors duration-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-ink/25"
          >
            Remove
          </button>
        )}
      </div>

      {/* `aria-hidden`, with the description read out of the card's own label
          instead: a tooltip that only a pointer can reach is not where a
          screen reader should have to find the text. */}
      <span
        aria-hidden="true"
        className={surfaceClasses({
          variant: "solid",
          className:
            "pointer-events-none absolute left-0 z-40 w-64 max-w-[min(16rem,80vw)] " +
            "scale-95 rounded-lg border border-gold/35 px-2.5 py-2 " +
            "font-sans text-[0.7rem] leading-relaxed text-ink/80 opacity-0 " +
            "shadow-[0_18px_40px_-20px_rgba(0,0,0,0.95)] " +
            "transition duration-150 glass-unfiltered " +
            "group-hover/feature:scale-100 group-hover/feature:opacity-100 " +
            "group-focus-within/feature:scale-100 group-focus-within/feature:opacity-100 " +
            (above ? "bottom-full mb-1.5" : "top-full mt-1.5"),
        })}
      >
        <span className="mb-1 block font-display text-[0.7rem] font-semibold tracking-wide text-gold">
          {feature.name}
        </span>
        <span className="block whitespace-pre-wrap">{feature.description}</span>
      </span>

      <span className="sr-only">
        {feature.name}. {feature.description}
      </span>
    </div>
  );
}
