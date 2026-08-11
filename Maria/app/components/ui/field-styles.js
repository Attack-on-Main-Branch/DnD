/**
 * Shared chrome for every form control, so a text input, a select and a
 * textarea are visually the same object. Imported by the field components in
 * this folder — components use these, screens use the components.
 */

const BASE =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-400 outline-none transition focus:ring-2 " +
  "disabled:opacity-60 dark:bg-white/5 dark:text-neutral-100";

const BORDER = {
  valid:
    "border-black/15 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-white/15",
  invalid: "border-red-500/60 focus:border-red-500 focus:ring-red-500/30",
};

export function controlClasses({ invalid = false, className = "" } = {}) {
  return [BASE, invalid ? BORDER.invalid : BORDER.valid, className]
    .filter(Boolean)
    .join(" ");
}

export const LABEL_CLASSES = "text-sm font-medium";
