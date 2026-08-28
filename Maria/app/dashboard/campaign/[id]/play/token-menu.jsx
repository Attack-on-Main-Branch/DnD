"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CONDITIONS, CONDITION_KEYS } from "sina/rules/conditions";

import EyeIcon from "@/app/components/ui/eye-icon";
import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";
import { conditionDress } from "@/app/dashboard/condition-presentation";

/**
 * What the table does to a piece already standing: take it out of sight, strike
 * it down, say what it is suffering, or sweep it off.
 *
 * OPENED ON THE RIGHT BUTTON, which at this table is otherwise the ruler — see
 * table-map.jsx, where the press over a piece is kept from reaching it. It is
 * the only way a piece comes off the board now: a press that went nowhere used
 * to lift one, which meant every misjudged drag took a token off.
 *
 * FIXED TO THE PRESS AND NOT TO THE PIECE. The board pans and zooms, and a
 * popover anchored inside that layer would be drawn at the map's scale: half a
 * centimetre of unreadable menu zoomed out, and a wall of it zoomed in. The
 * point the menu opens at is where the pointer was, in the viewport's own
 * pixels, which is the one place both agree.
 *
 * `commandable` is the head of the table's three; `removable` is Remove, which
 * a player also has over their own piece.
 */

/** How near the viewport's edge the box may come before it is turned back. */
const MARGIN = 12;

/**
 * How wide it stands. WIDE ENOUGH FOR THE LONGEST CONDITION at the size the
 * fifteen are read: two columns of `Incapacitated` at 12px, inside the padding,
 * with nothing spilling past the rim. A literal, or Tailwind's scanner never
 * sees it.
 */
const MENU_WIDTH = "w-[17rem]";

const usePlacementEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function TokenMenu({
  token,
  at,
  commandable,
  removable,
  onMark,
  onLift,
  onClose,
}) {
  const boxRef = useRef(null);
  const [conditions, setConditions] = useState(false);
  const [place, setPlace] = useState(null);

  /* Read out of a ref rather than closed over, so the listener below can be
     attached ONCE — see the effect. */
  const dismiss = useRef(onClose);

  useEffect(() => {
    dismiss.current = onClose;
  });

  /**
   * Anywhere outside closes, and pointerdown rather than click so a drag that
   * starts outside does not leave it open behind the pointer.
   *
   * ON THE CAPTURE PHASE, AND ATTACHED ONCE. Both halves were needed, and the
   * bug they fix is worth writing down: a press on the BOARD went to the
   * frame's own handler first, which sets state, and React flushes a discrete
   * event's update synchronously — so the tree re-rendered while the native
   * event was still on its way up. A listener re-subscribed per render (this
   * one was: `onClose` is a fresh closure every time) had been taken off by the
   * time the event reached `document`, and the menu stayed open over the very
   * map you had clicked to dismiss it. Anywhere OFF the board closed it fine,
   * which is what made it look like the menu simply could not be closed.
   *
   * Capture runs before React sees the event at all, so nothing downstream can
   * re-render it away — or stop it, which every piece on the board does.
   */
  useEffect(() => {
    function onPointerDown(event) {
      if (!boxRef.current?.contains(event.target)) {
        dismiss.current();
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismiss.current();
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  /* Measured rather than guessed: the box grows when the conditions open, and a
     menu pressed near the foot of the window would otherwise run off it. */
  usePlacementEffect(() => {
    const box = boxRef.current;

    if (!box) {
      return;
    }

    const { width, height } = box.getBoundingClientRect();

    setPlace({
      left: Math.max(
        MARGIN,
        Math.min(at.x, window.innerWidth - width - MARGIN),
      ),
      top: Math.max(
        MARGIN,
        Math.min(at.y, window.innerHeight - height - MARGIN),
      ),
    });
  }, [at.x, at.y, conditions]);

  // Focus moves in with the menu, or Escape has nothing to catch.
  useEffect(() => {
    boxRef.current?.querySelector("button")?.focus({ preventScroll: true });
  }, []);

  const held = token.conditions;

  /**
   * A CHARACTER IS NOT KILLED FROM THE BOARD. Their card already carries the
   * whole of it — hit points, three death saves, the blow that finishes
   * somebody down, and the revival — and offering a second door onto it here
   * only asked which one was the real one. The piece still GOES grey with a
   * cross the moment the card says so; it is the reading of that fact, not
   * another way to set it.
   *
   * An invented piece and the party's marker have no card, so the row is theirs.
   */
  const mayKill = !token.characterId;

  return createPortal(
    <div
      ref={boxRef}
      role="menu"
      aria-label={`${token.label}: what the table does to it`}
      /* A PORTAL BUBBLES THROUGH THE REACT TREE, not the DOM one: without this,
         pressing a row of this menu reaches the piece it belongs to and starts
         dragging it across the board. The capture listener above is unaffected,
         running before React is involved at all. */
      onPointerDown={(event) => event.stopPropagation()}
      /* `visibility` and not a mount guard: the box has to be laid out before
         it can be measured, and a box that mounts already placed is one whose
         first frame is in the corner. */
      style={{
        left: place?.left ?? at.x,
        top: place?.top ?? at.y,
        visibility: place ? "visible" : "hidden",
      }}
      className={surfaceClasses({
        variant: "solid",
        glow: true,
        className: [
          "fixed z-50 rounded-xl border-gold/30 p-1.5",
          MENU_WIDTH,
          "motion-safe:animate-[tray-panel-in_180ms_var(--ease-tray)]",
        ].join(" "),
      })}
    >
      <p className="truncate px-2 pt-1 pb-2 font-display text-xs font-semibold tracking-wide text-gold">
        {token.label}
      </p>

      {commandable && (
        <>
          <Rule />

          <MenuButton
            glyph={<EyeIcon crossedOut={!token.isHidden} className="size-4" />}
            onClick={() => onMark({ isHidden: !token.isHidden })}
          >
            {token.isHidden ? "Reveal" : "Hide"}
          </MenuButton>

          {mayKill && (
            <>
              <Rule />

              <MenuButton
                glyph={<span className="text-sm text-rose-500">✕</span>}
                onClick={() => onMark({ isDead: !token.isDead })}
              >
                {token.isDead ? "Bring back" : "Kill"}
              </MenuButton>
            </>
          )}

          <Rule />

          <MenuButton
            glyph={<span className="text-sm">◈</span>}
            expanded={conditions}
            onClick={() => setConditions((standing) => !standing)}
          >
            Conditions
            {held.length > 0 && (
              <span className="ml-auto font-mono text-[11px] text-gold tabular-nums">
                {held.length}
              </span>
            )}
          </MenuButton>

          {conditions && (
            /* `auto-rows-fr` so a name that wraps to two lines does not leave
               its neighbour half the height — nothing is clipped and nothing
               reaches past the rim. */
            <ul className="mt-1 grid auto-rows-fr grid-cols-2 gap-1 px-1 pb-1">
              {CONDITION_KEYS.map((key) => {
                const dressed = conditionDress(key);
                const on = held.includes(key);

                return (
                  <li key={key} className="flex min-w-0">
                    {/* THE COLOUR IS THE WORD'S and the frame says on or off, as
                        on the session drawer's grid — fifteen coloured borders
                        around fifteen coloured fills is a grid with no quiet in
                        it. */}
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on}
                      onClick={() => onMark({ condition: key })}
                      className={`w-full cursor-pointer rounded-md border px-1 py-1 text-center font-display text-[12px] leading-tight tracking-tight transition duration-300 ${dressed.color} ${
                        on
                          ? "border-gold/55 bg-gold/10"
                          : "border-gold/15 bg-surface/40 hover:border-gold/40"
                      }`}
                    >
                      {CONDITIONS[key].name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {removable && (
        <>
          <Rule />

          <MenuButton
            glyph={<span className="text-sm">⤫</span>}
            tone="strike"
            onClick={onLift}
          >
            Remove from map
          </MenuButton>
        </>
      )}
    </div>,
    document.body,
  );
}

/** The hairline the header and the rail's trays carry, inset to the rows. */
function Rule() {
  return (
    <div aria-hidden="true" className="mx-2 my-1">
      <div className={FADED_RULE_CLASSES} />
    </div>
  );
}

/**
 * One row of the menu.
 *
 * THE GLYPH SITS IN A BOX OF ITS OWN, `size-4` and centred, so the words line up
 * down the menu whatever is drawn beside them — an eye is an SVG and a cross is
 * a character, and left to themselves they set two different left margins.
 */
function MenuButton({ glyph, children, onClick, expanded, disabled, tone }) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      /* `pointer-events-none` while disabled rather than a hover variant that
         has to know about it: a row that cannot be pressed should not light up
         under the pointer either. */
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left font-display text-xs tracking-wide transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-35 ${
        tone === "strike"
          ? "text-ink/60 hover:bg-red-500/10 hover:text-red-400"
          : "text-ink/80 hover:bg-gold/10 hover:text-gold"
      }`}
    >
      <span
        aria-hidden="true"
        className="grid size-4 shrink-0 place-items-center leading-none"
      >
        {glyph}
      </span>

      {children}
    </button>
  );
}
