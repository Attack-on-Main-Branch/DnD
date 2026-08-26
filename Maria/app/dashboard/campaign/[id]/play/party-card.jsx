"use client";

import { memo } from "react";

import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import CardHealth from "./card-health";
import DiceCapsule from "./dice-capsule";
import { CARD_CLASSES, cardEntrance } from "./entrance";
import InspirationPips from "./inspiration-pips";
import LevelRing from "./level-ring";

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
 */
function PartyCard({
  campaignId,
  member,
  index,
  count,
  here,
  showsHealth,
  showsInspiration,
  canEdit,
  isDungeonMaster,
  seatCharacterId,
  actorName,
}) {
  return (
    <li
      className={surfaceClasses({
        className:
          // A column now rather than a row: the bar goes under the name it
          // belongs to, and the row above it is unchanged.
          "relative flex flex-col rounded-xl p-4 " +
          // On the card rather than in `.lit-gold`, so the rim fades out when
          // that class is taken away as well as in.
          "transition-[border-color,box-shadow] duration-300 " +
          `${here ? "lit-gold " : ""}${CARD_CLASSES}`,
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

      <div className="flex items-center gap-3">
        <Avatar
          initials={characterInitials(member.name)}
          colorClass={avatarColorClass(member.color_theme)}
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
          here or from a chair on the other side of the room. */}
        <LevelRing characterId={member.id} atTable={here} />
      </div>

      {showsHealth && (
        <CardHealth
          campaignId={campaignId}
          characterId={member.id}
          name={member.name}
          seatCharacterId={seatCharacterId}
          actorName={actorName}
          canEdit={canEdit}
        />
      )}
    </li>
  );
}

export default memo(PartyCard);
