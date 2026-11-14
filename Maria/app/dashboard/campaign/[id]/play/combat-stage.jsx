"use client";

import { useState } from "react";

import CombatTracker from "./combat-tracker";
import TokenPalette from "./token-palette";
import { useTableMaps } from "./table-maps";

export default function CombatStage({ campaignId, faces, members }) {
  const [showCombat, setShowCombat] = useState(false);
  const { hold } = useTableMaps();

  return (
    <section aria-label="Board tools" className="board-tools">
      <div
        role="group"
        aria-label="Board tools view"
        className="board-tools-switch"
      >
        <button
          type="button"
          aria-pressed={!showCombat}
          onClick={() => setShowCombat(false)}
        >
          Tokens
        </button>
        <button
          type="button"
          aria-pressed={showCombat}
          onClick={() => {
            hold(null);
            setShowCombat(true);
          }}
        >
          Combat
        </button>
      </div>
      {showCombat ? (
        <CombatTracker campaignId={campaignId} faces={faces} canManage />
      ) : (
        <div className="board-token-scroll scroll-gold">
          <TokenPalette members={members} />
        </div>
      )}
    </section>
  );
}
