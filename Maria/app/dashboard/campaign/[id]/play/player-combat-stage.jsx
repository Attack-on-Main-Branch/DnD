"use client";

import { surfaceClasses } from "@/app/components/ui/surface";

import CombatTracker from "./combat-tracker";
import { useCombatState } from "./table-state";

export default function PlayerCombatStage({ campaignId, faces }) {
  const { inCombat } = useCombatState();

  return (
    <div
      className="tab-shell min-h-0 w-full"
      data-state={inCombat ? "open" : "collapsed"}
    >
      <div className="tab-clip [overflow-clip-margin:0px]">
        <section
          data-fold
          aria-label="Initiative and combat turns"
          inert={!inCombat || undefined}
          className={surfaceClasses({
            className: `tab-panel flex max-h-96 min-h-0 flex-col overflow-hidden rounded-2xl ${
              inCombat
                ? "motion-safe:animate-[tab-panel-in_380ms_var(--ease-tray)]"
                : ""
            }`,
          })}
        >
          <CombatTracker campaignId={campaignId} faces={faces} />
        </section>
      </div>
    </div>
  );
}
