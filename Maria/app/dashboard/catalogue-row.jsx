export default function CatalogueRow({
  name,
  label,
  badge,
  open,
  onOpen,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={open}
      aria-label={label}
      className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition duration-300 max-sm:touch-manipulation ${
        open
          ? "border-gold/55 bg-gold/10 text-gold"
          : "border-gold/15 bg-surface/50 text-ink/85 hover:border-gold/45 hover:bg-surface/40 hover:text-gold"
      }`}
    >
      <span className="min-w-0 flex-1 font-display text-xs tracking-wide wrap-anywhere max-sm:text-sm">
        {name}
      </span>
      {children}
      {badge && (
        <span className="shrink-0 font-mono text-[0.625rem] text-ink/45 tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}
