"use client";

import { useState } from "react";

import { removeCharacterFeature } from "@/app/actions/features";
import FeatureGrid from "@/app/dashboard/feature-grid";

import { useFeatures, useTableStore } from "./table-state";
import { useTableWire } from "./table-wire";

/**
 * What this character can do, at the table: a grid of names, each opening its
 * own description under the pointer.
 *
 * READ-ONLY BUT FOR THE STRIKE. A feature is WRITTEN on the sheet or from the
 * Dungeon Master's Create tab, both of which have room for a description; what
 * is useful mid-session is reading them and taking one off, so that is what the
 * drawer offers.
 *
 * THE STORE HOLDS THE LIST, so a feature granted from the Create tab in another
 * tab of the same browser — or by the Dungeon Master across the room — appears
 * here without the route rendering again. The wire carries both directions; see
 * party-rail.jsx, which is where every socket listener at this table lives.
 */
export default function FeatureShelf({ characterId, name, canEdit }) {
  const features = useFeatures(characterId);
  const [pending, setPending] = useState(() => new Set());
  const [error, setError] = useState(null);

  const store = useTableStore();
  const { send } = useTableWire();

  async function strike(feature) {
    setError(null);
    setPending((standing) => new Set(standing).add(feature.id));

    // Painted first, and put back in full if it is refused: a list is the one
    // thing that cannot be un-removed by pushing the row back on the end.
    const before = features;

    store.dropFeature(characterId, feature.id);

    const result = await removeCharacterFeature(feature.id, characterId).catch(
      () => null,
    );

    setPending((standing) => {
      const next = new Set(standing);
      next.delete(feature.id);
      return next;
    });

    if (!result || result.kind === "rejected") {
      store.setFeatures(characterId, before);
      setError(result?.message ?? "That did not reach the table. Try again.");
      return;
    }

    send({ kind: "feature", characterId, featureId: feature.id, gone: true });
  }

  return (
    <section aria-label={`${name}’s features`}>
      {/* The sheet's own section title, in the face the other five wear. */}
      <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
        Features and feats
      </h3>

      <div className="mt-3" />

      <FeatureGrid
        features={features}
        onRemove={canEdit ? strike : undefined}
        pending={pending}
        emptyMessage="Nothing written down. The sheet’s Feature tab is where one is added."
      />

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
