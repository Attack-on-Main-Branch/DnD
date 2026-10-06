import HandMark from "@/app/components/ui/hand-mark";

import { stackLabel } from "./inventory-presentation";

/**
 * One item in a list: a name and how many, three to a row. The spell list's own
 * row — at that width there is no room for a category or a sentence, and both
 * are in the panel this opens underneath.
 */
export default function ItemRow({
  item,
  quantity,
  open = false,
  inHand = false,
  onOpen,
}) {
  const stack = stackLabel(quantity);
  const name = inHand ? `${item.name}, in hand` : item.name;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={open}
      aria-label={stack ? `${name}, ${stack}` : name}
      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition duration-300 ${
        open
          ? "border-gold/55 bg-gold/10 text-gold"
          : "border-gold/15 bg-surface/50 text-ink/85 hover:border-gold/45 hover:bg-surface/40 hover:text-gold"
      }`}
    >
      <span className="min-w-0 flex-1 truncate font-display text-xs tracking-wide">
        {item.name}
      </span>

      {inHand && <HandMark className="size-3.5 shrink-0 text-gold" />}

      {stack && (
        <span className="shrink-0 font-mono text-[10px] text-ink/45 tabular-nums">
          {stack}
        </span>
      )}
    </button>
  );
}
