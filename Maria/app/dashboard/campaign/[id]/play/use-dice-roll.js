"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readDiceResult, rollDice } from "sina/rules/dice";

import { prefersReducedMotion } from "@/app/components/use-reduced-motion";

import {
  clearDice,
  DICE_LANES,
  diceEngine,
  releaseDice,
  throwDie,
} from "./dice-engine";
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
 *   A LANE is busy while dice are on it. Each is a physics world of its own, so
 *   `DICE_LANES` throws can be in the air together — `onLane` is one lane's
 *   turn, and `stages` is what each arena reads to know whether to be lit.
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
 * WHICH LANE A THROW TAKES IS THIS BROWSER'S BUSINESS. The lanes are identical
 * worlds, and everything that makes a throw the throw it is — die, count, seed,
 * and the corner the seed picks — travels with it, so two chairs loaded
 * differently still watch the same tumble and read the same number.
 *
 * A mirror is dropped when every lane is occupied: a picture four seconds late
 * is worse than none, and the number is already on its way over the wire. This
 * chair's OWN throw is never dropped — only this board can produce its number —
 * so it waits its turn instead.
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

const IDLE_LANES = Array.from({ length: DICE_LANES }, () => "idle");

export function useDiceRoll({ color = null, onStart, onFinish }) {
  /** EACH LANE: "idle", "rolling", "settling". */
  const [stages, setStages] = useState(IDLE_LANES);

  /** THE CHAIR: whether this browser has a throw of its own unfinished. */
  const [throwing, setThrowing] = useState(false);

  const [secret, setSecret] = useState(false);

  const own = useRef(false);
  const alive = useRef(true);

  /* How many throws each lane owes, waiting or in flight. Counters and not
     booleans: a chain is written to before the work it schedules begins, so two
     mirrors arriving in one tick would both find the same lane free. */
  const owed = useRef(IDLE_LANES.map(() => 0));
  const turns = useRef(IDLE_LANES.map(() => Promise.resolve()));

  const setLaneStage = useCallback((lane, value) => {
    setStages((current) =>
      current[lane] === value
        ? current
        : current.map((was, at) => (at === lane ? value : was)),
    );
  }, []);

  /** A lane with nothing on it, or -1 when every world is occupied. */
  const freeLane = useCallback(
    () => owed.current.findIndex((count) => count === 0),
    [],
  );

  /** The shortest queue, for a throw that may not be dropped. */
  const shortestLane = useCallback(
    () =>
      owed.current.reduce(
        (best, count, at) => (count < owed.current[best] ? at : best),
        0,
      ),
    [],
  );

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
    // The first lane on its own, and the rest behind it: a chair that rolls on
    // arrival should wait for one world rather than for three.
    diceEngine(0)
      .then(() => {
        for (let lane = 1; lane < DICE_LANES; lane += 1) {
          diceEngine(lane).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  /** One lane, taken in turn. A throw that fails does not stop the next. */
  const onLane = useCallback((lane, run) => {
    owed.current[lane] += 1;

    const next = turns.current[lane].then(run, run);

    turns.current[lane] = next.then(spent, spent);

    return next;

    function spent() {
      owed.current[lane] -= 1;
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
  const turn = useCallback(
    async (lane, die, count, cast, seed, report) => {
      try {
        setLaneStage(lane, "rolling");

        const thrown = await throwDie({
          notation: dieNotation(die, count),
          ...diceMaterial(cast),
          seed,
          lane,
        }).catch(() => null);

        report(alive.current ? readDiceResult(die, count, thrown) : null);

        if (!alive.current) {
          return;
        }

        await wait(thrown === null ? 0 : READ_MS);

        setLaneStage(lane, "settling");
        await wait(DICE_OUT_MS);

        if (!alive.current) {
          return;
        }

        setLaneStage(lane, "idle");
      } finally {
        // Whatever happened, the next throw starts on an empty lane.
        clearDice(lane);
      }
    },
    [setLaneStage],
  );

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

        /* A free world if there is one, and the shortest queue if there is not.
           Never dropped: this is the only board that can produce this number. */
        const free = freeLane();
        const lane = free === -1 ? shortestLane() : free;

        await onLane(lane, () =>
          turn(lane, die, count, { secret: kept, color }, seed, (settled) => {
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
    [color, freeLane, onFinish, onLane, onStart, secret, shortestLane, turn],
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
      const lane = freeLane();

      if (lane === -1 || prefersReducedMotion()) {
        return;
      }

      await onLane(lane, () =>
        turn(lane, die, count, { secret: false, color: cast }, seed, land),
      );
    },
    [freeLane, onLane, turn],
  );

  return { stages, throwing, secret, setSecret, roll, mirror, warm };
}
