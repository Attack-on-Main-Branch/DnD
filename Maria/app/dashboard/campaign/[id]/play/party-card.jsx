"use client";

import { memo } from "react";
import { isDying } from "sina/rules/death";

import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import { diceColorClass } from "@/app/dashboard/character-presentation";

import CardCondition from "./card-condition";
import CardConditions from "./card-conditions";
import DiceCapsule from "./dice-capsule";
import { CARD_CLASSES, cardEntrance } from "./entrance";
import InspirationPips from "./inspiration-pips";
import LevelArmor from "./level-armor";
import { useHitPoints, useIsDead } from "./table-state";

/**
 * One chair on the rail: a face, a name, the ring, and the bar under it — with
 * the marks of inspiration standing OUTSIDE its left edge, in the gutter the
 * dice capsule comes out into.
 *
 * ITS OWN FILE AND MEMOISED, because it subscribes to NOTHING: the level is read
 * inside the ring and the hit points inside the bar, so a member's numbers
 * moving re-renders the one control that shows them. Every prop is a string, a
 * boolean, or the `member` object page.jsx rendered — whose identity changes
 * only when the route does — which is what makes `memo` mean something here.
 *
 * A lit rim means somebody is here. See table-wire.jsx for the rule that is not
 * obvious: a Dungeon Master who also plays a character leaves that card dark.
 *
 * TWO STATES IT CAN BE IN BESIDES ALIVE, and both are read here rather than
 * inside a control, because both are about the WHOLE card.
 *
 * THE RIM SAYS WHICH, and not the portrait. `.lit-gold` is already the card's
 * one lit edge — it means somebody is sitting here — so amber and rose are the
 * same edge in another colour, which is how every other lit thing in this app
 * is done. A pulsing avatar said it in a second vocabulary, in the one place on
 * the card that is a picture of a person rather than a status light.
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
  const hitPoints = useHitPoints(member.id);
  const dead = useIsDead(member.id);
  const dying = isDying(hitPoints, dead);

  /* Rose for gone, amber and breathing for down, and otherwise the gold that
     means somebody is sitting here. The two states outrank the seat: a player
     who has left the table is still dead. */
  const rim = dead ? "lit-rose" : dying ? "lit-amber" : here ? "lit-gold" : "";

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
          <Avatar
            src={member.avatar_url}
            colorClass={diceColorClass(member.dice_color)}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold tracking-wide text-ink">
              {member.name}
            </p>
            <p className="font-mono text-xs text-gold/70">
              #{member.discriminator}
            </p>
            <p className="mt-0.5 truncate font-display text-[10px] tracking-[0.15em] text-ink/50 uppercase">
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
