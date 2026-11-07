"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

import {
  CRIT_LAYER_ID,
  prepareCritFlare,
  releaseCritFlare,
} from "./crit-flare";
import { DICE_LANES, diceStageId } from "./dice-engine";
import { useBoardCast, useDiceTable } from "./dice-table";

const LANES = Array.from({ length: DICE_LANES }, (_, lane) => lane);
const PHONE_DICE_DISPLAY_SCALE = 2;

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
export default function DiceBoard({ phone = false, traySize }) {
  const { stages, board } = useDiceTable();
  const cast = useBoardCast();
  const phoneLayers = useRef(null);

  useEffect(() => {
    const layer = phoneLayers.current;
    if (!phone || !layer) return;
    const setDensity = () =>
      layer.style.setProperty(
        "--dice-density",
        String(Math.min(window.devicePixelRatio || 1, 2)),
      );
    setDensity();
    window.addEventListener("resize", setDensity);
    return () => window.removeEventListener("resize", setDensity);
  }, [phone]);

  /* The flare's library, fetched while nobody is waiting on it rather than in
     the moment a 20 lands. */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ask = window.requestIdleCallback ?? ((then) => setTimeout(then, 1));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const asked = ask(() => prepareCritFlare().catch(() => {}));

    return () => {
      cancel(asked);
      releaseCritFlare();
    };
  }, []);

  const trayPosition =
    phone || traySize ? "top-1/2 left-1/2 -translate-1/2" : "inset-0";
  const fittedWidth = traySize?.width ?? "100%";
  const aspectRatio = traySize?.aspectRatio ?? 1;
  const flareSize = phone
    ? {
        width: `calc(${fittedWidth} * ${PHONE_DICE_DISPLAY_SCALE})`,
        aspectRatio,
      }
    : traySize;
  const diceSize = phone
    ? {
        width: `calc(${fittedWidth} * ${PHONE_DICE_DISPLAY_SCALE} * var(--dice-density, 1))`,
        aspectRatio,
      }
    : traySize;

  const layers = (
    <>
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
          data-dice-display-scale={phone ? PHONE_DICE_DISPLAY_SCALE : undefined}
          style={diceSize}
          className={`dice-stage pointer-events-none absolute ${trayPosition} ${phone ? "[&>canvas]:[scale:calc(1/var(--dice-density,1))]" : "overflow-hidden rounded-xl"} ${
            stages[lane] === "rolling" ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/* Over every lane: a critical's flare outlives the die it came off,
          which fades on its lane's own beat. See crit-flare.js. */}
      <div
        id={CRIT_LAYER_ID}
        style={flareSize}
        className={`pointer-events-none absolute ${trayPosition} ${phone ? "" : "overflow-hidden rounded-xl"}`}
      />
    </>
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
      style={cast.style}
    >
      <span
        className={`rim-cast pointer-events-none absolute motion-reduce:transition-none ${
          phone ? "-inset-1.5 rounded-[1.125rem]" : "-inset-6 rounded-[2.25rem]"
        } ${board.lit ? "lit-cast" : ""}`}
      />
      {phone ? (
        <div
          ref={phoneLayers}
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
          {layers}
        </div>
      ) : (
        layers
      )}
    </div>
  );
}
