"use server";

import { listCampaignActivity } from "sina/data/activity";
import {
  listCampaignMarks,
  listPartyMembers,
  listPartySheets,
} from "sina/data/campaigns";
import { getCharacter } from "sina/data/characters";
import { listPartyPurses } from "sina/data/currency";
import { listPartyInventory } from "sina/data/inventory";
import { listPartySpells } from "sina/data/spells";
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

  const [activity, party, marks, inventory, purses, spells, sheets, seat] =
    await Promise.all([
      want.activity
        ? listCampaignActivity(supabase, campaignId, MAX_ACTIVITY_ENTRIES)
        : null,
      want.party ? listPartyMembers(supabase, campaignId) : null,
      want.marks ? listCampaignMarks(supabase, campaignId) : null,
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
    ]);

  return {
    /* Which packs and books this answer speaks for. A row list alone cannot say
       that a pack is now EMPTY, so the ids come back beside it. */
    characterIds: ids,

    // Read here rather than in the browser, as page.jsx does it: the payload is
    // jsonb, and the rules layer is what keeps a row written by an older
    // migration from reaching the panel as "undefined × undefined".
    activity: slice("listCampaignActivity", activity, readActivityLog),
    party: slice("listPartyMembers", party),
    marks: slice("listCampaignMarks", marks),
    inventory: slice("listPartyInventory", inventory),
    purses: slice("listPartyPurses", purses),
    spells: slice("listPartySpells", spells),

    // One shape for both, because the store reads one thing out of either: a
    // seat's own row and a party sheet both carry an `id` and `spell_slots`.
    sheets: sheetRows(sheets, seat),
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
