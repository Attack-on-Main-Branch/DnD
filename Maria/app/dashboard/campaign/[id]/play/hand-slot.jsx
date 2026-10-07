"use client";

import HandMark from "@/app/components/ui/hand-mark";

/**
 * What the character is holding, beside the purse. Pressed empty it lights up
 * and waits for the next item pressed; pressed holding something, it puts it
 * down. A tile dragged onto it is taken in hand directly — the drag itself is
 * the drawer's, which hands down whether this would take it and the handlers.
 */
export default function HandSlot({
  held,
  arming,
  accepting,
  over,
  dropProps,
  onPress,
}) {
  const lit = arming || over;

  const label = held
    ? `In hand: ${held.name}. Press to put it down`
    : arming
      ? "Choose an item to take in hand"
      : "Nothing in hand. Press, then choose an item";

  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={arming}
      aria-label={label}
      {...dropProps}
      className={`flex min-w-44 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition duration-300 ${
        lit
          ? "border-gold/70 bg-gold/10 text-gold shadow-[inset_0_0_20px_-8px_var(--gold-60),0_0_18px_var(--gold-25)]"
          : accepting
            ? "border-dashed border-gold/55 bg-surface/70 text-gold/80"
            : "border-gold/20 bg-surface/70 text-ink/85 shadow-[inset_0_1px_0_var(--gold-10)] hover:border-gold/45 hover:text-gold"
      }`}
    >
      <HandMark className="size-5 shrink-0" />

      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[0.625rem] leading-3.5 tracking-[0.16em] text-ink/45 uppercase">
          In hand
        </span>

        <span
          className={`block truncate font-display text-sm leading-5 tracking-wide ${
            held ? "" : "text-ink/45 italic"
          }`}
        >
          {held ? held.name : arming ? "Choose an item…" : "Empty"}
        </span>
      </span>
    </button>
  );
}
