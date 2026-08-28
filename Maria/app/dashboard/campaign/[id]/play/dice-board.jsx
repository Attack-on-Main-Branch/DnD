"use client";

import { DICE_LANES, diceStageId } from "./dice-engine";
import { useBoardCast, useDiceTable } from "./dice-table";

const LANES = Array.from({ length: DICE_LANES }, (_, lane) => lane);

/**
 * The board the dice land on, which is the map itself.
 *
 * The rim keeps the mat's `-inset-6`; the arena sits on the picture exactly,
 * because the walls the physics builds have to be a shape every chair agrees
 * on and the mat is 1.5rem of REAL pixels — a slightly different rectangle on
 * every screen size, and a wall in a different place is a different roll.
 *
 * The rim is its own span rather than a class on the mat: the mat is rendered
 * on the server and this is client state, and a lit edge laid over an unlit one
 * at the same inset reads as the one edge brightening.
 *
 * Nothing here is ever a click target — the map underneath has to keep
 * receiving the click that zooms it and the right-click that marks it.
 *
 * NOT `memo` — see table-map.jsx. A remount took this div and left the roller's
 * canvas, which the library appends in here and module state holds, painting
 * into a box no longer on the page: the dice rolled where nobody could see them.
 */
export default function DiceBoard() {
  const { stages, board } = useDiceTable();
  const cast = useBoardCast();

  return (
    <div aria-hidden="true" style={cast.style}>
      <span
        className={`rim-cast pointer-events-none absolute -inset-6 rounded-[2.25rem] motion-reduce:transition-none ${
          board.lit ? "lit-cast" : ""
        }`}
      />

      {/* One box per lane, laid over each other on the same picture. They fade
          separately because they finish separately: a throw that has come to
          rest should be taken away on its own beat, not held on the board until
          somebody else's dice have stopped too.

          The roller writes its canvas into one of these on first use and leaves
          it there; `overflow-hidden` and the picture's own radius are what keep
          a die that rolls into the corner inside the frame. */}
      {LANES.map((lane) => (
        <div
          key={lane}
          id={diceStageId(lane)}
          className={`dice-stage pointer-events-none absolute inset-0 overflow-hidden rounded-xl ${
            stages[lane] === "rolling" ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
