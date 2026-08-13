"use client";

import { useId, useRef, useState } from "react";

import {
  alignmentDetails,
  alignmentLabel,
} from "sina/rules/character";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "story", label: "Story" },
  { value: "inventory", label: "Inventory" },
];

/**
 * Tabs following the ARIA authoring pattern: one tab stop for the whole strip,
 * arrow keys to move between tabs, Home/End to jump to the ends. Only the
 * active tab is reachable by Tab, which is what a screen-reader user expects
 * and what a row of nine tab stops would ruin.
 */
export default function CharacterTabs({ character }) {
  const [active, setActive] = useState("overview");
  const baseId = useId();
  const tabRefs = useRef({});

  function focusTab(value) {
    setActive(value);
    tabRefs.current[value]?.focus();
  }

  function handleKeyDown(event) {
    const index = TABS.findIndex((tab) => tab.value === active);

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab(TABS[(index + 1) % TABS.length].value);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusTab(TABS[(index - 1 + TABS.length) % TABS.length].value);
        break;
      case "Home":
        event.preventDefault();
        focusTab(TABS[0].value);
        break;
      case "End":
        event.preventDefault();
        focusTab(TABS[TABS.length - 1].value);
        break;
      default:
        break;
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Character sheet sections"
        onKeyDown={handleKeyDown}
        className="flex gap-1 border-b border-black/10 dark:border-white/10"
      >
        {TABS.map((tab) => {
          const isActive = tab.value === active;

          return (
            <button
              key={tab.value}
              ref={(node) => {
                tabRefs.current[tab.value] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.value}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.value}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.value)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                isActive
                  ? "border-indigo-500 text-indigo-700 dark:text-indigo-300"
                  : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        className="py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        {active === "overview" && <OverviewPanel character={character} />}
        {active === "story" && <StoryPanel character={character} />}
        {active === "inventory" && <InventoryPanel />}
      </div>
    </div>
  );
}

function OverviewPanel({ character }) {
  const alignment = alignmentDetails(character.alignment);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Level" value={character.level} />
        <Fact label="Race" value={character.race} />
        <Fact label="Alignment" value={alignmentLabel(character.alignment)} />
        <Fact
          label="Created"
          value={new Date(character.created_at).toLocaleDateString()}
        />
      </dl>

      {alignment && (
        <div className="rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {alignment.description}
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Plays like:{" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {alignment.examples.join(" · ")}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function StoryPanel({ character }) {
  return (
    <div className="flex flex-col gap-6">
      <Prose title="Backstory" body={character.backstory} />
      <Prose title="Personality" body={character.personality} />
    </div>
  );
}

function Prose({ title, body }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {body ? (
        <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
          {body}
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-400 italic">Nothing written yet.</p>
      )}
    </section>
  );
}

/** Placeholder until items exist. */
function InventoryPanel() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-black/15 py-14 text-center dark:border-white/15">
      <p className="text-sm font-medium">The pack is empty</p>
      <p className="max-w-sm text-xs text-neutral-400">
        Items, coin and equipment will live here once loot exists.
      </p>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
