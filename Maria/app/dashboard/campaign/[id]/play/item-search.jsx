"use client";

import { useEffect, useRef, useState } from "react";

import { controlClasses } from "@/app/components/ui/field-styles";
import ItemRow from "@/app/dashboard/item-row";

/**
 * The campaign's own items and the SRD's, searched together.
 *
 * Debounced rather than fired per keystroke: a warm query answers out of the
 * route's memory, but its first sighting of an item costs an upstream fetch.
 * Two guards against showing the wrong answer — the in-flight request is
 * aborted when a newer one starts, and the answer remembers WHICH TERM it
 * belongs to.
 *
 * The campaign travels with the query so the route can search its catalogue.
 * Which items that yields is RLS's to decide, not this parameter's.
 *
 * Which row is open is the DRAWER's, not this component's: there is one panel
 * under the pack, and a search hit and a carried item must not both claim it.
 */

const DEBOUNCE_MS = 250;

/** Matches MIN_QUERY in the route: below this it answers nothing anyway. */
const MIN_QUERY = 2;

const NOTHING = { term: null, items: [], reachedOut: false };

export default function ItemSearch({ campaignId, openSlug, onOpen }) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(NOTHING);

  const inFlight = useRef(null);

  const term = query.trim();
  const searchable = term.length >= MIN_QUERY;

  useEffect(() => {
    const wanted = query.trim();

    if (wanted.length < MIN_QUERY) {
      inFlight.current?.abort();
      inFlight.current = null;
      return undefined;
    }

    const timer = setTimeout(() => {
      inFlight.current?.abort();

      const controller = new AbortController();
      inFlight.current = controller;

      fetch(
        `/api/items/search?q=${encodeURIComponent(wanted)}&campaign=${encodeURIComponent(campaignId)}`,
        { signal: controller.signal },
      )
        .then((response) => (response.ok ? response.json() : { items: [] }))
        .then((body) =>
          setAnswer({
            term: wanted,
            items: body.items ?? [],
            reachedOut: body.reason === "upstream_unavailable",
          }),
        )
        // An aborted fetch rejects, and a superseded search has nothing to
        // report: whatever replaced it will set the state.
        .catch(() => {});
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, campaignId]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const shown = answer.term === term ? answer : NOTHING;
  const searching = searchable && answer.term !== term;

  return (
    <section aria-label="Find an item">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your items and the SRD — potion, longsword…"
        aria-label="Search for an item"
        className={controlClasses({ className: "search-clear" })}
      />

      {shown.reachedOut && (
        <p role="status" className="mt-2 text-xs text-ink/50 italic">
          The item catalogue could not be reached. Homebrew still works.
        </p>
      )}

      {searchable && (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {shown.items.map((item) => (
              <li key={item.slug} className="flex">
                <ItemRow
                  item={item}
                  open={openSlug === item.slug}
                  onOpen={() => onOpen(item)}
                />
              </li>
            ))}
          </ul>

          {shown.items.length === 0 && (
            <p className="mt-3 text-center text-sm text-ink/50 italic">
              {searching ? "Looking…" : "Nothing by that name."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
