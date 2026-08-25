"use client";

import { useEffect, useRef, useState } from "react";

import { controlClasses } from "@/app/components/ui/field-styles";
import SpellRow from "@/app/dashboard/spell-row";

/**
 * The SRD's spells and the campaign's own, searched from either drawer.
 *
 * The item search's mechanism exactly: debounced, the in-flight request aborted
 * when a newer one starts, and the answer remembering WHICH TERM it belongs to
 * so one that landed first is never shown against a query it did not answer.
 *
 * Which row is open is the DRAWER's, not this component's — there is one panel
 * under the book and a search hit and a known spell must not both claim it.
 */

const DEBOUNCE_MS = 250;

/** Matches MIN_QUERY in the route: below this it answers nothing anyway. */
const MIN_QUERY = 2;

const NOTHING = { term: null, spells: [], reachedOut: false };

export default function SpellSearch({ campaignId, openSlug, onOpen }) {
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
        `/api/spells/search?q=${encodeURIComponent(wanted)}&campaign=${encodeURIComponent(campaignId)}`,
        { signal: controller.signal },
      )
        .then((response) => (response.ok ? response.json() : { spells: [] }))
        .then((body) =>
          setAnswer({
            term: wanted,
            spells: body.spells ?? [],
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
    <section aria-label="Find a spell">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the SRD — fireball, cure wounds…"
        aria-label="Search for a spell"
        className={controlClasses({ className: "search-clear" })}
      />

      {shown.reachedOut && (
        <p role="status" className="mt-2 text-xs text-ink/50 italic">
          The spell catalogue could not be reached.
        </p>
      )}

      {searchable && (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {shown.spells.map((spell) => (
              <li key={spell.slug} className="flex">
                <SpellRow
                  spell={spell}
                  open={openSlug === spell.slug}
                  onOpen={() => onOpen(spell)}
                />
              </li>
            ))}
          </ul>

          {shown.spells.length === 0 && (
            <p className="mt-3 text-center text-sm text-ink/50 italic">
              {searching ? "Looking…" : "Nothing by that name."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
