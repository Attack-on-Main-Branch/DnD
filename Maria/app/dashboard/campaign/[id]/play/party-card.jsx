"use client";

import { memo, useState } from "react";

import BannerSkinArt from "@/app/dashboard/banner-skin-art";
import BannerIdentity from "@/app/dashboard/banner-identity";
import { bannerSurfaceClass } from "@/app/dashboard/banner-presentation";
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
  useBannerSkin,
  useDiceLook,
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
  phone = false,
}) {
  const bannerSkin = useBannerSkin(member.id);
  const diceLook = useDiceLook(member.id);
  const diceColor = diceLook?.color ?? member.dice_color;
  const bannerClass = bannerSurfaceClass(bannerSkin);
  const [healthControlsTarget, setHealthControlsTarget] = useState(null);
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
  const inspiration = showsInspiration && (
    <InspirationPips
      inline={phone}
      campaignId={campaignId}
      characterId={member.id}
      name={member.name}
      head={isDungeonMaster}
      own={member.id === seatCharacterId}
    />
  );

  return (
    <li
      className={`relative min-w-0 ${phone ? "" : CARD_CLASSES}`}
      {...(!phone && cardEntrance(index, count))}
    >
      <div
        className={surfaceClasses({
          className:
            `relative isolate flex flex-col rounded-xl ${bannerClass} ` +
            // On the card rather than in `.lit-*`, so the rim fades out when
            // that class is taken away as well as in.
            "transition-[border-color,box-shadow] duration-300 " +
            rim,
        })}
      >
        <BannerSkinArt skin={bannerSkin} diceColor={diceColor} />

        {/* Out of flow, so it answers to the card rather than to a row inside. */}
        {!phone && <DiceCapsule characterId={member.id} />}

        {/* Three marks in the gutter beside the card — see inspiration-pips.jsx.
          A roll's pill comes out into the same strip and passes over them, which
          is what the layers say. */}
        {!phone && inspiration}

        <div
          className={`relative col-start-1 row-start-1 flex min-w-0 flex-col justify-center ${phone ? "p-2" : "p-4"}`}
        >
          {/* Everything BUT the way back is dimmed for a dead character: the Revive
          button underneath has to stay legible, and greying out the one control
          that undoes this would be a card arguing with itself. */}
          <div
            className={`relative transition-all duration-500 ${
              dead ? "brightness-75 grayscale" : ""
            }`}
          >
            <BannerIdentity
              heading={phone}
              name={member.name}
              discriminator={member.discriminator}
              subtitle={`${member.race}${member.pathLabel ? ` · ${member.pathLabel}` : ""}`}
              portrait={
                <>
                  {phone && inspiration}
                  <span
                    className={`relative inline-flex rounded-full transition-shadow duration-300 ${myTurn ? "turn-lit" : ""}`}
                  >
                    <Avatar
                      src={member.avatar_url}
                      color={diceColorHex(diceColor)}
                    />
                    <SpellFlare characterId={member.id} />
                  </span>
                </>
              }
              trailing={
                <LevelArmor
                  campaignId={campaignId}
                  characterId={member.id}
                  name={member.name}
                  atTable={here}
                  shown={showsArmor}
                  canEdit={canEdit}
                />
              }
            />
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
              controlsTarget={healthControlsTarget}
            />
          )}

          {/* LAST ON THE CARD, under the bar, because it arrives the way the
          hit-point stepper does. Public, and outside the dimming wrapper above:
          a dead character's conditions are still what the table is reading. */}
          <CardConditions characterId={member.id} />
        </div>
      </div>
      {showsHealth && canEdit && <div ref={setHealthControlsTarget} />}
    </li>
  );
}

export default memo(PartyCard);
