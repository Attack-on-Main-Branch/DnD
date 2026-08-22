import { createClient } from "@supabase/supabase-js";

import { supabaseEnv } from "../env.js";

/**
 * A Supabase client that does nothing but listen, for the browser.
 *
 * `browser.js` next door explains why there is no general browser client: the
 * auth cookies are `httpOnly`, so one would come back unauthenticated and
 * silent. This is not that client, and it does not read a cookie at all.
 *
 * `accessToken` replaces the whole auth namespace — supabase-js disables
 * `client.auth` outright when it is set — and hands token duty to the caller.
 * Maria supplies a Server Action that verifies the session and returns the
 * short-lived access token; the socket carries it, Realtime evaluates the
 * table's RLS policies against it, and nothing else on the page can reach the
 * 400-day refresh token. That is the trade being made here and it is a
 * different one from `browser.js`: a token that expires in an hour, held only
 * for the duration of a socket, rather than a permanent credential in a cookie
 * a script can read.
 *
 * The callback is called again on reconnect and on resubscribe, so an expired
 * token repairs itself without the page being reloaded.
 */
export function createRealtimeSupabase(getAccessToken) {
  const { url, anonKey } = supabaseEnv();

  return createClient(url, anonKey, {
    accessToken: getAccessToken,

    /* How many messages a second this client may PUSH before the server holds
       them back. Four was written when the socket carried only doorbells; it
       now carries the dice, the hit points, the tokens and the chairs, and a
       busy moment reaches four in a breath. */
    realtime: { params: { eventsPerSecond: 30 } },
  });
}

/**
 * Watches one table for changes the subscriber is allowed to see, and returns
 * the unsubscribe.
 *
 * `filter` is PostgREST syntax — `user_id=eq.<uuid>` — and is a bandwidth
 * measure rather than a security one: RLS is what decides whether a row is
 * delivered at all. The payload is deliberately ignored by every caller, which
 * is what keeps this honest. A realtime payload has not been through the
 * `select()` lists in the data layer, so treating it as data would put columns
 * on the page that no query here ever returns.
 */
export function watchTable(
  client,
  { channel, table, filter, onChange, onStatus },
) {
  const subscription = client
    .channel(channel)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      () => onChange(),
    )
    .subscribe((status) => onStatus?.(status));

  return () => {
    client.removeChannel(subscription);
  };
}

/**
 * The table's own channel: who is sitting at it, and what they are doing.
 *
 * The opposite of `watchTable` above in one respect: these payloads are the
 * point. Nothing is read from the database, so there is no `select()` list to
 * bypass, and the caller decides how much to trust.
 *
 * `private: true` is what makes that trustworthy: Realtime puts the topic to
 * the policies on `realtime.messages` before anyone may join, track or speak —
 * 20260821240000_table_presence.sql for the chairs, 20260822090000_table_rolls
 * for the talking. Without them the subscription fails and `onChairs` is handed
 * the empty roster it reports for an empty room.
 *
 * Both questions on ONE channel, because a socket may not join a topic twice.
 * `key` collapses one person's several tabs into one seat, and `self: false`
 * because whoever moved the bar moved it on their own screen first.
 *
 * `leave` gives the chair up without giving the channel up — the two are not
 * the same moment, as play/leave-table.jsx explains.
 */
export function joinTable(
  client,
  { channel, key, meta, event, onChairs, onMessage, onReady },
) {
  const subscription = client.channel(channel, {
    config: {
      private: true,
      presence: { key, enabled: true },
      broadcast: { self: false },
    },
  });

  subscription
    .on("presence", { event: "sync" }, () =>
      onChairs(Object.values(subscription.presenceState()).flat()),
    )
    .on("broadcast", { event }, ({ payload }) => onMessage(payload))
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        Promise.resolve(subscription.track(meta)).catch(() => {});
        // Every SUBSCRIBED, first join and rejoin alike: it is the only moment
        // a caller can be sure anything it says will be heard.
        onReady?.();
        return;
      }

      /* Only when the channel has genuinely gone. A dropped socket is not a
         table that emptied, and supabase-js rejoins one by itself and resyncs
         the roster when it does — so blanking on `CHANNEL_ERROR` and
         `TIMED_OUT` as well turned every blip into the whole party appearing
         to stand up and sit back down. */
      if (status === "CLOSED") {
        onChairs([]);
      }
    });

  return {
    send: (payload) =>
      subscription.send({ type: "broadcast", event, payload }).catch(() => {}),
    leave: () => Promise.resolve(subscription.untrack()).catch(() => {}),
    stop: () => client.removeChannel(subscription),
  };
}

/**
 * What one person at a table tells the others directly, with no row in between.
 *
 * Presence's caveat applies here and not `watchTable`'s: nothing is read from
 * the database, so there is no `select()` list to bypass — what comes back is
 * what another subscriber said, and the caller decides how much of it to trust.
 * The channel's policies in 20260822090000_table_rolls.sql decide who may say
 * anything at all, and the caller is expected to put every value through the
 * same rules it would apply to its own.
 *
 * `self: false`, because the sender already knows: whoever rolled has the die
 * on their own board and does not want it back off the wire.
 *
 * `onReady` fires on every SUBSCRIBED, first join and reconnect alike. It is
 * the only moment a caller can be sure anything it says will be heard, which is
 * what a channel carrying state — rather than only events — needs in order to
 * catch a newcomer up.
 */
export function watchBroadcast(client, { channel, event, onMessage, onReady }) {
  const subscription = client.channel(channel, {
    config: { private: true, broadcast: { self: false } },
  });

  subscription
    .on("broadcast", { event }, ({ payload }) => onMessage(payload))
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onReady?.();
      }
    });

  return {
    send: (payload) =>
      subscription.send({ type: "broadcast", event, payload }).catch(() => {}),
    stop: () => client.removeChannel(subscription),
  };
}
