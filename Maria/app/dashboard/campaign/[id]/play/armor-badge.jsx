"use client";

import { useState } from "react";
import { MAX_ARMOR_CLASS, parseArmorClass } from "sina/rules/death";

import { setArmorClass } from "./actions";
import { useArmorClass, useTableStore } from "./table-state";
import { useTableDeed } from "./use-table-deed";

/**
 * The shield hanging off the foot of the level ring: how hard this character is
 * to hit, in the one place the table looks when it asks.
 *
 * IT IS NOT DRAWN AT ALL FOR SOMEBODY ELSE'S CARD, and that is not a decision
 * this component makes: `campaign_party` answers with null for a shield this
 * viewer may not read, exactly as it does for a mark of inspiration.
 *
 * THE NUMBER IS A FIELD BEFORE ANYBODY TOUCHES IT. It was a button that became
 * an input on the press, and the swap was the problem: the click never reached
 * the box, so the caret had to be placed by hand — which arrived as a selection
 * a second press then wiped. `no-spin` takes the native arrows off.
 *
 * AND IT WEARS NO FOCUS RING. Base's `:focus-visible` puts a six-pixel dark
 * spread on every field, which here is a black slab across the shield.
 * `shadow-none` drops it, and nothing is lost: this box is never on the card
 * unfocused-but-editable, so the caret is the only indicator it needs.
 *
 * THE SHAPE IS AN SVG rather than a `clip-path`, and it has to be: the outline
 * has to run all the way round, and a clipped border is a border cut in half
 * along the diagonal it was clipped on. The path is straight down both sides,
 * then curved inward to a POINT — never a semicircle.
 *
 * THE RING DOES NOT PAINT OVER IT — THIS CUTS ITSELF TO FIT. Hiding the head
 * behind the circle by z-index could not work: `bg-gold/15` is fifteen per cent
 * of one colour, so the blue read straight through as a silhouette, and the two
 * top corners fell OUTSIDE the 36px circle as a pair of notches. The mask
 * removes everything inside the ring's own outline instead. No glow either —
 * the ring beside it has none.
 *
 * ITS NUMBERS ARE THE RING'S, and level-armor.jsx is where they are held to.
 * Move one and the other file moves with it.
 *
 * THE FIGURE SITS 21px DOWN AND NOT 23. The shield tapers to a point, so its
 * optical centre is above its geometric one — a number centred by measurement
 * reads as sitting low in it.
 */
const SHIELD_FILL = "#082f49";
const SHIELD_LINE = "#38bdf8";

/** Where the level ring's centre falls in this 36×44 box — see level-armor.jsx. */
const RING_CENTRE = 4;

/** Half the ring's 36px, less a hair: the cut runs UNDER its border rather than
    against its outer edge, where a shared row of pixels reads as a crack. */
const RING_RADIUS = 17.5;

/**
 * Head, shoulders, and a taper to a point. The head is drawn and masked away
 * rather than left out, because the shoulders have to leave the circle AT the
 * arc. 29 across against the ring's 36, so both corners sit well inside.
 */
const SHIELD_PATH =
  "M3.5 4 H32.5 V28 C32.5 35 24.5 38.5 18 42.5 C11.5 38.5 3.5 35 3.5 28 Z";

export default function ArmorBadge({ campaignId, characterId, name, canEdit }) {
  const armorClass = useArmorClass(characterId);

  /* What is half-typed, and null whenever nothing is. The row's own figure
     shows through the moment a press is committed or abandoned, so a change
     made at another chair is not held off the card by a field nobody is in. */
  const [typed, setTyped] = useState(null);

  const store = useTableStore();
  const { run, send } = useTableDeed(campaignId);

  if (armorClass === null) {
    return null;
  }

  /** What was typed, or nothing at all if it is not a figure or has not moved. */
  function commit() {
    const next = parseArmorClass(typed);

    setTyped(null);

    if (next === null || next === armorClass) {
      return;
    }

    store.setArmor(characterId, next);

    run({
      work: () => setArmorClass(campaignId, characterId, next),

      tell: (result) => {
        store.setArmor(characterId, result.armorClass);
        send({ kind: "armor", characterId, armorClass: result.armorClass });
      },

      want: { party: true },
    });
  }

  /* One per card, and the same string on the server as in the browser: six
     shields sharing a `mask` id would all be cut by whichever came first. */
  const maskId = `armor-ring-${characterId}`;

  return (
    /* The box IS the drawing, so the shape, the mask and the figure cannot
       drift apart. */
    <span className="relative block h-11 w-9">
      <svg
        aria-hidden="true"
        viewBox="0 0 36 44"
        className="absolute inset-0 h-full w-full"
      >
        <mask id={maskId} maskUnits="userSpaceOnUse">
          {/* White keeps, black cuts. */}
          <rect x="0" y="0" width="36" height="44" fill="#fff" />
          <circle cx="18" cy={RING_CENTRE} r={RING_RADIUS} fill="#000" />
        </mask>

        <path
          d={SHIELD_PATH}
          mask={`url(#${maskId})`}
          fill={SHIELD_FILL}
          fillOpacity="0.85"
          stroke={SHIELD_LINE}
          strokeOpacity="0.75"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {canEdit ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_ARMOR_CLASS}
          value={typed ?? String(armorClass)}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }

            /* Put back, and the caret left where it is. Blurring here would
               hand the half-typed figure to `commit`: this render's closure
               still holds it, whatever was just set. */
            if (event.key === "Escape") {
              event.preventDefault();
              setTyped(null);
            }
          }}
          aria-label={`${name} armour class`}
          className="no-spin absolute inset-x-1 top-[21px] z-10 h-4 border-none bg-transparent p-0 text-center font-display text-[12px] leading-none font-bold text-sky-200 shadow-none tabular-nums outline-none"
        />
      ) : (
        /* Somebody else's card: a figure, and the sentence that says what it
           is — the same split the level ring keeps. */
        <>
          <span
            aria-hidden="true"
            className="absolute inset-x-1 top-[21px] z-10 grid h-4 place-items-center font-display text-[12px] leading-none font-bold text-sky-200 tabular-nums"
          >
            {armorClass}
          </span>

          <span className="sr-only">{`${name} armour class ${armorClass}`}</span>
        </>
      )}
    </span>
  );
}
