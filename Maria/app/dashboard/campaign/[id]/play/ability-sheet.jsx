"use client";

import { useState } from "react";

import AbilityPillars from "@/app/components/ui/ability-pillars";

import PartyPills from "./party-pills";
import TablePopover, { POPOVER_BODY_CLASSES } from "./table-popover";

/**
 * The scores and the skills, above the map beside the pack. The sections arrive
 * already rendered — the character sheet's own, out of character-stats.jsx.
 *
 * Whose sheets are in `panels` is decided in load-table.js: a player is handed
 * their own, the head of the table the whole party's. The pills are the pack's
 * without its "All party" — there is nothing to DO to six sheets at once — and
 * they appear only where there is a choice to make.
 */
export default function AbilitySheet({ label, members, panels }) {
  const [chosen, setChosen] = useState(members[0].id);

  // The party can change under an open panel; whoever is left comes first.
  const reading = members.find((one) => one.id === chosen) ?? members[0];

  return (
    <TablePopover
      icon={AbilityPillars}
      label={label}
      title={`${reading.name}’s scores`}
    >
      <div
        className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
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

        {panels[reading.id]}
      </div>
    </TablePopover>
  );
}
