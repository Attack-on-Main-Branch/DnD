"use client";

import { memo } from "react";

import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import { diceColorHex } from "@/app/dashboard/character-presentation";
import { healthBarClass } from "@/app/dashboard/health-presentation";

import CardCondition from "./card-condition";
import CardConditions from "./card-conditions";
import DiceCapsule from "./dice-capsule";
import { CARD_CLASSES, cardEntrance } from "./entrance";
import InspirationPips from "./inspiration-pips";
import LevelArmor from "./level-armor";
import { SpellFlare } from "./spell-flares";
import {
  useHealthTier,
  useIsDying,
  useIsActiveTurn,
  useIsDead,
} from "./table-state";

/**
 * One chair on the rail: a face, a name, the ring, and the bar under it — with
 * the marks of inspiration standing OUTSIDE its left edge, in the gutter the
 * dice capsule comes out into.
 *
 * A lit rim means somebody is here, with its colour read from their health tier.
 */
function PartyCard({
  campaignId,
  member,
  index,
  count,
  here,
  showsHealth,
  showsInspiration,
  showsArmor,
  canEdit,
  isDungeonMaster,
  seatCharacterId,
  actorName,
}) {
  const tier = useHealthTier(member.id);
  const dead = useIsDead(member.id);
  const dying = useIsDying(member.id);

  /* The one thing on this card the RIM does not say: it is already three states
     deep, so the turn is a halo round the PORTRAIT instead, matching the rung
     the tracker lights. Every chair sees it, not only the head of the table. */
  const myTurn = useIsActiveTurn(member.id);

  const rim = here
    ? `lit-health ${healthBarClass(dead || dying ? "critical" : (tier ?? "healthy"))}`
    : "";

  return (
    <li
      className={surfaceClasses({
        className:
          // A column now rather than a row: the bar goes under the name it
          // belongs to, and the row above it is unchanged.
          "relative flex flex-col rounded-xl p-4 " +
          // On the card rather than in `.lit-*`, so the rim fades out when
          // that class is taken away as well as in.
          "transition-[border-color,box-shadow] duration-300 " +
          `${rim} ${CARD_CLASSES}`,
      })}
      {...cardEntrance(index, count)}
    >
      {/* Out of flow, so it answers to the card rather than to a row inside. */}
      <DiceCapsule characterId={member.id} />

      {/* Three marks in the gutter beside the card — see inspiration-pips.jsx.
          A roll's pill comes out into the same strip and passes over them, which
          is what the layers say. */}
      {showsInspiration && (
        <InspirationPips
          campaignId={campaignId}
          characterId={member.id}
          name={member.name}
          head={isDungeonMaster}
          own={member.id === seatCharacterId}
        />
      )}

      {/* Everything BUT the way back is dimmed for a dead character: the Revive
          button underneath has to stay legible, and greying out the one control
          that undoes this would be a card arguing with itself. */}
      <div
        className={`transition-all duration-500 ${
          dead ? "opacity-40 brightness-75 grayscale" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {/* The wrapper's and not the portrait's: `Avatar` clips its picture
              with `overflow-hidden`, so a shadow on it is drawn inside. */}
          <span
            className={`relative inline-flex rounded-full transition-shadow duration-300 ${
              myTurn ? "turn-lit" : ""
            }`}
          >
            <Avatar
              src={member.avatar_url}
              color={diceColorHex(member.dice_color)}
            />
            <SpellFlare characterId={member.id} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold tracking-wide text-ink">
              {member.name}
            </p>
            <p className="font-mono text-xs text-gold/70">
              #{member.discriminator}
            </p>
            <p className="mt-0.5 truncate font-display text-[0.625rem] tracking-[0.15em] text-ink/50 uppercase">
              {member.race}
              {member.pathLabel ? ` · ${member.pathLabel}` : ""}
            </p>
          </div>

          {/* The number the table is looking at, whether it came from an award
            here or from a chair on the other side of the room — and the shield
            under it, for whoever may read this card's. */}
          <LevelArmor
            campaignId={campaignId}
            characterId={member.id}
            name={member.name}
            atTable={here}
            shown={showsArmor}
            canEdit={canEdit}
          />
        </div>
      </div>

      {showsHealth && (
        <CardCondition
          campaignId={campaignId}
          characterId={member.id}
          name={member.name}
          seatCharacterId={seatCharacterId}
          actorName={actorName}
          canEdit={canEdit}
          isDungeonMaster={isDungeonMaster}
        />
      )}

      {/* LAST ON THE CARD, under the bar, because it arrives the way the
          hit-point stepper does. Public, and outside the dimming wrapper above:
          a dead character's conditions are still what the table is reading. */}
      <CardConditions characterId={member.id} />
    </li>
  );
}

export default memo(PartyCard);
