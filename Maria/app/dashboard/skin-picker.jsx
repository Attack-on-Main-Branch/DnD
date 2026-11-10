import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_GROUP_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import SelectionDot from "@/app/components/ui/selection-dot";
import PencilIcon from "@/app/components/ui/pencil-icon";

const LOCKED_NOTE = "Not found yet — open a Pouch at the table";

export default function SkinPicker({
  name,
  label,
  value,
  groups,
  unlocked,
  isUnlocked,
  allUnlocked = false,
  onChange,
  disabled,
  invalid,
  gridClassName,
  renderPicture,
  flushPicture = false,
}) {
  const options = groups.flatMap((group) => group.skins);
  const found = options.filter((option) =>
    isUnlocked(option.value, unlocked),
  ).length;

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="w-full">
        <span className="flex items-baseline justify-between gap-3">
          <span className={LABEL_CLASSES}>{label}</span>
          {!allUnlocked && (
            <span className="text-xs text-ink/50">
              {found} of {options.length} found
            </span>
          )}
        </span>
      </legend>
      <div
        className={`mt-3 space-y-5 ${invalid ? `rounded-lg ${INVALID_GROUP_CLASSES}` : ""}`}
      >
        {groups
          .filter((group) => group.skins.length > 0)
          .map((group) => (
            <div key={group.value} role="group" aria-label={group.rarity.label}>
              <p
                aria-hidden="true"
                className={`mb-2 flex items-center gap-3 font-mono text-xs tracking-wide uppercase ${group.rarity.text}`}
              >
                {group.rarity.label}
                <span className="h-px flex-1 bg-gold/10" />
              </p>
              <div className={`grid gap-3 ${gridClassName}`}>
                {group.skins.map((option) => {
                  const selected = value === option.value;
                  const locked =
                    !allUnlocked && !isUnlocked(option.value, unlocked);
                  return (
                    <label
                      key={option.value}
                      data-tooltip={locked ? LOCKED_NOTE : option.description}
                      data-tooltip-title={locked ? undefined : option.label}
                      className={`group relative isolate flex min-w-0 flex-col items-center rounded-xl border transition duration-300 select-none ${flushPicture ? "overflow-hidden" : "gap-1.5 px-3 pt-3 pb-2.5"} ${CHOICE_CARD_FOCUS_CLASSES} ${
                        locked
                          ? `cursor-not-allowed bg-surface/60 ${option.rarity.edge}`
                          : selected
                            ? `cursor-pointer bg-surface/75 ${option.rarity.edgeSelected}`
                            : `cursor-pointer bg-surface/60 hover:bg-surface/50 ${option.rarity.edge} ${option.rarity.edgeHover}`
                      }`}
                    >
                      <input
                        type="radio"
                        name={name}
                        value={option.value}
                        checked={selected}
                        disabled={locked}
                        onChange={() => onChange(option.value)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-300 ${selected ? option.rarity.glowSelected : option.rarity.glow}`}
                      />
                      {!locked && (
                        <span className="absolute top-2.5 right-2.5 z-10 flex">
                          <SelectionDot selected={selected} />
                        </span>
                      )}
                      {option.colorable && (
                        <span
                          className={`pointer-events-none absolute top-4 left-4 z-10 ${locked ? "text-ink/45" : "text-gold"}`}
                        >
                          <PencilIcon className="size-4" />
                          <span className="sr-only">Uses your dice colour</span>
                        </span>
                      )}
                      {renderPicture(option, locked)}
                      <span
                        className={`text-center font-display text-sm font-semibold tracking-wide transition-colors duration-300 ${flushPicture ? "w-full px-3 py-2.5" : ""} ${locked ? "text-ink/45" : selected ? "text-gold" : "text-ink/85"}`}
                      >
                        {locked ? (
                          <>
                            <span aria-hidden="true">???</span>
                            <span className="sr-only">Locked</span>
                          </>
                        ) : (
                          option.label
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </fieldset>
  );
}
