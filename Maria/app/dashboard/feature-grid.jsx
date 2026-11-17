"use client";

import FeatureCard from "./feature-card";

export default function FeatureGrid({
  features,
  title = "Features and feats",
  label,
  onRemove,
  onEdit,
  editingId = null,
  pending,
  emptyMessage = "Nothing written down yet.",
}) {
  return (
    <section aria-label={label ?? title} className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
        {title}
      </h3>
      {features.length === 0 ? (
        <p className="text-xs text-ink/50 italic">{emptyMessage}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.id} className="flex flex-col">
              <FeatureCard
                feature={feature}
                onRemove={onRemove ? () => onRemove(feature) : undefined}
                onEdit={onEdit ? () => onEdit(feature) : undefined}
                editing={editingId === feature.id}
                disabled={pending?.has(feature.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
