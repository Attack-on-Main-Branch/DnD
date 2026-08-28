"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CONDITIONS } from "sina/rules/conditions";

import Avatar from "@/app/components/ui/avatar";
import EyeIcon from "@/app/components/ui/eye-icon";
import PartyMark from "@/app/components/ui/party-mark";
import { surfaceClasses } from "@/app/components/ui/surface";
import { conditionDress } from "@/app/dashboard/condition-presentation";

import TokenMenu from "./token-menu";

/**
 * One piece on the board: a face, what it is suffering, and what the head of the
 * table has done to it.
 *
 * The layer around it carries the picture's scale — see map-tokens.jsx — so
 * `1 / scale` here keeps a free-form piece the same size on screen at every
 * step, which means it covers less ground zoomed in than out. That is the point:
 * the zoom is how a person says precisely where. ON A GRID it does the opposite,
 * because the cell is now the unit of "where" and a piece that shrank as you
 * leaned in would stop filling the square it is standing in.
 *
 * The outer span holds nothing but the place: the branches below are different
 * shapes — a rim adds to the box — so sizing it here would pin them to a shared
 * width none of them wants.
 */

/**
 * The shadow a round piece casts, written out here rather than composed from a
 * constant: a class built from a template is a class Tailwind's scanner never
 * sees.
 *
 * It is heavy, and unoffset. These pieces sit on parchment, forest and open
 * water by turns, and a board that pans and zooms has no light source to throw
 * them consistently by. The depth comes from SPREAD — the colour is already
 * near-opaque black, so a blur with no spread behind it is barely black at all.
 *
 * THE PARTY'S PIN HAS NO SUCH CLASS, because it is not a box: an outer
 * box-shadow is clipped to the border box, and on a drawing with no background
 * it draws a rectangle instead of the outline. Its own dark is cast from the
 * artwork's alpha — `.party-mark` in globals.css.
 */
const GROUND_SHADOW = "shadow-[0_0_8px_4px_rgba(0,0,0,0.9)]";

/** How far the tooltip stands off the piece it names, in viewport pixels. */
const NOTE_GAP = 10;

/**
 * How long a right button may be down, and how far it may drift, and still be a
 * CLICK asking for the menu rather than a hold measuring across the board.
 *
 * Generous on both: a menu that will not open for somebody with a slow hand is
 * worse than one that opens when they meant to measure a single cell — and a
 * measurement of no distance at all has nothing to show anyway.
 */
const MENU_HOLD_MS = 400;
const MENU_SLOP_PX = 6;

export default function MapToken({
  token,
  scale,
  cell,
  muted = false,
  onGrab,
  onMark,
  onLift,
}) {
  const discRef = useRef(null);

  /* Where the tooltip stands, in the VIEWPORT'S own pixels. Measured on the
     way in rather than laid out beside the piece: the layer around it carries
     the map's scale, so a note drawn inside would be half a centimetre of
     unreadable text zoomed out and a wall of it zoomed in. */
  const [note, setNote] = useState(null);

  /* Where the menu was opened, same coordinates and for the same reason. */
  const [menu, setMenu] = useState(null);

  /* A right button held down over this piece: when it went down and where. The
     release is what decides whether that was a measurement or a menu. */
  const rightPress = useRef(null);

  /* Whose hand may drag this one. use-map-tokens.js decides it, and the
     database decides it again. */
  const movable = token.movable && Boolean(onGrab);

  /* WHAT THE MENU HOLDS FOR THIS CHAIR. The head of the table gets all of it;
     a player gets Remove alone, over their own piece — which since the press
     stopped lifting one is the only way any of them comes off. */
  const commandable = token.commandable && Boolean(onMark);
  const removable = token.removable && Boolean(onLift);
  const hasMenu = commandable || removable;

  function show() {
    const box = discRef.current?.getBoundingClientRect();

    if (box) {
      setNote({ x: box.left + box.width / 2, y: box.top - NOTE_GAP });
    }
  }

  return (
    <span
      /* Pointer events on EVERY piece, not only the ones that can be picked up:
         the tooltip is for the whole table. A press on a piece nobody at this
         chair may move is deliberately left to bubble, so the map underneath
         still takes it as the start of a pan. */
      className={`absolute ${muted ? "" : "pointer-events-auto"} ${
        movable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      onPointerEnter={show}
      onPointerLeave={() => setNote(null)}
      onPointerDown={(event) => {
        if (event.button === 2 && hasMenu) {
          /*
           * THE RIGHT BUTTON IS THE RULER FIRST, AND THE MENU ONLY IF IT WAS A
           * CLICK. It used to open the menu on the press and stop the event
           * dead, which meant the one place you most want to measure FROM — a
           * piece — was the one place the ruler could not start.
           *
           * So nothing is stopped here: the board takes the press and begins
           * measuring from this piece's own cell. What is recorded is when and
           * where, and the release decides — see `onPointerUp`.
           */
          rightPress.current = {
            x: event.clientX,
            y: event.clientY,
            at: event.timeStamp,
          };

          setNote(null);

          return;
        }

        if (!movable || event.button !== 0 || !event.isPrimary) {
          return;
        }

        /* Or the map underneath takes this as the start of a pan and the board
           slides out from under the piece being lifted. */
        event.stopPropagation();
        event.preventDefault();

        setNote(null);
        onGrab(token, event);
      }}
      onPointerUp={(event) => {
        const press = rightPress.current;

        rightPress.current = null;

        if (event.button !== 2 || !press) {
          return;
        }

        /* A CLICK AND NOT A HOLD, and not a drag either: either one of those was
           somebody measuring, and the menu opening over the answer is the last
           thing they want. */
        const held = event.timeStamp - press.at;
        const travelled =
          Math.hypot(event.clientX - press.x, event.clientY - press.y) >
          MENU_SLOP_PX;

        if (held < MENU_HOLD_MS && !travelled) {
          setMenu({ x: event.clientX, y: event.clientY });
        }
      }}
      onContextMenu={(event) => {
        // No native menu over a piece, whichever of the two the press turned
        // out to be. The board refuses its own on the same grounds.
        if (hasMenu) {
          event.stopPropagation();
          event.preventDefault();
        }
      }}
      style={{
        left: `${token.x * 100}%`,
        top: `${token.y * 100}%`,
        transform: cell
          ? "translate(-50%, -50%)"
          : `translate(-50%, -50%) scale(${1 / scale})`,
        transition: "transform 250ms ease",
        ...(cell ? { width: `${cell * 100}%`, aspectRatio: "1" } : null),
      }}
    >
      <span
        ref={discRef}
        className={`relative flex rounded-full transition-opacity duration-300 ${
          cell ? "size-full" : ""
        } ${
          /* HIDDEN is only ever drawn on the Dungeon Master's own screen: the
             SELECT policy withholds the row from everybody else, so there is no
             element in a player's document at all. */
          token.isHidden ? "opacity-50" : ""
        }`}
      >
        {/*
         * THE FILTER IS THE FACE'S AND NOT THE WHOLE PIECE'S. A CSS filter
         * applies to every descendant, so a `grayscale` up on the outer span
         * took the crimson out of the cross drawn over it and left a dead piece
         * marked in grey on grey. The cross and the badge are siblings of this,
         * outside what it desaturates.
         *
         * `brightness-60` under the grey is what keeps a pale portrait from
         * reading as a piece that is merely unlit.
         */}
        <span
          className={`flex rounded-full transition-[filter] duration-300 ${
            cell ? "size-full" : ""
          } ${token.isDead ? "grayscale brightness-60" : ""}`}
        >
          <Face token={token} cell={cell} />
        </span>

        {token.isDead && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center text-[1.6em] leading-none font-bold text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
          >
            ✕
          </span>
        )}

        {token.isHidden && (
          /* ONLY EVER ON THE DUNGEON MASTER'S OWN SCREEN: the SELECT policy
             withholds the row from everybody else, so there is no element in a
             player's document at all. The app's own drawing rather than an
             emoji — this is barely half an em across on the board, where a
             colour glyph is a smudge that renders differently on every
             platform. */
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-0.5 -bottom-0.5 grid size-[0.42em] place-items-center rounded-full bg-surface/90 text-gold ring-1 ring-gold/40"
          >
            <EyeIcon crossedOut className="size-[70%]" />
          </span>
        )}
      </span>

      {note && !menu && <TokenNote token={token} at={note} />}

      {menu && (
        <TokenMenu
          token={token}
          at={menu}
          commandable={commandable}
          removable={removable}
          onMark={(patch) => {
            onMark(token, patch);

            // Conditions stay open under the pointer; the two switches close.
            if (patch.condition === undefined) {
              setMenu(null);
            }
          }}
          onLift={() => {
            setMenu(null);
            onLift(token);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </span>
  );
}

/**
 * What the piece actually wears. Three kinds, and the rim is what tells them
 * apart at a glance:
 *
 *   a character   their portrait, gold-rimmed when it is the viewer's own —
 *                 which is how you find yourself on a crowded board
 *   the party     a gold pin stuck in the world, and no rim at all
 *   an invented   its picture, rimmed in the colour this copy was dealt
 *
 * A RING, not a coloured disc with the picture padded into it. The padded
 * version drew a second rim inside the picture's own pale one — two edges a
 * pixel apart, which is what made a round piece look badly cut out.
 */
function Face({ token, cell }) {
  if (token.isPartyMarker) {
    /*
     * The party's piece wears no face and stands in no disc: it is a pin in the
     * world, drawn straight onto the map. `size-7` is the avatar's own `xs`, so
     * it stands as tall as the faces beside it on an unruled board.
     */
    return <PartyMark className={cell ? "size-full" : "size-7"} />;
  }

  if (token.characterId) {
    return (
      <span
        className={`flex rounded-full ${GROUND_SHADOW} ${
          cell ? "size-full" : ""
        } ${token.mine ? "ring-2 ring-gold" : ""}`}
      >
        <Avatar
          src={token.src}
          colorClass={token.colorClass}
          size="xs"
          // One rim at a time: the gold one above says whose piece this is.
          ring={!token.mine}
          /* Last, so it wins over `xs`: on a ruled board the piece is the size
             of the cell it stands in, and the cell is the unit. */
          className={cell ? "size-full" : ""}
        />
      </span>
    );
  }

  /*
   * An invented piece. The rim is an inline colour and not a class, because it
   * comes off a palette in the rules layer and travels in a column — a Tailwind
   * class built from a value is one the scanner never sees. `box-border` so the
   * rim is drawn INSIDE the cell's own width rather than growing past it.
   */
  return (
    <span
      style={{ borderColor: token.ringColor }}
      className={`box-border grid place-items-center overflow-hidden rounded-full border-2 bg-surface ${GROUND_SHADOW} ${
        cell ? "size-full" : "size-7"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={token.src}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );
}

/**
 * What is under the pointer, said in the table's own glass — and NOT in a
 * `title` attribute, which is drawn in the OS palette after a delay nobody can
 * set. hover-note.jsx's reasoning, on an element that cannot use it: these sit
 * inside a layer carrying the map's transform, so the note is portalled out to
 * the viewport and placed from a measurement.
 *
 * It arrives rather than appearing: `shown` flips one frame after the mount, so
 * the transition below has two ends to travel between.
 */
function TokenNote({ token, at }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  return createPortal(
    <span
      aria-hidden="true"
      style={{ left: at.x, top: at.y }}
      className={surfaceClasses({
        variant: "solid",
        className: [
          "pointer-events-none fixed z-50 max-w-56 -translate-x-1/2 -translate-y-full",
          "rounded-lg border-gold/30 px-2.5 py-1.5",
          "transition-all duration-150 ease-out",
          shown ? "scale-100 opacity-100" : "scale-90 opacity-0",
        ].join(" "),
      })}
    >
      <span className="block truncate font-display text-xs font-semibold tracking-wide text-gold">
        {token.label}
      </span>

      {token.conditions.length > 0 && (
        <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {token.conditions.map((key) => (
            // Each in its own colour, which is how a row of them is read before
            // it is read as words. The classes are the catalogue's literals.
            <span
              key={key}
              className={`font-display text-[10px] leading-tight tracking-wide ${conditionDress(key).color}`}
            >
              {CONDITIONS[key].name}
            </span>
          ))}
        </span>
      )}

      {token.isDead && (
        <span className="mt-1 block font-mono text-[10px] tracking-[0.16em] text-rose-400 uppercase">
          Dead
        </span>
      )}

      {token.isHidden && (
        <span className="mt-1 block font-mono text-[10px] tracking-[0.16em] text-ink/50 uppercase">
          Hidden from the party
        </span>
      )}
    </span>,
    document.body,
  );
}
