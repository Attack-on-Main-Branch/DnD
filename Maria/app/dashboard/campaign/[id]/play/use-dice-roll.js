"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readDiceResult, rollDice } from "sina/rules/dice";

import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

import { clearDice, diceEngine, releaseDice, throwDie } from "./dice-engine";
import { diceMaterial, dieNotation } from "./dice-presentation";

/**
 * The one roller on this page, and the two chairs it throws for: this browser's
 * own, and somebody else's joined a moment later. The throw is the same throw
 * either way — same die, same seed, same arena — so neither reads a number off
 * the wire; each simulates the roll and reads its own dice. The number that
 * travels is only for a chair that could not throw at all.
 *
 * `color` is THIS chair's own dice, null at the head of the table. It goes out
 * with the seed, because a board joining somebody else's throw has to cast the
 * same dice as well as tumble them the same way.
 *
 * TWO KINDS OF BUSY, and telling them apart is most of this file.
 *
 *   THE BOARD is busy while dice are on it. There is one engine, one canvas and
 *   one physics world, so throws take it in turn — `onBoard` is that turn, and
 *   `stage` is what the arena reads to know whether to be lit.
 *
 *   THE CHAIR is busy while ITS OWN throw is unfinished. That is `throwing`,
 *   and it is the only thing the rail and the death-save button disable on.
 *
 * They used to be one flag, and the table paid for it: a browser watching
 * somebody else's roll had its own rail greyed out and silently dropped any
 * press made during it, so at a table of six there was a queue for the dice
 * nobody had asked for. A roll is now refused only to the chair already making
 * one — a real table lets everybody pick up their own dice at once.
 *
 * What one board still cannot do is animate two throws at the same moment. A
 * mirror that arrives while the board is occupied is not shown; its number
 * comes off the wire a beat later, and the capsule beside that chair says
 * "Rolling…" throughout either way. A throw of this chair's OWN is never
 * dropped like that — this is the only board that can produce its number — so
 * it waits its turn instead.
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

export function useDiceRoll({ color = null, onStart, onFinish }) {
  /** The BOARD: "idle", "rolling", "settling". */
  const [stage, setStage] = useState("idle");

  /** THE CHAIR: whether this browser has a throw of its own unfinished. */
  const [throwing, setThrowing] = useState(false);

  const [secret, setSecret] = useState(false);

  const own = useRef(false);
  const alive = useRef(true);

  /* How many throws the board owes, waiting or in flight. A counter and not a
     boolean: the chain below is written to before the work it schedules begins,
     so two mirrors arriving in one tick would both find a free board. */
  const owed = useRef(0);
  const turns = useRef(Promise.resolve());

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

  /** The board, taken in turn. A throw that fails does not stop the next. */
  const onBoard = useCallback((run) => {
    owed.current += 1;

    const next = turns.current.then(run, run);

    turns.current = next.then(spent, spent);

    return next;

    function spent() {
      owed.current -= 1;
    }
  }, []);

  /**
   * ONE THROW ON THIS BOARD, start to swept: thrown, read, left standing a beat
   * to be read against, then faded and cleared.
   *
   * `report` is handed the face the moment the dice stop rather than at the end
   * of all that — the number is what the table is waiting for, and the second
   * the dice hold is only for whoever is watching them.
   */
  const turn = useCallback(async (die, count, cast, seed, report) => {
    try {
      setStage("rolling");

      const thrown = await throwDie({
        notation: dieNotation(die, count),
        ...diceMaterial(cast),
        seed,
      }).catch(() => null);

      report(alive.current ? readDiceResult(die, count, thrown) : null);

      if (!alive.current) {
        return;
      }

      await wait(thrown === null ? 0 : READ_MS);

      setStage("settling");
      await wait(DICE_OUT_MS);

      if (!alive.current) {
        return;
      }

      setStage("idle");
    } finally {
      // Whatever happened, the next throw starts on an empty board.
      clearDice();
    }
  }, []);

  /**
   * This browser starting a roll. The engine is waited for BEFORE the table is
   * told, because a seed is a promise that every chair will throw exactly that.
   * One that cannot throw — no engine, or a reader who asked for stillness —
   * sends no seed, and then its number is the only number there is.
   *
   * Refused only to a chair whose own throw is still unfinished. A board busy
   * with somebody else's roll is not a reason: this one waits for it.
   */
  const roll = useCallback(
    async (die, count, options) => {
      if (own.current) {
        return;
      }

      own.current = true;
      setThrowing(true);

      try {
        const kept = secret;
        const seed = prefersReducedMotion()
          ? null
          : await diceEngine().then(newSeed, () => null);

        if (!alive.current) {
          return;
        }

        if (seed === null) {
          const value = rollDice(die, count);

          onStart({ die, count, secret: kept, seed: null, color });
          onFinish({ die, count, value, secret: kept, quiet: options?.quiet });
          options?.onLanded?.(value);
          return;
        }

        onStart({ die, count, secret: kept, seed, color });

        await onBoard(() =>
          turn(die, count, { secret: kept, color }, seed, (settled) => {
            const value = settled ?? rollDice(die, count);

            onFinish({
              die,
              count,
              value,
              secret: kept,
              quiet: options?.quiet,
            });

            /* Whoever asked for this throw, handed the face it came to rest on.
               A death save is the one roll at this table whose number decides
               something in the database, and the board is a physics simulation
               — so the number travels from here rather than being generated at
               the other end. */
            options?.onLanded?.(value);
          }),
        );
      } finally {
        own.current = false;

        if (alive.current) {
          setThrowing(false);
        }
      }
    },
    [color, onBoard, onFinish, onStart, secret, turn],
  );

  /**
   * The same throw, joined a moment later and cast in the colour the chair that
   * made it rolls. `land` is handed the face as the dice come to rest, which is
   * when this screen has a number of its own.
   *
   * NOT QUEUED, unlike a roll of this chair's own. A mirror is a picture of
   * something happening elsewhere, and a picture four seconds late is worse
   * than none: the number is already on its way over the wire, and the capsule
   * beside that chair has been saying so since the dice left their hand.
   */
  const mirror = useCallback(
    async (die, count, seed, cast, land) => {
      if (owed.current > 0 || own.current || prefersReducedMotion()) {
        return;
      }

      await onBoard(() =>
        turn(die, count, { secret: false, color: cast }, seed, land),
      );
    },
    [onBoard, turn],
  );

  return { stage, throwing, secret, setSecret, roll, mirror, warm };
}
