"use client";

import ArmorBadge from "./armor-badge";
import LevelRing from "./level-ring";
import { useArmorClass } from "./table-state";

/**
 * The ring and the shield as one object at the end of the card's top row: the
 * level in the circle, the armour class hanging off the bottom arc of it.
 *
 * THE SHIFT IS THE WHOLE REASON THIS FILE EXISTS. A shield is 20px of extra
 * height, and hung under a ring that stays put it pushes the card's row down
 * and knocks the name off centre. So the pair is centred as a pair: the column
 * carries the shield's height whenever there is one, and the ring rides up by
 * half of it. With no shield to hang, the column is the ring alone and it sits
 * exactly where it always did.
 *
 * `-translate-y` and not a margin, so the two states interpolate: the shield
 * appears under a ring that glides up to meet it rather than a row that jumps.
 *
 * THE MARGIN IS A MEASUREMENT, not a nudge. The shield cuts its own head off
 * along the ring's outline (see armor-badge.jsx), which needs it to know where
 * the ring is: -28px puts the top of that 44px box 8px below this column's
 * origin, and the ring — 36 tall, riding 6 up — has its centre at 12. Four into
 * the box, which is the `RING_CENTRE` the mask is cut at. Change one and the
 * other changes with it.
 *
 * THE Z-INDEX IS ON THE WRAPPERS AND NOT ON THE RING. `LevelRing` carries its
 * own `z-10`, and it does nothing here: `-translate-y-1.5` opens a stacking
 * context and traps it. Two `z-auto` siblings then paint in tree order and the
 * shield — written second — covered the circle.
 *
 * TWO QUESTIONS DECIDE WHETHER THERE IS ONE. `shown` is the SEAT's — party-rail
 * asks it on the line the marks of inspiration are drawn on — and the null off
 * `campaign_party` is the ACCOUNT's. Both have to say yes, and the second alone
 * is not enough: somebody holding two characters at one table is handed both
 * their shields, and only one of them is sitting down.
 */
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
    <div className="relative flex shrink-0 flex-col items-center">
      <div
        className={`relative z-20 transition-transform duration-300 ${
          shielded ? "-translate-y-1.5" : ""
        }`}
      >
        <LevelRing characterId={characterId} atTable={atTable} />
      </div>

      {/* Pulled up until its head is INSIDE the circle rather than tucked
          beneath it, so the shoulders leave the ring at the arc. */}
      {shielded && (
        <div className="relative z-0 -mt-7">
          <ArmorBadge
            campaignId={campaignId}
            characterId={characterId}
            name={name}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}
