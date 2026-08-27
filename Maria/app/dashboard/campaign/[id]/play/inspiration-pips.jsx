"use client";

import { MAX_INSPIRATION, mayMoveInspiration } from "sina/rules/inspiration";

import { slotPipClasses } from "@/app/dashboard/spell-presentation";

import { moveInspiration } from "./actions";
import { useCharacterInspiration, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * Three marks in the gutter beside a party card — the spell bar's own pip, stood
 * on end. Outside the card because its row is a face, a name and a ring already.
 *
 * WHO SEES THEM is the seat's question and party-rail.jsx asks it, on the line
 * the health bar is drawn on: `campaign_party` withholds a mark from anybody but
 * its owner, but "owner" there is the ACCOUNT, and somebody who owns the
 * campaign is handed the party's whether or not they are at its head.
 *
 * WHO MAY PRESS ONE is `sina/rules/inspiration`'s asymmetry — a mark is given by
 * whoever runs the session and spent by whoever holds it, so a player gets a
 * button on a lit pip and a plain dot on a dark one.
 */
export default function InspirationPips({
  campaignId,
  characterId,
  name,
  head,
  own,
}) {
  const held = useCharacterInspiration(characterId);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  // Nothing to read: a player looking at somebody else's card.
  if (held === null) {
    return null;
  }

  function press(spending) {
    const delta = spending ? -1 : 1;
    const painted = store.moveInspiration(characterId, delta);

    if (painted === null) {
      return;
    }

    run({
      work: () => moveInspiration(campaignId, characterId, delta),

      tell: (result) => {
        /* Only while this press is still the last word: an older answer laid
           down here would light a mark somebody has since spent again. */
        if (
          store.reconcileInspiration(characterId, painted, result.inspiration)
        ) {
          send({
            kind: "inspiration",
            characterId,
            inspiration: result.inspiration,
          });
        }
      },

      want: { party: true },
    });
  }

  return (
    /* Centred on the card's height, beside the whole card rather than the name.
       `z-0` leaves the roll's pill the layer above; the two share this strip. */
    <div
      role="group"
      aria-label={`${name}'s inspiration`}
      className="absolute top-1/2 right-full z-0 mr-2.5 flex -translate-y-1/2 flex-col items-center gap-1.5"
    >
      {Array.from({ length: MAX_INSPIRATION }, (_, index) => {
        /* THE COLUMN FILLS FROM THE FLOOR: a mark given lights the lowest dark
           pip, a mark spent puts out the highest lit one. */
        const lit = index >= MAX_INSPIRATION - held;

        return (
          <Pip
            key={index}
            lit={lit}
            name={name}
            mayPress={mayMoveInspiration({ head, own, spending: lit })}
            onPress={() => press(lit)}
          />
        );
      })}

      <span className="sr-only">
        {held} of {MAX_INSPIRATION} inspiration
      </span>
    </div>
  );
}

/**
 * A real `<button>` only where it can be pressed: a disabled one still takes a
 * tab stop, and across six characters that is eighteen promises nobody can keep.
 */
function Pip({ lit, name, mayPress, onPress }) {
  if (!mayPress) {
    return <span aria-hidden="true" className={slotPipClasses(lit)} />;
  }

  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={!lit}
      className={`cursor-pointer ${slotPipClasses(lit, true)}`}
      aria-label={
        lit ? `Spend a mark of ${name}'s inspiration` : `Give ${name} a mark`
      }
    />
  );
}
