"use client";

import LevelArmorFrame from "@/app/dashboard/level-armor-frame";

import ArmorBadge from "./armor-badge";
import LevelRing from "./level-ring";
import { useArmorClass } from "./table-state";

export default function LevelArmor({
  campaignId,
  characterId,
  name,
  atTable,
  shown,
  canEdit,
}) {
  /* Read unconditionally, and only then asked about: a hook behind a `&&` is
     a hook that stops being called the moment somebody stands up. */
  const armorClass = useArmorClass(characterId);
  const shielded = Boolean(shown) && armorClass !== null;

  return (
    <LevelArmorFrame
      level={<LevelRing characterId={characterId} atTable={atTable} />}
      armor={
        shielded ? (
          <ArmorBadge
            campaignId={campaignId}
            characterId={characterId}
            name={name}
            canEdit={canEdit}
          />
        ) : null
      }
    />
  );
}
