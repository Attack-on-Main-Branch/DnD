import { healthFraction, healthTier } from "sina/rules/health";

import Avatar from "@/app/components/ui/avatar";
import HealthBar from "@/app/components/ui/health-bar";
import { surfaceClasses } from "@/app/components/ui/surface";

import ArmorShield, { ArmorValue } from "./armor-shield";
import BannerIdentity from "./banner-identity";
import BannerSkinArt from "./banner-skin-art";
import { bannerSurfaceClass } from "./banner-presentation";
import { diceColorHex } from "./character-presentation";
import { healthBarClass } from "./health-presentation";
import LevelArmorFrame from "./level-armor-frame";
import LevelBadge from "./level-badge";

export default function BannerPreview({
  skin,
  character,
  diceColor = character.dice_color,
  animated = true,
}) {
  const current = character.current_hp ?? 0;
  const max = character.max_hp ?? 1;
  const tierClass = healthBarClass(healthTier(current, max));
  const bannerClass = bannerSurfaceClass(skin);

  return (
    <div
      className={surfaceClasses({
        className: `relative isolate mx-auto flex aspect-banner min-h-28 w-full flex-col rounded-xl ${bannerClass} lit-health ${tierClass}`,
      })}
    >
      <BannerSkinArt
        skin={skin}
        diceColor={diceColor}
        animated={animated}
        sizes="(max-width: 768px) 100vw, 512px"
      />
      <div className="relative col-start-1 row-start-1 flex min-w-0 flex-1 flex-col justify-center p-4">
        <BannerIdentity
          contrast={Boolean(bannerClass)}
          portrait={
            <Avatar
              src={character.avatar_url}
              color={diceColorHex(character.dice_color)}
            />
          }
          name={character.name}
          discriminator={character.discriminator}
          subtitle={`${character.race}${character.pathLabel ? ` · ${character.pathLabel}` : ""}`}
          trailing={
            <LevelArmorFrame
              level={
                <>
                  <LevelBadge>{character.level}</LevelBadge>
                  <span className="sr-only">Level {character.level}</span>
                </>
              }
              armor={
                <ArmorShield>
                  <ArmorValue
                    value={character.armor_class ?? 0}
                    name={character.name}
                  />
                </ArmorShield>
              }
            />
          }
        />
        <div className="relative mt-2.5">
          <HealthBar
            compact
            contrast={Boolean(bannerClass)}
            current={current}
            max={max}
            fraction={healthFraction(current, max)}
            tierClass={tierClass}
            temp={character.temp_hp ?? 0}
            tempMax={character.temp_hp_max ?? 0}
            label={`${character.name} health`}
          />
        </div>
      </div>
    </div>
  );
}
