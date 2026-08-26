"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDie, parseDiceCount, readDiceResult } from "sina/rules/dice";

import { realtime } from "@/app/components/realtime";

/**
 * Everybody's dice, on one socket.
 *
 * What travels is the ROLL and not a picture of it: the die, how many of it,
 * and the seed its physics is thrown by. Every chair runs that throw itself and reads its own
 * number off its own board — see dice-engine.js for what makes the two the same
 * throw. A number is sent at the end all the same, for the chair that could not
 * throw at all; such a chair sends no seed when it rolls either.
 *
 * A SECRET roll puts no die, no seed and no number on the wire — only that
 * something is being rolled and, at the end, that it is over. Where the veil
 * STANDS is announced too, so the boards change colour before the roll.
 *
 * Nothing off the wire is trusted beyond its shape: the die is checked against
 * the catalogue, the count against the rail's own ceiling and any total against
 * the two together, and the roller's key only ever matches a card the rail
 * already has from the server. Who may speak at all is
 * 20260822090000_table_rolls.sql's to decide.
 */

const EVENT = "roll";

/** How long a result stands beside its card before it slides back under. */
const CAPSULE_MS = 2500;

/**
 * A roll left in the air by a browser that closed mid-throw. Generous — the
 * physics gives up at four seconds and a slow first load is a few more — but
 * finite, because the alternative is a board left lit until someone reloads.
 */
const STRANDED_MS = 15000;

function without(entries, key) {
  const { [key]: gone, ...rest } = entries;

  return gone === undefined ? entries : rest;
}

export function useTableRolls({ campaignId, enabled, keeper, onMirror }) {
  const [flying, setFlying] = useState({});
  const [results, setResults] = useState({});
  const [latest, setLatest] = useState(null);
  const [veiled, setVeiled] = useState(false);

  const share = useRef(null);
  const timers = useRef(new Map());
  const rolls = useRef(0);

  /* Which rolls this board has already answered off its own dice. A roll it
     watched needs nothing from the wire's closing message, and taking the
     number twice would start the pill's timer again halfway through. */
  const answered = useRef(new Set());

  /* Where the veil stands on THIS screen, for answering somebody who has just
     arrived and asked. A ref, because the answer is given from a callback that
     must not be rebuilt every time the switch moves. */
  const veil = useRef(false);

  const after = useCallback((name, ms, run) => {
    clearTimeout(timers.current.get(name));
    timers.current.set(
      name,
      setTimeout(() => {
        timers.current.delete(name);
        run();
      }, ms),
    );
  }, []);

  useEffect(() => {
    const pending = timers.current;

    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }

      pending.clear();
    };
  }, []);

  /**
   * A die is in the air somewhere at this table. The die itself travels with
   * it so the pill beside that chair can say which one is being thrown; a kept
   * roll names none, and nobody but the roller is told what is on the way.
   */
  const begin = useCallback(
    (key, secret, die, count) => {
      answered.current.delete(key);
      setFlying((current) => ({ ...current, [key]: { secret, die, count } }));
      after(`flight:${key}`, STRANDED_MS, () =>
        setFlying((current) => without(current, key)),
      );
    },
    [after],
  );

  /** It has come to rest. `entry` is null for a roll nobody else may read. */
  const land = useCallback(
    (key, entry) => {
      clearTimeout(timers.current.get(`flight:${key}`));
      timers.current.delete(`flight:${key}`);
      setFlying((current) => without(current, key));

      if (!entry) {
        return;
      }

      answered.current.add(key);

      // Ours, not theirs: a key off the wire decides nothing but which card the
      // pill comes out from, and this one only has to be new every time.
      const shown = { ...entry, key, id: ++rolls.current, away: false };

      setResults((current) => ({ ...current, [key]: shown }));
      setLatest(shown);

      after(`away:${key}`, CAPSULE_MS, () =>
        setResults((current) =>
          current[key]
            ? { ...current, [key]: { ...current[key], away: true } }
            : current,
        ),
      );
    },
    [after],
  );

  /**
   * The roller's own reading, put over one this board had already taken off its
   * own dice — and never anything else.
   *
   * It should never have anything to do. Every die but one comes out the same
   * on every chair, and for those two numbers are one number. The exception is
   * percentile: dice-box rolls it as a tens die and a units die added a moment
   * apart, and the moment is not the same moment everywhere, so about one in
   * five lands differently. Between a table that disagrees about a number and a
   * board whose dice disagree with the number beside them, the table wins.
   */
  const correct = useCallback((key, value) => {
    setResults((current) =>
      current[key] && current[key].value !== value
        ? { ...current, [key]: { ...current[key], value } }
        : current,
    );

    setLatest((told) =>
      told?.key === key && told.value !== value ? { ...told, value } : told,
    );
  }, []);

  const receive = useCallback(
    (payload) => {
      if (payload?.phase === "veil") {
        setVeiled(Boolean(payload.secret));
        return;
      }

      /* Somebody has just sat down and cannot know whether the veil is drawn.
         Only the chair that holds it answers; everybody else stays quiet. */
      if (payload?.phase === "who") {
        if (keeper) {
          share.current?.({ phase: "veil", secret: veil.current });
        }

        return;
      }

      const key = typeof payload?.key === "string" ? payload.key : null;

      if (!key) {
        return;
      }

      // A kept roll names no die, so there is nothing to throw and the board
      // lights on its own.
      const die = isDie(payload.die) ? payload.die : null;

      // A chair a release behind sends no count and is throwing one.
      const count = parseDiceCount(payload.count ?? 1) ?? 1;

      if (payload.phase === "start") {
        begin(key, Boolean(payload.secret), die, count);

        // No seed, no shared throw: whoever rolled could not run one either, so
        // this board waits for the number rather than inventing a roll of its
        // own to put under it.
        if (die && Number.isInteger(payload.seed)) {
          onMirror(die, count, payload.seed, (value) => {
            if (value !== null) {
              land(key, { die, count, value, secret: false });
            }
          });
        }

        return;
      }

      if (payload.phase !== "done") {
        return;
      }

      const value =
        die === null ? null : readDiceResult(die, count, payload.value);

      // Already read off this board's own dice, which are the same dice — bar
      // the one case `correct` is about.
      if (answered.current.has(key)) {
        if (value !== null) {
          correct(key, value);
        }

        return;
      }

      land(key, value === null ? null : { die, count, value, secret: false });
    },
    [begin, correct, keeper, land, onMirror],
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let stop = null;
    let cancelled = false;

    realtime()
      .then(({ client, watchBroadcast }) => {
        if (cancelled) {
          return;
        }

        const open = watchBroadcast(client, {
          channel: `rolls:${campaignId}`,
          event: EVENT,
          onMessage: receive,
          /* Nothing said before the join is heard by anybody, so the veil is
             settled here: whoever holds it says where it stands, and whoever
             does not asks. */
          onReady: () =>
            open.send(
              keeper
                ? { phase: "veil", secret: veil.current }
                : { phase: "who" },
            ),
        });

        share.current = open.send;
        stop = open.stop;
      })
      // A table without a socket is still a table; this browser's own rolls
      // work exactly as before and simply reach nobody else.
      .catch(() => {});

    return () => {
      cancelled = true;
      share.current = null;
      stop?.();
    };
  }, [campaignId, enabled, keeper, receive]);

  /** This browser's roll, on its own board and on everybody else's. */
  const start = useCallback(
    (key, { die, count, secret, seed }) => {
      begin(key, secret, die, count);
      share.current?.(
        secret
          ? { phase: "start", key, secret: true }
          : { phase: "start", key, secret: false, die, count, seed },
      );
    },
    [begin],
  );

  const finish = useCallback(
    (key, entry) => {
      land(key, entry);

      share.current?.(
        entry.secret
          ? { phase: "done", key, secret: true }
          : {
              phase: "done",
              key,
              secret: false,
              die: entry.die,
              count: entry.count,
              value: entry.value,
            },
      );
    },
    [land],
  );

  /** Where the veil stands, told to the table rather than kept to one screen. */
  const announceVeil = useCallback((secret) => {
    veil.current = secret;
    share.current?.({ phase: "veil", secret });
  }, []);

  /*
   * Violet the moment anything in the air is being kept back. Two people
   * rolling at once is rare and one of them being secret rarer still, and of
   * the two answers "somebody is keeping this one" is the one worth showing.
   */
  const inTheAir = Object.values(flying);

  return {
    board: {
      lit: inTheAir.length > 0,
      secret: inTheAir.some((roll) => roll.secret),
    },
    veiled,
    flying,
    results,
    latest,
    start,
    finish,
    announceVeil,
  };
}
