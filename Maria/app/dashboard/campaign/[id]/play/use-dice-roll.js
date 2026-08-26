"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readDiceResult, rollDice } from "sina/rules/dice";

import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

import { clearDice, diceEngine, releaseDice, throwDie } from "./dice-engine";
import { diceCast, dieNotation } from "./dice-presentation";

/**
 * The one roller on this page, and the two chairs it throws for: this browser's
 * own, and somebody else's joined a moment later. The throw is the same throw
 * either way — same die, same seed, same arena — so neither reads a number off
 * the wire; each simulates the roll and reads its own dice. The number that
 * travels is only for a chair that could not throw at all.
 *
 * One engine means one throw at a time, which is also true of a real table.
 *
 * The waits below are the CSS durations in globals.css written out again —
 * change one and change the other, as entrance.js warns next door.
 */

/** How long a settled die is left standing before it is taken away. */
const READ_MS = 900;

/** `.dice-stage` fading. */
const DICE_OUT_MS = 300;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** What the physics is thrown by, not what the die reads. */
function newSeed() {
  const draw = new Uint32Array(1);

  crypto.getRandomValues(draw);

  return draw[0];
}

export function useDiceRoll({ onStart, onFinish }) {
  const [stage, setStage] = useState("idle");
  const [secret, setSecret] = useState(false);

  const rolling = useRef(false);
  const alive = useRef(true);

  /* The engine outlives no route: it holds a WebGL context and two threads,
     and dice-box offers no way to hand them back except this. */
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      releaseDice();
    };
  }, []);

  /**
   * The library, its wasm and its meshes, fetched before anybody asks for a
   * number — and with them the world's own first throw, which dice-engine.js
   * warms it with and nobody should be watching.
   */
  const warm = useCallback(() => {
    diceEngine().catch(() => {});
  }, []);

  /** The dice off the board once they have stopped, and the board handed back. */
  const sweep = useCallback(async () => {
    setStage("settling");
    await wait(DICE_OUT_MS);

    if (!alive.current) {
      return;
    }

    setStage("idle");
    clearDice();
    rolling.current = false;
  }, []);

  /** The throw, totalled where it rests. Null for one that never happened. */
  const present = useCallback(async (die, count, { seed, secret: kept }) => {
    setStage("rolling");

    const thrown = await throwDie({
      notation: dieNotation(die, count),
      theme: diceCast(kept).theme,
      seed,
    }).catch(() => null);

    return alive.current ? readDiceResult(die, count, thrown) : null;
  }, []);

  /**
   * This browser starting a roll. The engine is waited for BEFORE the table is
   * told, because a seed is a promise that every chair will throw exactly that.
   * One that cannot throw — no engine, or a reader who asked for stillness —
   * sends no seed, and then its number is the only number there is.
   */
  const roll = useCallback(
    async (die, count) => {
      if (rolling.current) {
        return;
      }

      rolling.current = true;

      const kept = secret;
      const seed = prefersReducedMotion()
        ? null
        : await diceEngine().then(newSeed, () => null);

      if (!alive.current) {
        return;
      }

      if (seed === null) {
        onStart({ die, count, secret: kept, seed: null });
        onFinish({ die, count, value: rollDice(die, count), secret: kept });
        rolling.current = false;
        return;
      }

      onStart({ die, count, secret: kept, seed });

      const settled = await present(die, count, { seed, secret: kept });

      if (!alive.current) {
        return;
      }

      // The number as the dice stop, the dice a beat longer to read it against.
      onFinish({
        die,
        count,
        value: settled ?? rollDice(die, count),
        secret: kept,
      });

      await wait(settled === null ? 0 : READ_MS);
      await sweep();
    },
    [onFinish, onStart, present, secret, sweep],
  );

  /**
   * The same throw, joined a moment later. `land` is handed the face as the
   * dice come to rest, which is when this screen has a number of its own.
   */
  const mirror = useCallback(
    async (die, count, seed, land) => {
      if (rolling.current || prefersReducedMotion()) {
        return;
      }

      rolling.current = true;

      const settled = await present(die, count, { seed, secret: false });

      if (!alive.current) {
        return;
      }

      land(settled);

      await wait(settled === null ? 0 : READ_MS);
      await sweep();
    },
    [present, sweep],
  );

  return { stage, secret, setSecret, roll, mirror, warm };
}
