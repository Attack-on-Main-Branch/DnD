"use client";

import CombatMark from "@/app/components/ui/combat-mark";

import CombatTracker from "./combat-tracker";
import DmTray from "./dm-tray";
import { useCombatState } from "./table-state";

/**
 * The mark that calls for initiative, first in the head of the table's box,
 * and the ladder it opens. `bare`: the ladder writes its own title row, with
 * the round beside it.
 *
 * Lit from the store and not from the box alone: a Dungeon Master who closed
 * the tracker still has to see, without opening anything, that a fight is on.
 */
export default function CombatStage({ campaignId, faces }) {
  const { inCombat } = useCombatState();

  return (
    <DmTray
      mark={
        <CombatMark
          className={`size-11 ${inCombat ? "motion-safe:animate-pulse" : ""}`}
        />
      }
      markLabel={
        inCombat
          ? "Initiative, a fight is running"
          : "Initiative and combat turns"
      }
      panelLabel="Initiative and combat turns"
      alarm={inCombat}
      bare
    >
      <CombatTracker campaignId={campaignId} faces={faces} />
    </DmTray>
  );
}
