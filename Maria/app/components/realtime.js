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
 * supabase-js warns that this may be called concurrently and often, and each
 * call is a Server Action round trip. Held for well under the token's own
 * lifetime, so an expired one is replaced on the next connect rather than
 * cached past its use.
 */
const TOKEN_HELD_MS = 25000;
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

/** The client and the two ways of listening on it, in one await. */
export async function realtime() {
  const listeners = await import("sina/supabase/realtime");

  if (!client) {
    client = listeners.createRealtimeSupabase(accessToken);
    // Swallowed, not thrown: a socket that cannot be authorised is a page
    // without live updates, which every caller here already copes with.
    authorised = client.realtime.setAuth().catch(() => {});
  }

  await authorised;

  return { ...listeners, client };
}
