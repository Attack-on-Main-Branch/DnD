"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { realtime } from "@/app/components/realtime";

/**
 * The table's own channel: who is sitting at it, and what they change while
 * they are. The dice have a topic of their own, for the reason
 * 20260822090000_table_rolls.sql gives; its policies are what admit this
 * traffic too, so there is no migration behind any of it.
 *
 * ONE CHANNEL, because a socket may not join a topic twice and a join is a
 * round trip. A `kind` tells the pieces apart.
 *
 * WHAT MAY BE BELIEVED. Nothing here has been through a `select()` list, so
 * every message runs on the rails the dice already run on: the value is put
 * through the same `sina/rules/*` that bound the sender's own write, an id off
 * the wire only ever picks out a row this browser already has from the server,
 * and it is only ever a HEAD START — sent after the server took the write, and
 * answered by re-reading from the server. That ordering is also what stops a
 * refresh clobbering it: the row was written before the message was sent.
 */

const EVENT = "board";

const RESTING = {
  seated: new Set(),
  send: () => {},
  listen: () => () => {},
  leave: () => {},
};

const WireContext = createContext(RESTING);

export function useTableWire() {
  return useContext(WireContext);
}

/**
 * One kind of message, for one piece of the table. The callback is read out of
 * a ref when a message arrives rather than closed over, so a component that
 * rebuilds its handler every render does not resubscribe.
 */
export function useWireMessage(kind, onMessage) {
  const { listen } = useTableWire();
  const latest = useRef(onMessage);

  useEffect(() => {
    latest.current = onMessage;
  }, [onMessage]);

  useEffect(
    () =>
      listen((message) => {
        if (message?.kind === kind) {
          latest.current(message);
        }
      }),
    [kind, listen],
  );
}

export default function TableWire({
  campaignId,
  seatId,
  seatCharacterId,
  children,
}) {
  const [seated, setSeated] = useState(() => new Set());

  /**
   * Arrivals and departures heard on the wire, ahead of Presence reporting
   * them. Presence stays the authority — it is the half that survives a closed
   * laptop — but it is slow: a chair given up took about three seconds to reach
   * the next screen where a hit point on the same socket took four hundred
   * milliseconds.
   */
  const [told, setTold] = useState({});

  const share = useRef(null);
  const stand = useRef(null);
  const listeners = useRef(new Set());

  const receive = useCallback((message) => {
    if (
      (message?.kind === "seat" || message?.kind === "gone") &&
      typeof message.characterId === "string"
    ) {
      setTold((current) => ({
        ...current,
        [message.characterId]: message.kind === "seat",
      }));
    }

    for (const listener of listeners.current) {
      listener(message);
    }
  }, []);

  /**
   * Who is here, as a set of character ids. Keyed on the SEAT and never on the
   * account: somebody at the head of the table announces no character, so their
   * own card stays dark even where they own one here.
   */
  const chairs = useCallback((taken) => {
    setSeated(
      new Set(
        taken
          .map((chair) => chair.characterId)
          .filter((id) => typeof id === "string"),
      ),
    );
  }, []);

  useEffect(() => {
    // No chair, nothing to announce and nothing to say.
    if (!seatId) {
      return undefined;
    }

    let stop = null;
    let cancelled = false;

    realtime()
      .then(({ client, joinTable }) => {
        if (cancelled) {
          return;
        }

        // `let`, and assigned rather than initialised: `onReady` fires from
        // inside the call whose result it names.
        let open;

        open = joinTable(client, {
          channel: `table:${campaignId}`,
          key: seatId,
          meta: { characterId: seatCharacterId },
          event: EVENT,
          onChairs: chairs,
          onMessage: receive,
          /* Sitting down is news of its own: presence can only light a card the
             rail already has, so somebody who joined the party since this page
             was rendered would be in the room and invisible. */
          onReady: () =>
            open.send({ kind: "seat", characterId: seatCharacterId }),
        });

        share.current = open.send;
        stand.current = open.leave;
        stop = open.stop;
      })
      /* A table without a socket is still a table: every change is written to
         the database first, so a chair that hears nothing is one round trip
         behind rather than looking at the wrong numbers. */
      .catch(() => {});

    return () => {
      cancelled = true;
      share.current = null;
      stand.current = null;
      stop?.();
    };
  }, [campaignId, chairs, receive, seatCharacterId, seatId]);

  const send = useCallback((message) => share.current?.(message), []);

  const listen = useCallback((listener) => {
    listeners.current.add(listener);

    return () => listeners.current.delete(listener);
  }, []);

  /* Said on the way out rather than on the way gone: a Next navigation keeps
     this page mounted until the next one is ready, which is a chair left
     occupied by somebody already walking away. */
  const leave = useCallback(() => {
    share.current?.({ kind: "gone", characterId: seatCharacterId });
    stand.current?.();
  }, [seatCharacterId]);

  /* An entry counts only while Presence disagrees with it; the moment the two
     say the same thing there is nothing left to lay over. */
  const here = useMemo(() => {
    const set = new Set(seated);

    for (const [characterId, arriving] of Object.entries(told)) {
      if (seated.has(characterId) === arriving) {
        continue;
      }

      if (arriving) {
        set.add(characterId);
      } else {
        set.delete(characterId);
      }
    }

    return set;
  }, [seated, told]);

  /* Who this browser speaks as, for anything that has to be filed under a
     chair — the log's pending lines, in use-table-deed.js. */
  const wire = useMemo(
    () => ({
      seated: here,
      seat: seatCharacterId ?? null,
      head: Boolean(seatId) && !seatCharacterId,
      send,
      listen,
      leave,
    }),
    [here, leave, listen, seatCharacterId, seatId, send],
  );

  return <WireContext.Provider value={wire}>{children}</WireContext.Provider>;
}
