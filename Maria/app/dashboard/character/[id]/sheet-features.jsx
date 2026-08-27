"use client";

import { useEffect, useRef, useState } from "react";

import {
  addCharacterFeature,
  removeCharacterFeature,
} from "@/app/actions/features";
import FeatureForm from "@/app/dashboard/feature-form";
import FeatureGrid from "@/app/dashboard/feature-grid";

/**
 * The Feature tab: what this character can do that no other tab describes, and
 * the two boxes that add one.
 *
 * THE LIST IS HELD HERE rather than revalidated, exactly as the table's notes
 * scroll holds its own: a feature belongs to one sheet, the action hands the row
 * back, and asking the route to render again would refetch a character, a
 * party, a pack, a spellbook and a shelf to put one card on screen.
 *
 * A CARD GOES UP BEFORE THE WRITE LANDS and comes back down if it is refused.
 * The optimistic row carries a temporary id — the database makes the real one —
 * and is swapped for the answer rather than left beside it.
 */
export default function SheetFeatures({ characterId, features }) {
  const [held, setHeld] = useState(features);
  const [pending, setPending] = useState(() => new Set());
  const [error, setError] = useState(null);

  /* A fresh array on every route render, which is the only time it should
     replace what this browser is holding. */
  const adopted = useRef(features);

  useEffect(() => {
    if (adopted.current === features) {
      return;
    }

    adopted.current = features;
    setHeld(features);
  }, [features]);

  async function write({ name, description }) {
    setError(null);

    /* Its own id until the database gives it one. `crypto.randomUUID` rather
       than a counter: this is a React key, and two cards made in one session
       must not be able to collide. */
    const drawn = { id: `drawn:${crypto.randomUUID()}`, name, description };

    setHeld((standing) => [...standing, drawn]);

    const result = await addCharacterFeature(characterId, {
      name,
      description,
    }).catch(() => null);

    if (!result || result.kind === "rejected") {
      setHeld((standing) => standing.filter((one) => one.id !== drawn.id));
      setError(result?.message ?? "That did not reach the sheet. Try again.");

      // Truthy is "refused": the form keeps the words rather than emptying.
      return true;
    }

    setHeld((standing) =>
      standing.map((one) => (one.id === drawn.id ? result.feature : one)),
    );

    return false;
  }

  async function strike(feature) {
    setError(null);
    setPending((standing) => new Set(standing).add(feature.id));

    const before = held;

    setHeld((standing) => standing.filter((one) => one.id !== feature.id));

    const result = await removeCharacterFeature(feature.id, characterId).catch(
      () => null,
    );

    setPending((standing) => {
      const next = new Set(standing);
      next.delete(feature.id);
      return next;
    });

    if (!result || result.kind === "rejected") {
      // The list as it stood, rather than the card put back at the end of it.
      setHeld(before);
      setError(result?.message ?? "That did not reach the sheet. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Write a feature
        </h3>

        <p className="mt-1 text-xs text-ink/50">
          Anything this character can do that the numbers do not say — a racial
          trait, a feat, a boon somebody handed them.
        </p>

        <FeatureForm onWrite={write} />
      </section>

      <section>
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Features and feats
        </h3>

        <div className="mt-3">
          <FeatureGrid
            features={held}
            onRemove={strike}
            pending={pending}
            emptyMessage="Nothing written down yet. Hover a card to read what it does."
          />
        </div>
      </section>

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
