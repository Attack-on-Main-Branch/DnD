"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { movementState, readCombat, turnMovement } from "sina/rules/combat";
import { FEET_PER_HEX } from "sina/rules/grid";

import CombatMark from "@/app/components/ui/combat-mark";
import { playReveal } from "@/app/components/ui/reveal-animation";
import { surfaceClasses } from "@/app/components/ui/surface";
import { useReducedMotion } from "@/app/components/use-reduced-motion";

import { endPlayerTurn } from "./combat-actions";
import { useCombatState, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";
import "./player-turn-notice.css";

export default function PlayerTurnNotice({
  campaignId,
  characterId,
  speed,
  token,
  dragFeet = 0,
}) {
  const combat = useCombatState();
  const store = useTableStore();
  const { run, resync, send } = useTableDeed(campaignId);
  const [ending, setEnding] = useState(false);
  const panelRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const ownTurn = Boolean(
    combat.inCombat && token && token.id === combat.activeTokenId,
  );
  const next =
    combat.inCombat && !ownTurn && combat.nextCharacterId === characterId;
  const movement = ownTurn ? turnMovement(combat, token) : null;
  const [heldMovement, setHeldMovement] = useState(movement);
  if (ownTurn && movement !== heldMovement) setHeldMovement(movement);

  const shown = heldMovement !== null;
  useLayoutEffect(() => {
    if (!shown) return;

    const animation = playReveal(
      panelRef.current,
      "table-detail-unfold",
      ownTurn,
    );
    let active = true;
    Promise.resolve(animation).then(
      () => {
        if (active && !ownTurn) setHeldMovement(null);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [ownTurn, reduceMotion, shown]);

  if (!shown) {
    return next ? (
      <div className="player-turn-notice player-turn-up-next">
        <p role="status" className="player-turn-next">
          You’re up next
        </p>
      </div>
    ) : null;
  }

  const moved = movement ?? heldMovement;
  const allowance = Number.isFinite(speed) ? speed : null;
  const state =
    allowance === null ? "walking" : movementState(allowance, moved);
  const previewing = ownTurn && dragFeet > 0;
  const projected = moved + (previewing ? dragFeet : 0);
  const projectedState =
    allowance === null ? "walking" : movementState(allowance, projected);
  const expanded = allowance > 0 && projectedState !== "walking";
  const limit = expanded ? allowance * 2 : allowance;

  async function finish() {
    if (!ownTurn || ending || !combat.turnId) return;
    setEnding(true);
    try {
      await run({
        work: () => endPlayerTurn(campaignId, characterId, combat.turnId),
        tell: (result) => {
          if (result.combat) {
            const settled = readCombat(result.combat);
            store.setCombat(settled);
            send({ kind: "combat", combat: settled });
          } else resync({ combat: true });
        },
        want: { combat: true, tokens: true },
      });
    } finally {
      setEnding(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className="player-turn-notice table-detail-reveal"
      data-own-turn
      data-movement={state}
      data-preview={previewing ? projectedState : undefined}
      inert={!ownTurn || undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <section
        aria-label="Your combat turn"
        className={surfaceClasses({
          className: "player-turn-panel edit-detail-content",
        })}
      >
        <div className="player-turn-heading">
          <span className="player-turn-symbol" aria-hidden="true">
            <CombatMark className="size-5" />
          </span>
          <h2 role="status">It’s your turn</h2>
          <button
            type="button"
            aria-label="End your turn"
            disabled={!ownTurn || ending || !combat.turnId}
            onClick={finish}
          >
            {ending ? "Ending…" : "End turn"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div
          className="player-turn-movement"
          style={{
            "--moved": limit > 0 ? progress(moved, limit) : "0%",
            "--movement-step":
              limit > 0 ? progress(FEET_PER_HEX, limit) : "100%",
          }}
        >
          <div className="player-movement-labels">
            <span
              className="player-movement-limit"
              data-midpoint={expanded || undefined}
            >
              Normal speed
              <strong>
                {allowance === null ? "—" : `${feet(allowance)} ft`}
              </strong>
            </span>
            {expanded && (
              <span className="player-movement-limit">
                Dashing <strong>{feet(limit)} ft</strong>
              </span>
            )}
          </div>
          <span className="sr-only">
            Moved {feet(moved)} ft.
            {previewing && ` Projected movement: ${feet(projected)} ft.`}
            {projectedState === "dashing" && " Dashing."}
            {projectedState === "out_of_range" && " Out of range."}
          </span>
          {limit > 0 && (
            <div
              className="player-movement-track"
              aria-hidden="true"
              data-dash={expanded || undefined}
            >
              {previewing && (
                <span
                  className="player-movement-preview"
                  style={{ width: progress(projected, limit) }}
                />
              )}
              <span className="player-movement-fill" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function progress(distance, limit) {
  return `${Math.min(100, (distance / limit) * 100)}%`;
}

function feet(value) {
  return String(Math.round(value * 10) / 10);
}
