"use client";

import { useState } from "react";

import CardHealth from "./card-health";
import DeathSaves from "./death-saves";
import ReviveButton from "./revive-button";
import { useIsDying, useIsDead } from "./table-state";

export default function CardCondition({
  campaignId,
  characterId,
  name,
  seatCharacterId,
  actorName,
  canEdit,
  isDungeonMaster,
  controlsTarget,
}) {
  const dead = useIsDead(characterId);
  const dying = useIsDying(characterId);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-2.5 grid grid-cols-1">
      <Layer shown={!dead && !dying}>
        <CardHealth
          campaignId={campaignId}
          characterId={characterId}
          name={name}
          seatCharacterId={seatCharacterId}
          actorName={actorName}
          canEdit={canEdit}
          controlsTarget={!dead && !dying ? controlsTarget : null}
        />
      </Layer>

      <Layer shown={dying}>
        <DeathSaves
          campaignId={campaignId}
          characterId={characterId}
          name={name}
          seatCharacterId={seatCharacterId}
          canRoll={canEdit && characterId === seatCharacterId}
          canKill={isDungeonMaster}
          busy={busy}
          setBusy={setBusy}
        />
      </Layer>

      {/* The head of the table's alone. A player looking at a dead card is told
          nothing they can act on, which is the honest state of it. */}
      <Layer shown={dead && isDungeonMaster}>
        <ReviveButton
          campaignId={campaignId}
          characterId={characterId}
          name={name}
          busy={busy}
          setBusy={setBusy}
        />
      </Layer>
    </div>
  );
}

// All conditions share one grid cell so the tallest sets the banner height.
function Layer({ shown, children }) {
  return (
    <div
      inert={!shown || undefined}
      aria-hidden={!shown || undefined}
      className={`col-start-1 row-start-1 min-w-0 self-center transition-[opacity,visibility] duration-200 motion-reduce:transition-none ${shown ? "visible opacity-100" : "pointer-events-none invisible opacity-0"}`}
    >
      {children}
    </div>
  );
}
