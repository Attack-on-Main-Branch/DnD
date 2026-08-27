"use client";

import { isDying } from "sina/rules/death";

import CardHealth from "./card-health";
import DeathSaves from "./death-saves";
import ReviveButton from "./revive-button";
import { useHitPoints, useIsDead } from "./table-state";

/**
 * The bottom half of a party card: whichever of the three a character is
 * currently in.
 *
 * Three states and one box. On their feet it is the bar; at zero it is the
 * saves; gone it is the way back, and only for whoever runs the session. The
 * one that is showing decides nothing — `apply_damage`, `roll_death_save` and
 * `revive_character` each ask again — so this is a reading of the row and not a
 * permission.
 *
 * EACH LAYER CARRIES ITS OWN HEIGHT, which is the fix for a dead card standing
 * as tall as the death saves it no longer shows: stacked in one grid cell the
 * box was always the tallest of the three. Now every layer folds to `0fr` when
 * it is not the one, so the card is the size of what is actually in it — and a
 * dead one, whose only control is a single button, comes back to very nearly the
 * height it had before there was a bar at all.
 *
 * `.tray-fold` is the same mechanism the hit-point stepper opens on, so a card
 * that grows to show the saves grows the way a card that grows to show the
 * Damage and Heal buttons does.
 */
export default function CardCondition({
  campaignId,
  characterId,
  name,
  seatCharacterId,
  actorName,
  canEdit,
  isDungeonMaster,
}) {
  const hitPoints = useHitPoints(characterId);
  const dead = useIsDead(characterId);
  const dying = isDying(hitPoints, dead);

  return (
    <>
      <Layer shown={!dead && !dying}>
        <CardHealth
          campaignId={campaignId}
          characterId={characterId}
          name={name}
          seatCharacterId={seatCharacterId}
          actorName={actorName}
          canEdit={canEdit}
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
        />
      </Layer>

      {/* The head of the table's alone. A player looking at a dead card is told
          nothing they can act on, which is the honest state of it. */}
      <Layer shown={dead && isDungeonMaster}>
        <ReviveButton
          campaignId={campaignId}
          characterId={characterId}
          name={name}
        />
      </Layer>
    </>
  );
}

/**
 * One of the three, folded away when it is not the one showing. `inert` and
 * `aria-hidden` rather than unmounting: the two behind must be out of the tab
 * order and out of the accessibility tree, and a bar that unmounted would take
 * its own open stepper with it every time somebody was knocked down.
 */
function Layer({ shown, children }) {
  return (
    <div
      inert={!shown || undefined}
      aria-hidden={!shown || undefined}
      className={`tray-fold ${shown ? "" : "tray-folded pointer-events-none"}`}
    >
      {/* `.fold-body` — see globals.css. It is what lets the row reach zero
          without slicing the health bar's aura off at the box edge. */}
      <div className="fold-body">{children}</div>
    </div>
  );
}
