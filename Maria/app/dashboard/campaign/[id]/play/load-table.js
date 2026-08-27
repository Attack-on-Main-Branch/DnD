import { cache } from "react";
import { listCampaignActivity } from "sina/data/activity";
import {
  getCampaignTable,
  listCampaignMarks,
  listCampaignNotes,
  listPartyMembers,
  listPartySheets,
} from "sina/data/campaigns";
import { getCharacter, listCharacterNotes } from "sina/data/characters";
import { listPartyFeatures } from "sina/data/features";
import {
  listCampaignContainers,
  listContainerItems,
} from "sina/data/containers";
import { listPartyPurses } from "sina/data/currency";
import { listPartyInventory } from "sina/data/inventory";
import { listPartySpells } from "sina/data/spells";
import { MAX_ACTIVITY_ENTRIES } from "sina/rules/activity";

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
      spells: [],
      purses: [],
      activity: [],
      sheets: [],
      features: [],
      containers: [],
      containerItems: [],
      seat: null,
      error: realFailure,
    };
  }

  /* Together rather than one after the other, the way load-campaign.js does.
     Not only the first paint: every doorbell here is answered by re-rendering
     the whole route. The seat still waits for the party, being chosen out of
     it. */
  const [party, tokens, log, purses, containers] = await Promise.all([
    listPartyMembers(supabase, id),
    listCampaignMarks(supabase, id),
    listCampaignActivity(supabase, id, MAX_ACTIVITY_ENTRIES),
    /* Beside the party rather than after it: `campaign_purses` is asked about
       the campaign, and it decides for itself whose purses the caller may
       read — the whole party's for a Dungeon Master, their own for a player. */
    listPartyPurses(supabase, id),
    /* And beside it for the same reason: the SELECT policy on `containers`
       decides which this viewer may see, so neither the party nor the seat is
       needed to ask. */
    listCampaignContainers(supabase, id),
  ]);

  if (party.error) {
    logFailure("listPartyMembers", party.error);
  }

  if (purses.error) {
    logFailure("listPartyPurses", purses.error);
  }

  if (tokens.error) {
    logFailure("listCampaignMarks", tokens.error);
  }

  if (log.error) {
    logFailure("listCampaignActivity", log.error);
  }

  if (containers.error) {
    logFailure("listCampaignContainers", containers.error);
  }

  const members = party.error ? [] : party.data;
  const shelf = containers.error ? [] : containers.data;

  /* All three wait on the party and none on the others. RLS decides what comes
     back: the Dungeon Master reads the whole table's packs, a player their
     own. */
  const [seat, packs, books, sheets, held, features] = await Promise.all([
    readSeat(supabase, campaign, members, requestedSeat, user.id),
    listPartyInventory(
      supabase,
      members.map((member) => member.id),
    ),
    /* The same boundary over `character_spells`: the head of the table reads
       the party's books, a player their own. */
    listPartySpells(
      supabase,
      members.map((member) => member.id),
    ),
    /* The party's scores and skills. `campaign_sheets` answers the owner
       alone, so this is asked on the deed rather than on the chair — which
       chair they are in is settled a step below, and an owner sitting as a
       character reads their own sheet through readSeat. One stable RPC over
       six rows at most, rather than a second round trip after the seat. */
    campaign.is_owner
      ? listPartySheets(supabase, id)
      : { data: [], error: null },
    /* What is in the containers nobody is carrying. The ids are the query, so
       this waits on the shelf and on nothing else. */
    listContainerItems(
      supabase,
      shelf.map((container) => container.id),
    ),
    /* The whole party's, and RLS hands over everybody's: a feature is what a
       character can do, and the table finds that out the first time they do it.
       Only the ids this read already has — see listPartyFeatures. */
    listPartyFeatures(
      supabase,
      members.map((member) => member.id),
    ),
  ]);

  if (packs.error) {
    logFailure("listPartyInventory", packs.error);
  }

  if (books.error) {
    logFailure("listPartySpells", books.error);
  }

  if (sheets.error) {
    logFailure("listPartySheets", sheets.error);
  }

  if (features.error) {
    logFailure("listPartyFeatures", features.error);
  }

  if (held.error) {
    logFailure("listContainerItems", held.error);
  }

  // Logged rather than thrown on: the map is the page, and neither a party nor
  // a set of marks that could not load is a reason to replace it with an error.
  return {
    campaign,
    members,
    marks: tokens.error ? [] : tokens.data,
    inventory: packs.error ? [] : packs.data,
    spells: books.error ? [] : books.data,
    purses: purses.error ? [] : purses.data,
    activity: log.error ? [] : log.data,
    sheets: sheets.error ? [] : sheets.data,
    features: features.error ? [] : features.data,
    containers: shelf,
    containerItems: held.error ? [] : held.data,
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
 * The chair the viewer is actually in, and the notes and the sheet that come
 * with it.
 *
 * `requestedSeat` comes from the query string, so the chair survives a reload
 * and can be linked. Anything that is not one of theirs falls back to the
 * first: a hand-typed id is not a way into somebody else's notebook, and
 * neither is a stale link to a character that has left the party.
 *
 * The notes follow the chair rather than the account — a Dungeon Master writes
 * on the campaign, the only note in the app that belongs to no sheet. A failure
 * comes back empty rather than taking the board down.
 *
 * The sheet is what the ability mark opens, read as the viewer's own character
 * — being theirs is what put this seat in the list. `campaign_party` cannot
 * answer for it: its return type is the display subset, and the ability columns
 * are not in it. A Dungeon Master's chair has no character and so no sheet.
 */
async function readSeat(supabase, campaign, members, requestedSeat, userId) {
  const seats = seatsAt(campaign, members);
  const seat = seats.find((one) => one.id === requestedSeat) ?? seats[0];

  if (!seat) {
    return null;
  }

  const [notes, sheet] = await Promise.all([
    seat.characterId
      ? listCharacterNotes(supabase, seat.characterId)
      : listCampaignNotes(supabase, campaign.id),
    seat.characterId
      ? getCharacter(supabase, { id: seat.characterId, userId })
      : { data: null, error: null },
  ]);

  if (notes.error) {
    logFailure(
      seat.characterId ? "listCharacterNotes" : "listCampaignNotes",
      notes.error,
    );
  }

  if (sheet.error) {
    logFailure("table/getCharacter", sheet.error);
  }

  return {
    ...seat,
    notes: notes.error ? [] : notes.data,
    sheet: sheet.error ? null : sheet.data,
  };
}
