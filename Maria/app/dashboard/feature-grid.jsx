"use client";

import FeatureCard from "./feature-card";

/**
 * Every feature a character holds, side by side. Two across on a phone, three
 * where there is room — the pack's own grid, because a name and a Remove is the
 * same shape as a name and a count.
 *
 * `overflow-visible` is not set anywhere and must not be: the tooltip a card
 * opens is absolutely positioned inside it, and a grid that clipped would cut
 * the panel off at its own edge.
 */
export default function FeatureGrid({
  features,
  onRemove,
  pending,
  emptyMessage = "Nothing written down yet.",
}) {
  if (features.length === 0) {
    return <p className="text-xs text-ink/50 italic">{emptyMessage}</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {features.map((feature) => (
        <li key={feature.id} className="flex flex-col">
          <FeatureCard
            feature={feature}
            onRemove={onRemove ? () => onRemove(feature) : undefined}
            disabled={pending?.has(feature.id)}
          />
        </li>
      ))}
    </ul>
  );
}
