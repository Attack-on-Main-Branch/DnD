import { levelBadge } from "./spell-presentation";

/**
 * One spell in a list: a name and a level, three to a row. At that width there
 * is no room for anything else, and everything a spell actually says is in the
 * panel this opens underneath.
 */
export default function SpellRow({ spell, open = false, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={open}
      aria-label={`${spell.name}, ${levelBadge(spell.level)}`}
      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition duration-300 ${
        open
          ? "border-gold/55 bg-gold/10 text-gold"
          : "border-gold/15 bg-surface/50 text-ink/85 hover:border-gold/45 hover:bg-surface/40 hover:text-gold"
      }`}
    >
      <span className="min-w-0 flex-1 truncate font-display text-xs tracking-wide">
        {spell.name}
      </span>

      <span className="shrink-0 font-mono text-[10px] text-ink/45 tabular-nums">
        {levelBadge(spell.level)}
      </span>
    </button>
  );
}
