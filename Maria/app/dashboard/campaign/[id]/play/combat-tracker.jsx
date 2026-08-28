"use client";

import { useState } from "react";
import {
  MAX_INITIATIVE,
  MIN_INITIATIVE,
  parseInitiative,
} from "sina/rules/combat";

import Avatar from "@/app/components/ui/avatar";
import PartyMark from "@/app/components/ui/party-mark";
import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { useCombat } from "./use-combat";

/**
 * The initiative ladder: every piece standing on the board, highest roll at the
 * top, and the glow walking down it.
 *
 * TWO COLUMNS AND ONE ORDER. The party down the left of the spine, what the
 * table invented down the right — but not two lists: the rung a piece sits on is
 * its NUMBER, so a goblin on 15 sits between a fighter on 20 and a wizard on 10.
 *
 * ONLY WHAT IS ON THE BOARD — the rows of `map_placed_tokens` for the picture on
 * the table, not the party rail and not the hand of pieces.
 */
export default function CombatTracker({ campaignId, faces }) {
  const {
    inCombat,
    activeTokenId,
    round,
    pieces,
    order,
    begin,
    conclude,
    setInitiative,
    nextTurn,
  } = useCombat(campaignId, faces);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <h2 className="font-display text-xs font-semibold tracking-[0.18em] text-gold/80 uppercase">
          Initiative
        </h2>

        {/* It moves on the wrap and nothing else, so the number is exactly how
            many times the ladder has been round. */}
        {inCombat && (
          <p className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-rose-300/80 uppercase">
            Round {round}
          </p>
        )}
      </div>

      {/* Both controls on one line: the ladder is what the panel is for, and
          stacked these spent 110px on two words each. */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={inCombat ? conclude : begin}
          className={`flex-1 cursor-pointer rounded-lg border px-2 py-2 font-mono text-[10px] tracking-[0.16em] uppercase transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
            inCombat
              ? "border-rose-500 bg-rose-950/60 text-rose-300 shadow-[0_0_12px_rgba(225,29,72,0.6)] motion-safe:animate-pulse"
              : "border-gold/30 text-gold hover:bg-gold/10"
          }`}
        >
          {inCombat ? "End combat" : "Start combat"}
        </button>

        {/* Nothing to hand on when nobody has rolled. */}
        {inCombat && order.length > 0 && (
          <button
            type="button"
            onClick={nextTurn}
            className="flex-1 cursor-pointer rounded-lg border border-amber-400/50 bg-amber-400/10 px-2 py-2 font-mono text-[10px] tracking-[0.16em] text-amber-200 uppercase transition duration-300 hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Next turn
          </button>
        )}
      </div>

      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      {pieces.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink/50 italic">
          No pieces are standing on this battlefield.
        </p>
      ) : (
        <div className="scroll-gold min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2">
          {/* THE SPINE. The list is its own positioning context and not the
              scroller: an absolute child of a scrolling box is sized by what is
              VISIBLE, so the line would stop at the fold and slide with it. */}
          <ol className="relative flex flex-col">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gold/15"
            />

            {pieces.map((piece, at) => (
              <Rung
                key={piece.id}
                piece={piece}
                active={inCombat && piece.id === activeTokenId}
                offset={stepAbove(pieces, at)}
                ruled={hasBelow(pieces, at)}
                onWrite={setInitiative}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * How far one rung stands below the one above it.
 *
 * ACROSS THE LADDER, HALF A STEP: the two are on opposite sides, so overlapping
 * costs nothing, and half a capsule is what says one went after the other.
 * DOWN ONE SIDE, A WHOLE ONE, or two capsules would pass through each other.
 *
 * Pixels and not a `-mt-*` utility: it is arithmetic off the pill's height, and
 * a class built from a value is one Tailwind's scanner never sees.
 */
const PILL_PX = 28;
const SIDE_GAP_PX = 10;

/** Which column a piece stands in: what the table invented is on the right. */
function side(piece) {
  return Boolean(piece.templateId);
}

function stepAbove(pieces, at) {
  if (at === 0) {
    return 0;
  }

  return side(pieces[at]) === side(pieces[at - 1])
    ? SIDE_GAP_PX
    : (SIDE_GAP_PX - PILL_PX) / 2;
}

/**
 * Whether anything follows this piece down its OWN side, which is what decides
 * whether it wears a rule under it. The columns are half a step out of phase, so
 * a rule drawn the full width would cut through the capsule opposite.
 */
function hasBelow(pieces, at) {
  return pieces.slice(at + 1).some((piece) => side(piece) === side(pieces[at]));
}

/**
 * One rung: a face, a name, and the number it rolled.
 *
 * PARTY-PILLS' CAPSULE — see party-pills.jsx. The portrait stands at the
 * capsule's own END: the negative margins put the circle over the border, so its
 * diameter IS the pill's height. No ring on it either, a rim inside a rim being
 * two a few pixels apart.
 *
 * The name is cut at the spine and never past it, and it is the only part of the
 * capsule that gives way. `flex-row-reverse` rather than a second block of
 * markup, so the two sides cannot drift apart.
 */
function Rung({ piece, active, offset, ruled, onWrite }) {
  const enemy = Boolean(piece.templateId);

  return (
    <li
      style={{ marginTop: offset }}
      className={`relative flex ${enemy ? "justify-end" : "justify-start"}`}
    >
      {/* Its own side's rule, run to the middle and no further. */}
      {ruled && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-[5px] h-px bg-gold/12 ${
            enemy ? "right-0 left-1/2" : "right-1/2 left-0"
          }`}
        />
      )}

      <div
        className={`inline-flex max-w-[calc(50%_-_0.5rem)] items-center gap-1.5 rounded-full border transition-[border-color,box-shadow,background-color] duration-300 ${
          enemy ? "flex-row-reverse pr-0 pl-1.5" : "pr-1.5 pl-0"
        } ${
          active
            ? "border-amber-300 bg-amber-400/15 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
            : "border-gold/20 bg-surface/40"
        }`}
      >
        <Face piece={piece} edge={enemy ? "-my-px -mr-px" : "-my-px -ml-px"} />

        <span
          className={`min-w-0 truncate font-display text-xs tracking-wide ${
            enemy ? "text-right" : ""
          } ${active ? "text-amber-100" : "text-ink/75"}`}
        >
          {piece.label}
        </span>

        {/* KEYED ON THE NUMBER, which is what reconciles the box with the
            table: a value that changes under it is a fresh box holding the fresh
            number. A commit only lands on the way out, so no caret is lost. */}
        <InitiativeBox
          key={written(piece.initiative)}
          piece={piece}
          onWrite={onWrite}
        />
      </div>
    </li>
  );
}

/**
 * Held locally while it is typed and committed on the way out: the ladder
 * REORDERS on every commit, and writing straight through would move the row out
 * from under the caret between the "1" and the "5" of fifteen.
 */
function InitiativeBox({ piece, onWrite }) {
  const [typed, setTyped] = useState(() => written(piece.initiative));

  function commit(value) {
    const asked = value === "" ? null : parseInitiative(value);

    // Unreadable is left alone rather than silently cleared: the caret is in
    // there and the number they meant is half typed.
    if (value !== "" && asked === null) {
      setTyped(written(piece.initiative));
      return;
    }

    onWrite(piece.id, asked);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={MIN_INITIATIVE}
      max={MAX_INITIATIVE}
      value={typed}
      // A piece that has not rolled is out of the fight.
      placeholder="—"
      aria-label={`Initiative for ${piece.label}`}
      onChange={(event) => setTyped(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      /* Bare and not `controlClasses`: the capsule is already the rim.
         `no-spin` takes the browser's steppers off — see globals.css. */
      className="no-spin w-9 shrink-0 border-none bg-transparent p-0 text-center font-display text-sm font-bold text-gold tabular-nums shadow-none outline-none placeholder:text-ink/30"
    />
  );
}

/** The board's own three faces from map-token.jsx, without the rims and shadows
    that only mean something over a picture. `edge` is what makes the circle the
    capsule's end rather than something inside it. */
function Face({ piece, edge }) {
  if (piece.isPartyMarker) {
    return <PartyMark className={`size-7 shrink-0 ${edge}`} />;
  }

  if (piece.characterId) {
    return (
      <Avatar
        src={piece.src}
        colorClass={piece.colorClass}
        size="xs"
        ring={false}
        className={`shrink-0 ${edge}`}
      />
    );
  }

  return (
    <span
      style={{ borderColor: piece.ringColor }}
      className={`box-border grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-surface ${edge}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={piece.src}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );
}

function written(initiative) {
  return Number.isInteger(initiative) ? String(initiative) : "";
}
