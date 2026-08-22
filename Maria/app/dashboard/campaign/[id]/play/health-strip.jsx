"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import {
  healthFraction,
  healthTier,
  MAX_HP,
  parseHitPoints,
} from "sina/rules/health";

import { controlClasses } from "@/app/components/ui/field-styles";
import HealthBar from "@/app/components/ui/health-bar";
import { StepButton } from "@/app/components/ui/quantity-stepper";
import { healthBarClass } from "@/app/dashboard/health-presentation";

import { setCharacterHealth } from "./actions";
import { HEALTH_CLASSES, healthEntrance } from "./entrance";
import { useTableWire, useWireMessage } from "./table-wire";

/**
 * Health, as a band across the bottom of the board.
 *
 * A player sees the one bar they are sitting as; the Dungeon Master sees the
 * whole party and may set any of it, because damage is called out by whoever is
 * running the session. Keyed on the SEAT and never on ownership — filtering by
 * "is this mine" showed an account that owns both the campaign and characters
 * in it every bar whichever chair it had sat down in.
 *
 * The seat is a view, not a boundary: `set_character_health` decides what may
 * actually be written.
 *
 * `sina/rules/health` rather than `sina/rules/character`: this arithmetic runs
 * in the browser, and that neighbour would bring the catalogues with it.
 *
 * A bar somebody else moves moves here too, and at once: whoever writes says so
 * over the table's wire once the server has taken it, and every other band puts
 * the number up while it re-reads to confirm. See table-wire.jsx.
 */
export default function HealthStrip({
  campaignId,
  members,
  isDungeonMaster,
  seatCharacterId,
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { send } = useTableWire();

  /**
   * What the wire said, and what the server was saying when it said it. The
   * second half is what makes it expire without anything having to expire it:
   * once the server's number is no longer the one this was heard OVER, the head
   * start is done — whether it moved to this or to something set elsewhere.
   */
  const [heard, setHeard] = useState({});

  const roster = useMemo(
    () => new Map(members.map((member) => [member.id, member.current_hp])),
    [members],
  );

  useWireMessage("health", (message) => {
    const hitPoints = parseHitPoints(message.hitPoints);

    // The same bounds the writer's own action used, and a character this band
    // already has from the server.
    if (hitPoints === null || !roster.has(message.characterId)) {
      return;
    }

    setHeard((current) => ({
      ...current,
      [message.characterId]: {
        hitPoints,
        over: roster.get(message.characterId),
      },
    }));

    startTransition(() => router.refresh());
  });

  const told = useCallback(
    (characterId, hitPoints) =>
      send({ kind: "health", characterId, hitPoints }),
    [send],
  );

  const shown = (
    isDungeonMaster
      ? members
      : members.filter((member) => member.id === seatCharacterId)
  ).map((member) => {
    const said = heard[member.id];

    return said && member.current_hp === said.over
      ? { ...member, current_hp: said.hitPoints }
      : member;
  });

  if (shown.length === 0) {
    return null;
  }

  return (
    <section
      className={`w-full ${HEALTH_CLASSES}`}
      style={healthEntrance()}
      data-slide="down"
      aria-label={isDungeonMaster ? "Party health" : "Your health"}
    >
      {/* Three across on a wide screen and six in two rows, which keeps a
          full party inside 1080p without shrinking the bars. One bar takes no
          grid at all: in the first cell of three it sat hard against the left
          edge of the page. */}
      <ul
        className={
          shown.length === 1
            ? "mx-auto w-full max-w-4xl"
            : "grid gap-x-10 gap-y-4 sm:grid-cols-2 xl:grid-cols-3"
        }
      >
        {shown.map((member) => (
          <li key={member.id}>
            <HealthRow
              campaignId={campaignId}
              member={member}
              onWritten={told}
              // The Dungeon Master holds the pen over the whole table; a
              // player over the character they are sitting as, alone.
              canEdit={isDungeonMaster || member.id === seatCharacterId}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HealthRow({ campaignId, member, canEdit, onWritten }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  /**
   * What one press of − or + is worth. An amount rather than a target, because
   * that is the sentence said out loud at a table: seven damage, four healed.
   * Empty to begin with, and both buttons wait until there is one.
   */
  const [amount, setAmount] = useState("");
  const step = Number(amount);
  const typed = amount.trim() !== "" && Number.isFinite(step) && step > 0;

  /**
   * The bar moves on the press and the server catches up behind it, reverting
   * by itself if the write is refused.
   *
   * The reducer takes the CHANGE, not the result: a finished total would be
   * computed against a row that has not moved yet, so two quick presses would
   * both aim at the same number instead of stacking.
   */
  const [current, adjust] = useOptimistic(member.current_hp, (base, delta) =>
    Math.min(MAX_HP, Math.max(0, base + delta)),
  );

  function apply(delta) {
    const next = Math.min(MAX_HP, Math.max(0, current + delta));

    // Already at the floor or the ceiling: nothing to send.
    if (next === current) {
      return;
    }

    setError(null);

    startTransition(async () => {
      adjust(delta);

      const result = await setCharacterHealth(campaignId, member.id, next);

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      // Only once it is written: a number told to the table before the database
      // has taken it is a number that might yet be refused.
      onWritten(member.id, result.hitPoints);
    });
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <HealthBar
            current={current}
            max={MAX_HP}
            fraction={healthFraction(current, MAX_HP)}
            tierClass={healthBarClass(healthTier(current, MAX_HP))}
            heading={member.name}
            label={`${member.name} health`}
          />
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing((was) => !was)}
            aria-expanded={editing}
            aria-label={
              editing
                ? `Stop editing ${member.name} hit points`
                : `Edit ${member.name} hit points`
            }
            // Ink alone now. The halo these marks used to carry was a box
            // tucked INSIDE an outline drawing, and a solid one has no inside
            // to tuck it into — it came out as a smudge under the shape.
            className="relative mb-0.5 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink/60 transition-colors duration-300 hover:text-gold focus-visible:text-gold"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {/* Mounted either way so it can unfold rather than appear: a height
          cannot interpolate from `auto`, so `grid-rows-[0fr]` to `[1fr]` is
          what animates a box of unknown height. `inert` keeps the closed one
          out of the tab order. */}
      <div
        inert={!editing || undefined}
        className={`tray-fold ${editing ? "" : "tray-folded"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
            <StepButton
              onClick={() => apply(-step)}
              disabled={isPending || !typed || current === 0}
              label={`Take hit points from ${member.name}`}
            >
              −
            </StepButton>

            {/* The field's width is `w-20` on the wrapper, not on the input:
                `controlClasses` already carries `w-full`, and two width
                utilities on one element are settled by the order Tailwind
                emits them rather than the order they are written in. */}
            <div className="w-20 shrink-0">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_HP}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isPending}
                placeholder="10"
                aria-label="Hit points to give or take"
                className={controlClasses({
                  className: "no-spin text-center tabular-nums",
                })}
              />
            </div>

            <StepButton
              onClick={() => apply(step)}
              disabled={isPending || !typed || current === MAX_HP}
              label={`Give hit points to ${member.name}`}
            >
              +
            </StepButton>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * An ordinary pencil, for the one control that writes on the sheet. Solid
 * artwork filled with `currentColor`, derived from the source file in the
 * repository's own `/assets/icons`, which is not committed — see
 * play/dice-glyphs.jsx for the rest of the set.
 */
function PencilIcon() {
  return (
    <svg
      viewBox="0 0 512.000000 512.000000"
      fill="currentColor"
      aria-hidden="true"
      className="size-6"
    >
      <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)">
        <path d="M4730 5113 c-553 -56 -1057 -161 -1502 -312 -253 -86 -481 -182 -534 -224 -18 -15 -83 -118 -169 -268 -76 -134 -147 -257 -158 -274 l-19 -30 7 122 c9 156 -8 192 -86 193 -29 0 -63 -19 -185 -102 -176 -120 -372 -262 -504 -367 -226 -180 -426 -365 -436 -405 -10 -40 23 -80 67 -84 31 -2 45 8 140 97 203 189 434 371 731 579 65 45 119 82 120 82 2 0 4 -69 5 -154 2 -163 11 -204 52 -226 35 -18 79 -12 110 18 16 15 115 178 220 363 105 185 197 341 204 346 20 16 261 117 397 166 411 148 813 239 1440 323 l44 6 -97 -93 c-54 -50 -109 -101 -123 -111 -40 -32 -58 -75 -44 -108 14 -33 62 -57 90 -44 21 10 323 288 376 346 45 50 47 97 5 139 -30 30 -49 33 -151 22z" />
        <path d="M4178 4490 c-27 -16 -186 -205 -269 -320 -205 -282 -306 -493 -468 -973 -99 -292 -159 -442 -224 -556 l-42 -75 -584 -146 c-539 -134 -585 -148 -607 -173 -28 -32 -30 -66 -9 -107 12 -23 29 -33 83 -50 108 -33 297 -68 437 -80 72 -7 141 -14 155 -17 l25 -5 -30 -24 c-199 -164 -507 -325 -775 -403 -135 -40 -1000 -211 -1000 -198 0 13 160 321 195 376 l25 41 190 0 c177 0 191 1 210 20 26 26 26 74 0 100 -18 18 -33 20 -165 20 -99 0 -145 4 -145 11 0 17 183 296 290 444 259 357 571 708 898 1012 l133 123 204 0 c192 0 206 1 225 20 24 24 26 67 4 98 -14 21 -22 22 -135 22 -65 0 -119 3 -119 8 1 19 406 325 621 470 116 77 131 99 104 151 -9 19 -26 32 -46 36 -27 6 -45 -2 -147 -71 -448 -297 -912 -690 -1276 -1079 -72 -77 -134 -141 -138 -143 -5 -2 -8 53 -8 121 0 124 0 126 -26 146 -15 12 -34 21 -44 21 -10 0 -29 -9 -44 -21 l-26 -20 0 -211 0 -210 -94 -116 c-299 -373 -561 -784 -781 -1222 l-67 -133 -29 49 c-96 162 -162 455 -142 627 l8 67 103 -89 c57 -49 115 -92 128 -95 34 -9 76 13 93 49 11 24 12 34 1 59 -69 170 -94 284 -110 516 l-11 152 42 71 c40 70 133 203 224 320 51 66 54 83 24 121 -23 29 -73 36 -101 14 -47 -39 -253 -329 -303 -427 -23 -45 -25 -62 -25 -169 0 -106 18 -292 36 -381 l7 -35 -32 25 c-102 77 -110 80 -161 54 -39 -20 -46 -36 -60 -134 -20 -135 -8 -373 25 -500 40 -154 115 -321 188 -419 l25 -33 -25 -57 c-86 -193 -403 -1052 -403 -1092 0 -15 10 -36 25 -50 42 -39 15 -52 581 276 182 105 238 130 342 150 134 26 261 14 389 -35 40 -16 150 -78 245 -138 294 -187 351 -208 558 -207 l135 0 280 83 c264 78 285 83 375 83 70 0 113 -6 162 -21 63 -20 70 -21 98 -6 34 18 48 56 31 91 -24 54 -172 90 -330 81 -82 -4 -136 -16 -361 -82 -239 -71 -275 -79 -370 -83 -175 -7 -230 13 -500 186 -90 58 -192 118 -226 133 -207 94 -463 99 -674 13 -33 -13 -166 -85 -297 -160 -131 -75 -241 -138 -245 -141 -8 -4 4 32 102 297 40 107 76 207 82 223 l10 27 564 0 565 0 24 26 c30 33 34 92 8 122 -10 12 -56 35 -103 52 -112 40 -170 80 -288 198 l-97 98 260 52 c359 72 503 117 730 227 209 101 429 250 563 380 51 50 62 67 62 94 0 81 -33 97 -220 104 -158 6 -406 36 -393 47 4 4 215 59 467 121 285 71 471 122 490 134 76 51 187 291 330 712 116 341 149 424 237 593 106 201 227 376 392 563 59 67 77 95 77 117 0 55 -63 88 -112 60z m-3035 -3287 c28 -14 102 -75 170 -141 l122 -117 -187 -3 c-104 -1 -273 -1 -377 0 l-190 3 49 114 c27 62 52 117 57 122 14 14 247 58 278 52 17 -3 52 -16 78 -30z" />
        <path d="M3613 180 c-46 -19 -57 -83 -20 -117 12 -12 47 -29 77 -39 50 -16 107 -19 590 -22 534 -3 536 -3 563 18 35 28 36 72 2 105 l-24 25 -508 0 c-417 0 -519 3 -563 15 -90 24 -94 25 -117 15z" />
      </g>
    </svg>
  );
}
