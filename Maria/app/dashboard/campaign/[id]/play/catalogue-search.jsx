"use client";

import { useEffect, useRef, useState } from "react";

import { controlClasses } from "@/app/components/ui/field-styles";
import { MIN_QUERY, UPSTREAM_UNAVAILABLE } from "@/lib/catalogue-search";

const DEBOUNCE_MS = 250;
const EMPTY_ANSWER = { term: null, results: [], reachedOut: false };

export default function CatalogueSearch({
  kind,
  label,
  placeholder,
  unavailable,
  campaignId,
  openSlug,
  onOpen,
  renderRow,
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(EMPTY_ANSWER);
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
        `/api/${kind}/search?q=${encodeURIComponent(wanted)}&campaign=${encodeURIComponent(campaignId)}`,
        { signal: controller.signal },
      )
        .then((response) => (response.ok ? response.json() : {}))
        .then((body) =>
          setAnswer({
            term: wanted,
            results: body[kind] ?? [],
            reachedOut: body.reason === UPSTREAM_UNAVAILABLE,
          }),
        )
        .catch(() => {});
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, campaignId, kind]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const shown = answer.term === term ? answer : EMPTY_ANSWER;
  const searching = searchable && answer.term !== term;

  return (
    <section aria-label={`Find ${label}`}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={`Search for ${label}`}
        className={controlClasses({ className: "search-clear" })}
      />

      {shown.reachedOut && (
        <p role="status" className="mt-2 text-xs text-ink/50 italic">
          {unavailable}
        </p>
      )}

      {searchable && (
        <>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {shown.results.map((entry) => (
              <li key={entry.slug} className="flex">
                {renderRow(entry, {
                  open: openSlug === entry.slug,
                  onOpen: () => onOpen(entry),
                })}
              </li>
            ))}
          </ul>

          {shown.results.length === 0 && (
            <p className="mt-3 text-center text-sm text-ink/50 italic">
              {searching ? "Looking…" : "Nothing by that name."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
