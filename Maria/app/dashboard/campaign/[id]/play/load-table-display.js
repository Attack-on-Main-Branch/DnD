import { listCampaignActivity } from "sina/data/activity";
import {
  getCampaignTable,
  listCampaignMaps,
  listPartyMembers,
} from "sina/data/campaigns";
import {
  listCampaignTokenTemplates,
  listMapPlacedTokens,
} from "sina/data/tokens";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import { readCombat } from "sina/rules/combat";

import { logFailure } from "@/lib/errors";

const DISPLAY_SLICES = {
  activity: true,
  combat: true,
  maps: true,
  party: true,
  tokens: true,
};

export async function loadTableDisplay(
  supabase,
  campaignId,
  want = DISPLAY_SLICES,
) {
  const { data: campaign, error } = await getCampaignTable(
    supabase,
    campaignId,
  );

  if (error && error.reason !== "bad_id") {
    logFailure("table-display/getCampaignTable", error);
    throw new Error("Could not load the table display");
  }

  if (!campaign?.is_owner) return null;

  const [activity, party, shelf] = await Promise.all([
    want.activity &&
      listCampaignActivity(supabase, campaignId, MAX_ACTIVITY_ENTRIES),
    want.party && listPartyMembers(supabase, campaignId),
    (want.maps || want.tokens) && listCampaignMaps(supabase, campaignId),
  ]);

  const maps = rows("listCampaignMaps", shelf);
  const active =
    maps?.find((map) => map.id === campaign.active_map_id) ??
    maps?.find((map) => map.is_world_map);
  const tokens =
    want.tokens && maps
      ? rows(
          "listMapPlacedTokens",
          await listMapPlacedTokens(supabase, [active?.id], {
            visibleOnly: true,
          }),
        )
      : undefined;
  const templateIds = new Set(
    tokens?.map((token) => token.template_id).filter(Boolean),
  );
  const templates = templateIds.size
    ? rows(
        "listCampaignTokenTemplates",
        await listCampaignTokenTemplates(supabase, campaignId),
      )?.filter((template) => templateIds.has(template.id))
    : [];

  const log = rows("listCampaignActivity", activity);
  return {
    title: campaign.title,
    diceSkin: campaign.dice_skin,
    slices: {
      activeMapId: want.maps && maps ? (active?.id ?? null) : undefined,
      maps: want.maps && maps ? (active ? [active] : []) : undefined,
      worldUrl: want.maps && maps ? campaign.map_url : undefined,
      combat: want.combat
        ? {
            ...readCombat(campaign),
            dice_color: campaign.dice_color,
            dice_skin: campaign.dice_skin,
          }
        : undefined,
      activity: log && readActivityLog(log),
      party: rows("listPartyMembers", party)?.map(
        ({
          id,
          name,
          avatar_url,
          dice_color,
          dice_skin,
          is_dead,
          conditions,
        }) => ({
          id,
          name,
          avatar_url,
          dice_color,
          dice_skin,
          is_dead,
          conditions,
        }),
      ),
      tokens,
      templates: tokens ? templates : undefined,
    },
  };
}

function rows(action, result) {
  if (!result) return undefined;

  if (result.error) {
    logFailure(`table-display/${action}`, result.error);
    return undefined;
  }

  return result.data;
}
