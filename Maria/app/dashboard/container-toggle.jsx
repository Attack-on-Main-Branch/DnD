import {
  containerTagClasses,
  containerTypeLabel,
} from "./container-presentation";

export default function ContainerToggle({ container, count, open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex w-full cursor-pointer items-center justify-between gap-3 text-left max-sm:min-h-11"
    >
      <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold tracking-wide text-ink">
        {container.name}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-[0.625rem] text-ink/45 tabular-nums">
          {count}
        </span>
        <span className={containerTagClasses(container.type)}>
          {containerTypeLabel(container.type)}
        </span>
      </span>
    </button>
  );
}
