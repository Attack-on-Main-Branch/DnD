"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_ITEM_QUANTITY, parseQuantity } from "sina/rules/inventory";

import { buttonClasses } from "@/app/components/ui/button";
import { controlClasses } from "@/app/components/ui/field-styles";
import QuantityStepper from "@/app/components/ui/quantity-stepper";
import PackItemCard from "@/app/dashboard/pack-item-card";

/**
 * The campaign's own items and the SRD's, searched together.
 *
 * Debounced rather than fired per keystroke: a warm query answers out of the
 * route's memory, but its first sighting of an item costs an upstream fetch.
 *
 * The campaign travels with the query so the route can search its catalogue.
 * Which items that yields is RLS's to decide, not this parameter's.
 *
 * Two guards against showing the wrong answer: the in-flight request is aborted
 * when a newer one starts, and the answer remembers WHICH TERM it belongs to,
 * so one that landed first is never shown against a query it did not answer.
 */

const DEBOUNCE_MS = 250;

/** Matches MIN_QUERY in the route: below this it answers nothing anyway. */
const MIN_QUERY = 2;

const NOTHING = { term: null, items: [], reachedOut: false };

export default function ItemSearch({
  campaignId,
  onGive,
  disabled,
  giveLabel,
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(NOTHING);
  const [chosenSlug, setChosenSlug] = useState(null);
  const [amount, setAmount] = useState(1);

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

  /* The choice is held as a slug and resolved against what is on screen, so a
     typist who narrows the search cannot hand out what they clicked three
     letters ago. */
  const shown = answer.term === term ? answer : NOTHING;
  const chosen = shown.items.find((item) => item.slug === chosenSlug) ?? null;
  const searching = searchable && answer.term !== term;

  function give() {
    if (!chosen || disabled) {
      return;
    }

    onGive(chosen, parseQuantity(amount) ?? 1);
  }

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
          {/* `auto-rows-fr` makes every card the same size and not merely
              every card in a row: a grid otherwise sizes each row to its own
              tallest card. One column on a phone, where two are unreadable. */}
          <ul className="mt-3 grid auto-rows-fr gap-2.5 sm:grid-cols-2">
            {shown.items.map((item, index) => (
              <li key={item.slug} className="flex">
                <PackItemCard
                  item={item}
                  index={index}
                  selected={item.slug === chosenSlug}
                  onSelect={() => setChosenSlug(item.slug)}
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

      {chosen && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/20 bg-surface/40 px-3.5 py-3">
          <p className="min-w-0 flex-1 truncate font-display text-sm tracking-wide text-ink/85">
            {chosen.name}
          </p>

          <QuantityStepper
            value={amount}
            min={1}
            max={MAX_ITEM_QUANTITY}
            onChange={setAmount}
            label={`How many ${chosen.name} to hand out`}
            decreaseLabel="One fewer"
            increaseLabel="One more"
            disabled={disabled}
          />

          <button
            type="button"
            onClick={give}
            disabled={disabled}
            className={buttonClasses({ variant: "primary" })}
          >
            {giveLabel}
          </button>
        </div>
      )}
    </section>
  );
}
