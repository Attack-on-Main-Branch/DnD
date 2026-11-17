"use client";

import { surfaceClasses } from "@/app/components/ui/surface";

import CombatTracker from "./combat-tracker";

export default function PlayerCombatStage({
  campaignId,
  faces,
  seatCharacterId,
}) {
  return (
    <div
      className={surfaceClasses({
        className:
          "flex max-h-96 min-h-0 w-full flex-col overflow-hidden rounded-2xl empty:hidden",
      })}
    >
      <CombatTracker
        campaignId={campaignId}
        faces={faces}
        seatCharacterId={seatCharacterId}
      />
    </div>
  );
}
