"use client";

import { realtimeToken } from "@/app/actions/notifications";

/**
 * The page's one socket, and the token that keeps it open.
 *
 * Built once and shared: the header's inbox, a campaign's party and the table's
 * chairs are three channels on one connection. Loaded with `import()` so
 * supabase-js lands in a chunk fetched after hydration rather than in the
 * bundle every signed-in page pays for up front.
 */
let client = null;

/**
 * The first token, awaited rather than raced. supabase-js fetches one in the
 * background and pushes it to the socket when it lands, so a channel joining
 * before then joins unauthenticated: a public one does not notice, a private
 * one is refused outright and only recovers on the retry after.
 */
let authorised = null;

/**
 * supabase-js calls this often and each call is a Server Action round trip, so
 * it is held — for well under the token's own hour.
 *
 * Not twenty-five seconds, which is what it was: that is exactly the socket's
 * heartbeat, and supabase-js re-reads the token on every one, so the window
 * closed as the next call arrived and the cache missed every single time.
 */
const TOKEN_HELD_MS = 60000;
let held = { token: null, at: 0 };

async function accessToken() {
  const now = Date.now();

  if (held.token && now - held.at < TOKEN_HELD_MS) {
    return held.token;
  }

  const token = await realtimeToken();
  held = { token, at: now };

  return token;
}

/** The client and the ways of listening on it, in one await. */
export async function realtime() {
  /* Started before the import, not after: a megabyte off the network and a
     Server Action have nothing to say to each other, and waiting for them in
     turn put a whole round trip on the front of every arrival at a table. */
  const warming = accessToken().catch(() => null);
  const listeners = await import("sina/supabase/realtime");

  await warming;

  if (!client) {
    client = listeners.createRealtimeSupabase(accessToken);
    // Swallowed, not thrown: a socket that cannot be authorised is a page
    // without live updates, which every caller here already copes with.
    authorised = client.realtime.setAuth().catch(() => {});
  }

  await authorised;

  return { ...listeners, client };
}
