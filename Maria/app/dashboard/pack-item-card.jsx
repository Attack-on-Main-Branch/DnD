import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";

import {
  categoryTagClasses,
  ITEM_CARD_CLASSES,
  itemEntrance,
  stackLabel,
} from "./inventory-presentation";

/**
 * One item, wherever it is shown: either drawer, the Inventory tab on a sheet,
 * the campaign's catalogue, a search result waiting to be handed out. No
 * `"use client"` and no hooks, so it renders on the server too; what differs
 * between the call sites is the controls, which arrive as children.
 *
 * `NESTED_CARD_CLASSES` rather than real glass — the panel around these is
 * already a backdrop root, so a nested filter samples its flat fill and returns
 * it unchanged while still costing a compositor readback. See surface.js.
 */
export default function PackItemCard({
  item,
  index = 0,
  quantity,
  children,
  onSelect,
  selected = false,
}) {
  const stack = stackLabel(quantity);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 font-display text-sm font-semibold tracking-wide text-ink">
          {item.name}
        </p>

        {stack && (
          <span className="shrink-0 rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-gold tabular-nums">
            {stack}
          </span>
        )}
      </div>

      <p className={`mt-1.5 ${categoryTagClasses(item.category)}`}>
        {item.category}
      </p>

      {item.description && <Description text={item.description} />}
    </>
  );

  /*
   * `h-full w-full` is what makes every card the same size: without them the
   * card is a flex item taking its width from its longest line and its height
   * from however many lines that came to.
   *
   * `relative hover:z-30` lets the tooltip below out from under the cards after
   * it, and the reason is not obvious: ITEM_CARD_CLASSES runs `rise` with
   * `animation-fill-mode: both`, whose last keyframe is `transform:
   * translateY(0)` — and a transform of any value, zero included, makes the
   * element a STACKING CONTEXT. So the tooltip's own z-index is trapped inside
   * one card, and lifting the whole card is what sorts them.
   */
  const shell = `relative flex h-full w-full flex-col rounded-xl border p-3.5 text-left transition duration-300 hover:z-30 ${ITEM_CARD_CLASSES}`;

  // A card that picks something is a real <button>; one that only holds
  // controls is not, or the buttons inside it would be nested in a button.
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        style={itemEntrance(index)}
        className={`${shell} cursor-pointer ${
          selected ? "border-gold/55 bg-surface/75" : NESTED_CARD_CLASSES
        }`}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      style={itemEntrance(index)}
      className={`${shell} ${NESTED_CARD_CLASSES}`}
    >
      {body}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/**
 * Two lines of the item's text, and the whole of it on hover — the app's own
 * tooltip rather than a `title`, which waits a second, cannot be styled, and
 * draws an OS-grey box over a very dark card.
 *
 * Only past a length that might actually be clipped. Sixty characters is two
 * lines at the narrowest this card is drawn, three to a row on a sheet.
 */
const CLIPPED_AT = 60;

function Description({ text }) {
  if (text.length <= CLIPPED_AT) {
    return <p className="mt-2 text-xs leading-relaxed text-ink/55">{text}</p>;
  }

  return (
    <div className="group/desc relative mt-2">
      <p className="line-clamp-2 text-xs leading-relaxed text-ink/55">{text}</p>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full left-0 z-30 mt-1 w-72 max-w-[min(18rem,80vw)] rounded-md border border-gold/25 bg-[var(--surface-96)] px-2 py-1.5 font-sans text-[0.7rem] leading-relaxed text-gold opacity-0 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.95)] transition-opacity duration-200 group-hover/desc:opacity-100"
      >
        {text}
      </span>
    </div>
  );
}

export function EmptyPack({ title = "The pack is empty", description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold/20 py-10 text-center">
      <p className="font-display text-base font-medium tracking-wide text-ink/80">
        {title}
      </p>
      <p className="max-w-sm px-4 text-xs text-ink/50">{description}</p>
    </div>
  );
}
