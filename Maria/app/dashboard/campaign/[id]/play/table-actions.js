"use server";

import { listPartyFeatures } from "sina/data/features";
import { listCampaignActivity } from "sina/data/activity";
import {
  getCampaignTable,
  listCampaignMaps,
  listPartyMembers,
  listPartySheets,
} from "sina/data/campaigns";
import { getCharacter } from "sina/data/characters";
import {
  listCampaignContainers,
  listContainerItems,
} from "sina/data/containers";
import { listPartyPurses } from "sina/data/currency";
import { listPartyInventory } from "sina/data/inventory";
import { listPartySpells } from "sina/data/spells";
import {
  listCampaignTokenTemplates,
  listMapPlacedTokens,
} from "sina/data/tokens";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * "Read me back the part of the table that just moved."
 *
 * The replacement for `router.refresh()` on this route, and the difference is
 * scope: a refresh re-runs `loadTable`'s nine or ten queries and re-renders
 * every Server Component on the page. This runs one auth call and the one or two
 * queries the caller needs, and renders nothing.
 *
 * NO `revalidatePath`, deliberately: calling it inside a Server Action makes the
 * response carry a re-rendered tree for the page the caller is standing on,
 * which is the cost this exists to avoid.
 *
 * Every list goes through the same definer functions and `select()` lists
 * `loadTable` uses, so RLS decides what comes back exactly as it does on a full
 * render. `characterIds` is a bandwidth measure and never a permission.
 *
 * A failure comes back as an absent slice rather than a rejection: every caller
 * is reconciling after something that has already happened.
 */
export async function readTableSlice(campaignId, want = {}) {
  if (!campaignId) {
    return null;
  }

  const supabase = await createClient();
  const { user } = await getCurrentUser(supabase);

  if (!user) {
    return null;
  }

  const ids = (want.characterIds ?? []).filter(Boolean);

  const [
    activity,
    party,
    templates,
    inventory,
    purses,
    spells,
    sheets,
    seat,
    containers,
    features,
    maps,
    table,
  ] = await Promise.all([
    want.activity
      ? listCampaignActivity(supabase, campaignId, MAX_ACTIVITY_ENTRIES)
      : null,
    want.party ? listPartyMembers(supabase, campaignId) : null,
    /* The hand, beside the board rather than after it: a piece invented since
       this page rendered is one the palette has no picture for. */
    want.tokens ? listCampaignTokenTemplates(supabase, campaignId) : null,
    want.inventory ? listPartyInventory(supabase, ids) : null,
    want.purses ? listPartyPurses(supabase, campaignId) : null,
    want.spells ? listPartySpells(supabase, ids) : null,
    /* The party's slots, for the head of the table: `campaign_sheets` answers
         the campaign's owner alone. */
    want.sheets ? listPartySheets(supabase, campaignId) : null,
    /* And a player's own, which no party-wide read hands back — the columns
         are on `characters`, where RLS is "your own characters". */
    want.seatCharacterId
      ? getCharacter(supabase, { id: want.seatCharacterId, userId: user.id })
      : null,
    /* The shelf. What is INSIDE waits on it — the ids are the query — so
       that is fetched below rather than here. */
    want.containers ? listCampaignContainers(supabase, campaignId) : null,
    want.features ? listPartyFeatures(supabase, ids) : null,
    /* The shelf of maps and what is standing on the table. Both together or
       neither: a switcher that knew the pictures but not which one is up would
       show the party's own board as unlit.

       The shelf is also read for the pieces, whose query is `map_id in (…)` —
       so a board asked for on its own still pays for it. */
    want.maps || want.tokens ? listCampaignMaps(supabase, campaignId) : null,
    /* One row, two answers: which picture is on the table, and whether the
       party is fighting over it. Asked for either — a `campaigns` doorbell
       rings for both, and the second query would be the same query. */
    want.maps || want.combat ? getCampaignTable(supabase, campaignId) : null,
  ]);

  const shelf = slice("listCampaignContainers", containers);
  const pictures = slice("listCampaignMaps", maps);

  /* Both wait on a list of ids from the wave above. One wait for the two. */
  const [containerItems, placed] = await Promise.all([
    shelf
      ? listContainerItems(
          supabase,
          shelf.map((container) => container.id),
        )
      : null,
    want.tokens && pictures
      ? listMapPlacedTokens(
          supabase,
          pictures.map((map) => map.id),
        )
      : null,
  ]);

  return {
    /* Which packs and books this answer speaks for. A row list alone cannot say
       that a pack is now EMPTY, so the ids come back beside it. */
    characterIds: ids,

    /* What the party can do. Scoped to `ids` for bandwidth and never for
       permission: the SELECT policy hands the whole table's over either way. */
    features: slice("listPartyFeatures", features),

    // Read here rather than in the browser, as page.jsx does it: the payload is
    // jsonb, and the rules layer is what keeps a row written by an older
    // migration from reaching the panel as "undefined × undefined".
    activity: slice("listCampaignActivity", activity, readActivityLog),
    party: slice("listPartyMembers", party),
    inventory: slice("listPartyInventory", inventory),
    purses: slice("listPartyPurses", purses),
    spells: slice("listPartySpells", spells),

    /* Both halves together, always: a chest that arrives without its rows is
       a chest that opens onto nothing. */
    containers: shelf,
    containerItems: slice("listContainerItems", containerItems),

    // One shape for both, because the store reads one thing out of either: a
    // seat's own row and a party sheet both carry an `id` and `spell_slots`.
    sheets: sheetRows(sheets, seat),

    /* What is on the board, and the pieces it is drawn from. Both together or
       neither, for the reason the shelf and the active map are: a placement
       naming a piece this chair has no picture for draws nothing. */
    tokens: slice("listMapPlacedTokens", placed),
    templates: slice("listCampaignTokenTemplates", templates),

    /* The backstop behind the switcher's own broadcast: a chair that missed
       the message, or joined after it, asks the database instead. */
    maps: want.maps ? pictures : undefined,
    activeMapId: slice(
      "getCampaignTable",
      table,
      (row) => row?.active_map_id ?? null,
    ),

    /* The whole of the fight, off the same row. Read through the rules layer in
       the store rather than here — see `setCombat` in table-state.jsx. */
    combat: slice("getCampaignTable", table, (row) => row ?? undefined),
  };
}

/** Absent for a slice nobody asked for, and for one that could not be read. */
function slice(action, result, read = (rows) => rows) {
  if (!result) {
    return undefined;
  }

  if (result.error) {
    logFailure(action, result.error);
    return undefined;
  }

  return read(result.data);
}

function sheetRows(party, seat) {
  const rows = slice("listPartySheets", party);
  const mine = slice("table/getCharacter", seat);

  if (!rows && !mine) {
    return undefined;
  }

  return [...(rows ?? []), ...(mine ? [mine] : [])];
}
