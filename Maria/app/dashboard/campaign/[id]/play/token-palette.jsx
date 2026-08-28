"use client";

import { useMemo } from "react";

import Avatar from "@/app/components/ui/avatar";
import PartyMark from "@/app/components/ui/party-mark";
import { diceColorClass } from "@/app/dashboard/character-presentation";

import { usePlacedTokens, useTokenTemplates } from "./table-state";
import { useTableMaps } from "./table-maps";
import { ringWorn } from "./use-map-tokens";

/**
 * The pieces to be put down — the Dungeon Master's hand.
 *
 * ON THE RAIL AND NOT IN A DRAWER, because it is used WHILE looking at the
 * board: pick a face, click a hex, pick the next.
 *
 * WHAT IS IN IT DEPENDS ON THE PICTURE, and that is the whole of the placement
 * rule made visible. The world map takes the party's marker alone — six faces
 * standing on a continent is a lie about where anybody is — so nothing else is
 * offered on it. Every other map takes the party's faces and the pieces this
 * campaign invented, and never the marker: the party IS the faces there.
 *
 * NOT GATED ON THE GRID, and it used to be. A ruled board is where a hand of
 * pieces is most use, but on a battle map with no grid the Dungeon Master had no
 * other way to deal one at all: their own chair holds no character, so a click
 * on bare map put nothing down. Off the grid a piece simply lands where it was
 * dropped — see `snap` in table-map.jsx, which passes the point through.
 *
 * The Dungeon Master's alone — page.jsx mounts it inside the branch that decides
 * that. The selection lives in table-maps.jsx, the face being on the rail and
 * the hex on the map.
 */
export default function TokenPalette({ members }) {
  const { activeId, holding, hold, isWorldMap } = useTableMaps();
  const templates = useTokenTemplates();
  const placed = usePlacedTokens();

  /**
   * The rim the NEXT copy of each piece would wear, so the hand shows what the
   * board is about to look like rather than only what it looks like now.
   *
   * A PREVIEW AND NOT THE DECISION. The colour that is actually written is
   * worked out when the piece lands — see `place` in use-map-tokens.js, which
   * reads the same function against the board as it stands at that moment.
   */
  const rims = useMemo(
    () =>
      new Map(
        templates.map((piece) => [
          piece.id,
          ringWorn(placed, activeId, piece.id),
        ]),
      ),
    [activeId, placed, templates],
  );

  // Everything else is offered on a battle map; the world map takes the one.
  const hand = isWorldMap ? [] : templates;

  if (!isWorldMap && members.length === 0 && hand.length === 0) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Place a piece"
      className="flex w-14 shrink-0 flex-col items-center gap-1.5 pt-1"
    >
      <Heading>Party</Heading>

      {isWorldMap ? (
        <Piece
          held={holding?.kind === "party"}
          onHold={() => hold(holding?.kind === "party" ? null : PARTY_PIECE)}
          label="the party's marker"
        >
          {/* The same pin the board draws — see map-token.jsx. */}
          <PartyMark className="size-10" />
        </Piece>
      ) : (
        members.map((member) => {
          const held = holding?.characterId === member.id;

          return (
            <Piece
              key={member.id}
              held={held}
              onHold={() =>
                hold(
                  held ? null : { kind: "character", characterId: member.id },
                )
              }
              label={member.name}
            >
              <Avatar
                src={member.avatar_url}
                colorClass={diceColorClass(member.dice_color)}
                size="sm"
                ring={false}
              />
            </Piece>
          );
        })
      )}

      {hand.length > 0 && (
        <>
          {/* Directly under the faces, and no rule between them: it is one hand
              with two halves, not two lists. */}
          <Heading className="pt-1.5">Tokens</Heading>

          {hand.map((piece) => {
            const held = holding?.templateId === piece.id;

            return (
              <Piece
                key={piece.id}
                held={held}
                onHold={() =>
                  hold(held ? null : { kind: "template", templateId: piece.id })
                }
                label={piece.name}
              >
                {/* The rim the next copy will wear, shown before it is dealt.
                    An inline colour, for the reason map-token.jsx gives. */}
                <span
                  style={{ borderColor: rims.get(piece.id) }}
                  className="box-border grid size-10 place-items-center overflow-hidden rounded-full border-2 bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={piece.image_url}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </span>
              </Piece>
            );
          })}
        </>
      )}
    </div>
  );
}

/** The one piece the world map takes. A constant so the identity is stable. */
const PARTY_PIECE = { kind: "party" };

function Heading({ children, className = "" }) {
  return (
    <p
      aria-hidden="true"
      className={`font-mono text-[9px] tracking-[0.12em] text-ink/40 uppercase ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * One thing in the hand.
 *
 * PICKED UP ON THE PRESS, which is what makes it a drag: the board listens from
 * the moment a face goes down. A press that ends where it started leaves the
 * piece in the hand, to be put down with a second click.
 */
function Piece({ held, onHold, label, children }) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) {
          return;
        }

        event.preventDefault();
        onHold();
      }}
      aria-pressed={held}
      aria-label={
        held
          ? `Holding ${label}. Click the map to place, or press again to put down.`
          : `Pick up ${label}`
      }
      /* `grid size-10`, not the button's own inline box: the line box under an
         inline-flex avatar left descender space, and the ring came out a
         rounded rectangle taller than the face. */
      className={`grid size-10 cursor-grab place-items-center rounded-full transition duration-300 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        held
          ? "ring-2 ring-gold shadow-[0_0_10px_var(--gold-70)]"
          : "opacity-70 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}
