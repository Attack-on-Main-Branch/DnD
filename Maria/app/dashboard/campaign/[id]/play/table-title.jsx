"use client";

import { TITLE_CLASSES } from "./entrance";

export default function TableTitle({
  title,
  compact = false,
  workspace = false,
}) {
  return (
    <h1
      data-table-arrival-title
      className={`min-w-0 text-center font-display font-semibold tracking-wide text-ink ${workspace ? "truncate text-4xl" : compact ? "line-clamp-2 text-xl leading-tight wrap-anywhere" : "text-3xl wrap-anywhere max-sm:text-2xl sm:text-4xl"} ${TITLE_CLASSES}`}
    >
      {title}
    </h1>
  );
}
