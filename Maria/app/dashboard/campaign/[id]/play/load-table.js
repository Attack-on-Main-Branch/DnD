import { cache } from "react";
import { listCampaignActivity } from "sina/data/activity";
import {
  listCampaignMaps,
  listCampaignNotes,
  listPartyMembers,
  listPartySheets,
} from "sina/data/campaigns";
import { getCampaignCombat } from "sina/data/combat";
import { getCharacter, listCharacterNotes } from "sina/data/characters";
import {
  listDiceSkinUnlocks,
  listBannerSkinUnlocks,
} from "sina/data/dice-pouch";
import { listPartyFeatures } from "sina/data/features";
import {
  listCampaignContainers,
  listContainerItems,
} from "sina/data/containers";
import { listPartyPurses } from "sina/data/currency";
import { listPartyInventory } from "sina/data/inventory";
import { listSceneStaging } from "sina/data/scenes";
import { listPartySpells } from "sina/data/spells";
import {
  listCampaignTokenTemplates,
  listMapPlacedTokens,
} from "sina/data/tokens";
import { MAX_ACTIVITY_ENTRIES } from "sina/rules/activity";
import { unlockedDiceSkins, unlockedBannerSkins } from "sina/rules/dice-pouch";

import { logFailure } from "@/lib/errors";
import { DUNGEON_MASTER_SEAT } from "@/lib/routes";
import { createClient, currentUser } from "@/lib/supabase";

const tableSession = cache(async () => {
  const [supabase, session] = await Promise.all([
    createClient(),
    currentUser(),
  ]);
  return { supabase, ...session };
});

export const loadTableCampaign = cache(async (id) => {
  const { supabase, user } = await tableSession();
  return user ? getCampaignCombat(supabase, id) : null;
});

export async function loadTable(id, requestedSeat) {
  const { supabase, user, error: authError } = await tableSession();
  if (authError) {
    logFailure("table/auth", authError);
    return "auth-unavailable";
  }

  if (!user) {
    return "signed-out";
  }

  const table = loadTableCampaign(id);
  const seatsAndParty = Promise.all([
    table,
    listPartyMembers(supabase, id),
  ]).then(async ([{ data: campaign }, party]) => {
    if (!campaign) return null;

    const members = rows("listPartyMembers", party);
    const seats = seatsAt(campaign, members);
    const selected =
      seats.find((seat) => seat.id === requestedSeat) ?? seats[0];
    const dm = selected?.id === DUNGEON_MASTER_SEAT;
    const ids = members.map((member) => member.id);

    const [seat, inventory, spells, sheets, features, staging] =
      await Promise.all([
        readSeat(supabase, campaign.id, selected, user.id),
        listPartyInventory(supabase, ids),
        listPartySpells(supabase, ids),
        dm ? listPartySheets(supabase, id) : null,
        listPartyFeatures(supabase, ids),
        dm ? listSceneStaging(supabase, id) : null,
      ]);

    return {
      members,
      seat,
      inventory: rows("listPartyInventory", inventory),
      spells: rows("listPartySpells", spells),
      sheets: rows("listPartySheets", sheets),
      features: rows("listPartyFeatures", features),
      staging: rows("listSceneStaging", staging, null),
    };
  });

  const board = listCampaignMaps(supabase, id).then(async (result) => {
    const pictures = rows("listCampaignMaps", result);
    const tokens = await listMapPlacedTokens(
      supabase,
      pictures.map(({ id }) => id),
    );
    return { maps: pictures, tokens: rows("listMapPlacedTokens", tokens) };
  });

  const storage = listCampaignContainers(supabase, id).then(async (result) => {
    const shelf = rows("listCampaignContainers", result);
    const items = await listContainerItems(
      supabase,
      shelf.map(({ id }) => id),
    );
    return {
      containers: shelf,
      containerItems: rows("listContainerItems", items),
    };
  });

  const [
    { data: campaign, error },
    templates,
    activity,
    purses,
    details,
    pictures,
    chests,
  ] = await Promise.all([
    table,
    listCampaignTokenTemplates(supabase, id),
    listCampaignActivity(supabase, id, MAX_ACTIVITY_ENTRIES),
    listPartyPurses(supabase, id),
    seatsAndParty,
    board,
    storage,
  ]);

  const realFailure = error?.reason === "bad_id" ? null : error;
  if (realFailure) logFailure("getCampaignCombat", realFailure);
  if (!campaign) {
    return { campaign: null, error: realFailure };
  }

  return {
    campaign,
    ...details,
    ...pictures,
    ...chests,
    templates: rows("listCampaignTokenTemplates", templates),
    purses: rows("listPartyPurses", purses),
    activity: rows("listCampaignActivity", activity),
    error: null,
  };
}

function rows(action, result, fallback = []) {
  if (result?.error) {
    logFailure(action, result.error);
    return fallback;
  }
  return result?.data ?? fallback;
}

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
          diceColor: campaign.dice_color,
          diceSkin: campaign.dice_skin,
          title: "Dungeon Master",
        },
      ]
    : [];

  for (const member of members) {
    if (member.is_mine) {
      seats.push({
        id: member.id,
        characterId: member.id,
        diceColor: member.dice_color,
        diceSkin: member.dice_skin,
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
async function readSeat(supabase, campaignId, seat, userId) {
  if (!seat) {
    return null;
  }

  const [notes, sheet, unlocks, bannerUnlocks] = await Promise.all([
    seat.characterId
      ? listCharacterNotes(supabase, seat.characterId)
      : listCampaignNotes(supabase, campaignId),
    seat.characterId
      ? getCharacter(supabase, { id: seat.characterId, userId })
      : { data: null, error: null },
    /* The sets this chair has found, which is what a Pouch's reel is
       filled from: it shows only what the pouch could still hold. */
    listDiceSkinUnlocks(supabase, [seat.characterId].filter(Boolean)),
    listBannerSkinUnlocks(supabase, [seat.characterId].filter(Boolean)),
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

  if (bannerUnlocks.error)
    logFailure("table/listBannerSkinUnlocks", bannerUnlocks.error);

  if (unlocks.error) {
    logFailure("table/listDiceSkinUnlocks", unlocks.error);
  }

  return {
    ...seat,
    notes: notes.error ? [] : notes.data,
    sheet: sheet.error ? null : sheet.data,
    diceSkins: unlockedDiceSkins(unlocks.error ? [] : unlocks.data),
    bannerSkins: unlockedBannerSkins(
      bannerUnlocks.error ? [] : bannerUnlocks.data,
    ),
  };
}
