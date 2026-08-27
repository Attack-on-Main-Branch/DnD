"use client";

import { useState } from "react";

import AbilityPillars from "@/app/components/ui/ability-pillars";

import PartyPills from "@/app/dashboard/party-pills";
import TablePopover, { POPOVER_BODY_CLASSES } from "./table-popover";

/**
 * The scores and the skills, above the map beside the pack. The sections arrive
 * already rendered — the character sheet's own, out of character-stats.jsx.
 *
 * Whose sheets are in `panels` is decided in load-table.js: a player is handed
 * their own, the head of the table the whole party's. The pills are the pack's
 * without its "All party" — there is nothing to DO to six sheets at once — and
 * they appear only where there is a choice to make.
 *
 * TWO PAGES AND NOT ONE SCROLL. A sheet is now six scores, eighteen skills, two
 * rests, a bar, five vitals, two lists of proficiencies and a grid of features —
 * far past what a panel 36rem tall can hold, and a reader looking for their
 * passive perception should not have to scroll past their own skills to find
 * it. So it is cut where the subject changes: what the numbers ARE, then what
 * they let this character DO.
 *
 * BOTH PAGES ARE MOUNTED and the one behind is `inert`, which is what makes the
 * slide a slide: a page that unmounted would take its own scroll position and
 * any open tooltip with it every time somebody turned back.
 */
export default function AbilitySheet({ label, members, panels }) {
  const [chosen, setChosen] = useState(members[0].id);
  const [page, setPage] = useState(0);

  // The party can change under an open panel; whoever is left comes first.
  const reading = members.find((one) => one.id === chosen) ?? members[0];
  const sheet = panels[reading.id];

  return (
    <TablePopover
      icon={AbilityPillars}
      label={label}
      title={`${reading.name}’s scores`}
      meta={<PageSwitch page={page} onTurn={setPage} />}
    >
      <div
        className={`scroll-gold overflow-x-hidden overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
      >
        {members.length > 1 && (
          <div className="mb-5">
            <PartyPills
              members={members}
              chosen={reading.id}
              onChoose={setChosen}
              label="Whose sheet"
            />
          </div>
        )}

        {/* One grid cell, two pages stacked in it, so the panel is sized by
            whichever is showing rather than by the taller of the two. */}
        <div className="grid">
          <Page shown={page === 0} from="left">
            {sheet?.scores}
          </Page>

          <Page shown={page === 1} from="right">
            {sheet?.vitals}
          </Page>
        </div>
      </div>
    </TablePopover>
  );
}

/**
 * One page, sliding in from the side it lives on. `--ease-tray` is the tray's
 * own curve — the marks above the map morph on it, and a page turning here is
 * the same gesture at a smaller size.
 */
function Page({ shown, from, children }) {
  return (
    <div
      inert={!shown || undefined}
      aria-hidden={!shown || undefined}
      className={`col-start-1 row-start-1 transition duration-250 ease-(--ease-tray) ${
        shown
          ? "translate-x-0 opacity-100"
          : `pointer-events-none opacity-0 ${from === "left" ? "-translate-x-4" : "translate-x-4"}`
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Which page, in the header beside the name. A rail of two rather than a next
 * and a previous: there are two, both are one press away, and an arrow that
 * only ever goes one place is a control pretending to be a journey.
 */
function PageSwitch({ page, onTurn }) {
  return (
    /* ONE BUTTON AND NOT TWO. Two meant half of it was always inert — pressing
       the page you are already on did nothing, which on a control this size is
       indistinguishable from a press that missed. The whole pill turns the
       page, wherever it lands. */
    <button
      type="button"
      onClick={() => onTurn(page === 0 ? 1 : 0)}
      aria-label={
        page === 0
          ? "Page 1 of 2. Turn to the vitals, proficiencies and features"
          : "Page 2 of 2. Turn back to the scores"
      }
      className="flex cursor-pointer items-center gap-0.5 rounded-full border border-gold/20 bg-surface/50 p-0.5 transition-colors duration-300 hover:border-gold/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70"
    >
      {[0, 1].map((one) => (
        <span
          key={one}
          aria-hidden="true"
          className={`grid size-5 place-items-center rounded-full font-mono text-[11px] leading-none tabular-nums transition duration-300 ${
            page === one
              ? "bg-gold/20 text-gold shadow-[0_0_10px_-2px_rgba(255,223,156,0.8)]"
              : "text-ink/45"
          }`}
        >
          {one + 1}
        </span>
      ))}
    </button>
  );
}
