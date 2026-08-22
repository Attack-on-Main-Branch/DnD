"use client";

import { DICE_STAGE_ID } from "./dice-engine";
import { useBoardCast, useDiceTable } from "./dice-table";

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
 */
export default function DiceBoard() {
  const { stage, board } = useDiceTable();
  const cast = useBoardCast();

  return (
    <div aria-hidden="true" style={cast.style}>
      <span
        className={`rim-cast pointer-events-none absolute -inset-6 rounded-[2.25rem] motion-reduce:transition-none ${
          board.lit ? "lit-cast" : ""
        }`}
      />

      {/* The roller writes its canvas in here on first use and leaves it there;
          `overflow-hidden` and the picture's own radius are what keep a die
          that rolls into the corner inside the frame. */}
      <div
        id={DICE_STAGE_ID}
        className={`dice-stage pointer-events-none absolute inset-0 overflow-hidden rounded-xl ${
          stage === "rolling" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
