"use client";

import { useState } from "react";
import { ALL_PARTY, CONDITIONS, CONDITION_KEYS } from "sina/rules/conditions";

import { conditionDress } from "@/app/dashboard/condition-presentation";

import { toggleCondition } from "@/app/actions/characters";

import { useConditions, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The fifteen, as a grid of switches. What the head of the table reaches for
 * when somebody is knocked prone or the whole room goes dark.
 *
 * ONE PRESS IS ONE TOGGLE, and which way it goes is the ROW's to decide, not
 * this component's: two chairs calling out "prone" in the same breath would
 * otherwise both read the same before-state and the second would take it
 * straight back off. The paint here is a guess and the answer replaces it.
 *
 * AIMED WHEREVER THE PANEL IS AIMED. One character is a toggle against their
 * own row; the whole party is `toggle_party_condition`, which reads the set
 * first and applies to everybody if anybody lacks it — a per-character toggle
 * run six times would split the party down the middle on one press.
 *
 * THE COLOURS ARE THE CATALOGUE'S. Every class string in CONDITIONS is a
 * literal, because Tailwind's scanner reads the source and never the running
 * app; nothing here assembles one.
 */
export default function ConditionsGrid({
  campaignId,
  target,
  everybody,
  members,
}) {
  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);
  const [busy, setBusy] = useState(null);

  /* Whose badges the switches read. Aimed at the party, the grid shows what
     EVERYBODY is under — the same question `toggle_party_condition` asks, so
     the lit switches and the next press agree. */
  const held = useConditions(everybody ? (members[0]?.id ?? "") : target);

  const shared = everybody
    ? CONDITION_KEYS.filter((key) =>
        members.every((one) => store.read().conditions[one.id]?.includes(key)),
      )
    : held;

  function toggle(key) {
    if (busy) {
      return;
    }

    setBusy(key);

    const aimed = everybody ? members.map((one) => one.id) : [target];
    const applied = !shared.includes(key);

    run({
      paint: () => {
        for (const id of aimed) {
          const standing = store.read().conditions[id] ?? [];

          store.setConditions(
            id,
            applied
              ? [...standing, key]
              : standing.filter((one) => one !== key),
          );
        }
      },

      work: () =>
        toggleCondition(
          everybody ? ALL_PARTY : target,
          key,
          campaignId,
          null,
          /* Who the panel's menu is aimed at. Without it the database read
             every member of the campaign, so aiming at two frightened six. */
          everybody ? aimed : null,
        ),

      tell: (result) => {
        /* The row's own answer over the guess. A party press reports only which
           way it went, so the same list is laid on every card it reached. */
        const byCharacter = {};

        for (const id of result.characterIds ?? aimed) {
          const standing = store.read().conditions[id] ?? [];
          const next = result.conditions
            ? result.conditions
            : result.applied
              ? [...standing, key]
              : standing.filter((one) => one !== key);

          store.setConditions(id, next);
          byCharacter[id] = store.read().conditions[id];
        }

        send({ kind: "conditions", byCharacter });
      },

      /* No activity: a condition leaves no line — see 20260915090000. */
      want: { party: true },
    }).finally(() => setBusy(null));
  }

  return (
    <section aria-label="Conditions">
      <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink/45 uppercase">
        Conditions / Status effects
      </h3>

      <ul className="mt-2.5 grid grid-cols-3 gap-2">
        {CONDITION_KEYS.map((key) => {
          const dressed = conditionDress(key);
          const on = shared.includes(key);

          return (
            <li key={key} className="flex">
              <button
                type="button"
                onClick={() => toggle(key)}
                disabled={busy !== null}
                aria-pressed={on}
                /* THE COLOUR IS THE WORD'S, and only the word's. Fifteen
                   coloured borders around fifteen coloured fills was a grid
                   with no quiet in it and no way to tell which three were lit;
                   the switch says on or off in the one gold this table uses for
                   that, and the condition keeps its own colour for reading.

                   ON AND OFF ARE THE FRAME'S TO SAY, not the word's. The unlit
                   switch carried `opacity-45`, and opacity is whole-element: it
                   took the name down with the border, so twelve of the fifteen
                   were a colour you had to lean in to read. */
                className={`w-full cursor-pointer rounded-lg border px-1.5 py-1.5 font-display text-[12px] leading-tight tracking-wide transition duration-300 disabled:cursor-not-allowed ${dressed.color} ${
                  on
                    ? "border-gold/55 bg-gold/10"
                    : "border-gold/15 bg-surface/40 hover:border-gold/40"
                }`}
              >
                {CONDITIONS[key].name}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
