import { cache } from "react";
import {
  getCampaignTable,
  listCampaignMarks,
  listCampaignNotes,
  listPartyMembers,
} from "sina/data/campaigns";
import { listCharacterNotes } from "sina/data/characters";
import { listPartyInventory } from "sina/data/inventory";

import { logFailure } from "@/lib/errors";
import { DUNGEON_MASTER_SEAT } from "@/lib/routes";
import { createClient, currentUser } from "@/lib/supabase";

/**
 * The table's own load, and deliberately not the sheet's. load-campaign.js
 * reads the campaign as its owner; this goes through `campaign_table`, which
 * answers for the Dungeon Master and for every player with a character in the
 * party, and hands back only what the board paints.
 *
 * `cache` deduplicates within a request: `generateMetadata` and the component
 * each call it. Sentinels rather than redirects, since `generateMetadata` is
 * not the place for those.
 */
export const loadTable = cache(async function loadTable(id, requestedSeat) {
  const supabase = await createClient();
  const { user, error: authError } = await currentUser();

  if (authError) {
    logFailure("table/auth", authError);
    return "auth-unavailable";
  }

  if (!user) {
    return "signed-out";
  }

  const { data: campaign, error } = await getCampaignTable(supabase, id);

  // `bad_id` is a hand-typed URL against a uuid column — a miss rather than a
  // failure. Everything else is handed to the page to throw on.
  const realFailure = error && error.reason !== "bad_id" ? error : null;

  if (realFailure) {
    logFailure("getCampaignTable", realFailure);
  }

  if (!campaign) {
    return {
      campaign: null,
      members: [],
      marks: [],
      inventory: [],
      seat: null,
      error: realFailure,
    };
  }

  /* Together rather than one after the other, the way load-campaign.js does.
     Not only the first paint: every doorbell here is answered by re-rendering
     the whole route. The seat still waits for the party, being chosen out of
     it. */
  const [party, tokens] = await Promise.all([
    listPartyMembers(supabase, id),
    listCampaignMarks(supabase, id),
  ]);

  if (party.error) {
    logFailure("listPartyMembers", party.error);
  }

  if (tokens.error) {
    logFailure("listCampaignMarks", tokens.error);
  }

  const members = party.error ? [] : party.data;

  /* Both wait on the party and neither on the other. RLS decides what comes
     back: the Dungeon Master reads the whole table's packs, a player their
     own. */
  const [seat, packs] = await Promise.all([
    readSeat(supabase, campaign, members, requestedSeat),
    listPartyInventory(
      supabase,
      members.map((member) => member.id),
    ),
  ]);

  if (packs.error) {
    logFailure("listPartyInventory", packs.error);
  }

  // Logged rather than thrown on: the map is the page, and neither a party nor
  // a set of marks that could not load is a reason to replace it with an error.
  return {
    campaign,
    members,
    marks: tokens.error ? [] : tokens.data,
    inventory: packs.error ? [] : packs.data,
    seat,
    error: null,
  };
});

/**
 * Every chair at this table that belongs to the viewer, which an account owning
 * the campaign and a character in it can be more than one of. Not offered as a
 * choice — it is what the requested seat is checked against. The Dungeon
 * Master's comes first, being the fallback when no seat was named at all.
 */
function seatsAt(campaign, members) {
  const seats = campaign.is_owner
    ? [
        {
          id: DUNGEON_MASTER_SEAT,
          characterId: null,
          title: "Dungeon Master",
        },
      ]
    : [];

  for (const member of members) {
    if (member.is_mine) {
      seats.push({
        id: member.id,
        characterId: member.id,
        title: member.name,
      });
    }
  }

  return seats;
}

/**
 * The chair the viewer is actually in, and the notes that come with it.
 *
 * `requestedSeat` comes from the query string, so the chair survives a reload
 * and can be linked. Anything that is not one of theirs falls back to the
 * first: a hand-typed id is not a way into somebody else's notebook, and
 * neither is a stale link to a character that has left the party.
 *
 * The notes follow the chair rather than the account — a Dungeon Master writes
 * on the campaign, the only note in the app that belongs to no sheet. A failure
 * comes back empty rather than taking the board down.
 */
async function readSeat(supabase, campaign, members, requestedSeat) {
  const seats = seatsAt(campaign, members);
  const seat = seats.find((one) => one.id === requestedSeat) ?? seats[0];

  if (!seat) {
    return null;
  }

  const { data, error } = seat.characterId
    ? await listCharacterNotes(supabase, seat.characterId)
    : await listCampaignNotes(supabase, campaign.id);

  if (error) {
    logFailure(
      seat.characterId ? "listCharacterNotes" : "listCampaignNotes",
      error,
    );
  }

  return { ...seat, notes: error ? [] : data };
}
