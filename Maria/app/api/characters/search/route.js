import { searchCharacters } from "sina/data/campaigns";
import { classLabel } from "sina/rules/character";
import { parseCharacterQuery } from "sina/rules/campaign";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Characters, searched by handle from the party panel.
 *
 * A route and not the Server Action it replaces, for the reason the item and
 * spell searches are routes: this is a READ on every keystroke, where an Action
 * is a POST serialised against the router's queue.
 *
 * `search_characters` is SECURITY DEFINER and its return type is the display
 * subset — see 20260818120000. Its shape is the boundary, not this handler.
 */

/** How many the list shows. The RPC's own limit is the one that counts. */
const RESULTS = 12;

export async function GET(request) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError) {
    logFailure("characterSearch/auth", authError);
    return Response.json({ characters: [] }, { status: 503 });
  }

  if (!user) {
    return Response.json({ characters: [] }, { status: 401 });
  }

  /* The same reader the Server Action used, so "fern#04", "fern" and "0451"
     still mean what they meant. Anything it refuses is somebody mid-type. */
  const parsed = parseCharacterQuery(request.nextUrl.searchParams.get("q"));

  if (!parsed) {
    return Response.json({ characters: [] });
  }

  const { data, error } = await searchCharacters(supabase, parsed);

  if (error) {
    logFailure("characterSearch", error);
    return Response.json({ characters: [], reason: error.reason });
  }

  return Response.json(
    {
      // Labelled here rather than in the browser: `classLabel` reaches through
      // the whole ARCHETYPES catalogue and the panel prints one word of it.
      characters: data.slice(0, RESULTS).map((character) => ({
        ...character,
        pathLabel: classLabel(character.class_id),
      })),
    },
    // Private, not shared: this is behind a session check.
    { headers: { "cache-control": "private, max-age=30" } },
  );
}
