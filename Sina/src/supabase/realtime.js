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

    /*
     * A ceiling on how often the server will send us anything, not a buffer:
     * these subscriptions exist to say "something changed, go and re-read",
     * and the re-read is a round trip of its own. Four a second is generous
     * for an inbox and cheap insurance against a loop.
     */
    realtime: { params: { eventsPerSecond: 4 } },
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
 * Who else is on this channel, for as long as we are on it too.
 *
 * The opposite of `watchTable` above in one respect: this payload is the point.
 * Nothing is read from the database, so there is no `select()` list to bypass —
 * what comes back is what the other subscribers said about themselves, and the
 * caller decides how much of it to trust.
 *
 * `private: true` is what makes that trustworthy: Realtime puts the channel's
 * topic to the policies on `realtime.messages` before anyone may join or track,
 * so an outsider can neither read this roster nor add themselves to it — see
 * 20260821240000_table_presence.sql. Without those policies the subscription
 * fails and `onChange` is handed the empty roster it reports for an empty room.
 *
 * `key` collapses one person's several tabs into one seat; left to itself
 * Realtime keys on the socket, so opening the table twice seats you twice.
 */
export function watchPresence(client, { channel, key, meta, onChange }) {
  const subscription = client.channel(channel, {
    config: { private: true, presence: { key, enabled: true } },
  });

  subscription
    .on("presence", { event: "sync" }, () =>
      onChange(Object.values(subscription.presenceState()).flat()),
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        Promise.resolve(subscription.track(meta)).catch(() => {});
        return;
      }

      // A socket that dropped is not a table that emptied, but it is the last
      // thing we know for certain — better a rail that goes dark than one
      // reporting a room from ten minutes ago.
      onChange([]);
    });

  return () => {
    client.removeChannel(subscription);
  };
}
