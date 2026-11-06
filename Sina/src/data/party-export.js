import { getCampaign, listPartyMembers, listPartySheets } from "./campaigns.js";
import { listCampaignContainers } from "./containers.js";
import { listPartyFeatures } from "./features.js";
import { listPartyInventory } from "./inventory.js";
import { listPartySpells } from "./spells.js";
import { buildPartyExport } from "../rules/party-export.js";

const PAGE_SIZE = 500;

async function readInventory(supabase, ids) {
  const data = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await listPartyInventory(supabase, ids, {
      from,
      to: from + PAGE_SIZE - 1,
    });
    if (result.error) return result;
    data.push(...result.data);
    if (result.data.length < PAGE_SIZE) return { data, error: null };
  }
}

export async function readPartyExport(supabase, { campaignId, userId }) {
  const campaign = await getCampaign(supabase, { id: campaignId, userId });
  if (campaign.error) return campaign;
  if (!campaign.data)
    return { data: null, error: { reason: "not_found", detail: null } };

  const [party, sheets, containers] = await Promise.all([
    listPartyMembers(supabase, campaignId),
    listPartySheets(supabase, campaignId),
    listCampaignContainers(supabase, campaignId),
  ]);
  for (const result of [party, sheets, containers]) {
    if (result.error) return { data: null, error: result.error };
  }

  const ids = party.data.map((member) => member.id);
  const [inventory, spells, features] = await Promise.all([
    readInventory(supabase, ids),
    listPartySpells(supabase, ids),
    listPartyFeatures(supabase, ids),
  ]);
  for (const result of [inventory, spells, features]) {
    if (result.error) return { data: null, error: result.error };
  }

  try {
    return {
      data: buildPartyExport({
        campaign: campaign.data,
        members: party.data,
        sheets: sheets.data,
        inventory: inventory.data,
        spells: spells.data,
        features: features.data,
        containers: containers.data,
      }),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: { reason: "incomplete_party", detail: error.message },
    };
  }
}
