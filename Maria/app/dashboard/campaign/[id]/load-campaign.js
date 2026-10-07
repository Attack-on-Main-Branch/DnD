import {
  getCampaign,
  listCampaignMaps,
  listCampaignNotes,
  listPartyMembers,
} from "sina/data/campaigns";
import {
  listCampaignContainers,
  listContainerItems,
} from "sina/data/containers";
import { listPartyFeatures } from "sina/data/features";
import { listCampaignItems } from "sina/data/inventory";
import { listMemberLooks } from "sina/data/member-looks";
import { listCampaignSpells } from "sina/data/spells";
import { listCampaignTokenTemplates } from "sina/data/tokens";
import { listTokenHealth } from "sina/data/table-adjustments";
import { cache } from "react";

import { logFailure } from "@/lib/errors";
import { createClient, currentUser } from "@/lib/supabase";

/**
 * One load for a campaign, its party, its notes, both halves of its catalogue
 * and the containers standing on it. `cache` deduplicates within a request:
 * Next calls `generateMetadata` and the component separately.
 *
 * Returns a sentinel rather than redirecting — `generateMetadata` is not the
 * place for that, so the page decides.
 */
export const loadCampaign = cache(async function loadCampaign(id) {
  const supabase = await createClient();
  const { user, error: authError } = await currentUser();

  if (authError) {
    logFailure("campaign/auth", authError);
    return "auth-unavailable";
  }

  if (!user) {
    return "signed-out";
  }

  /* The campaign rides in the same wave as everything hung off it, rather than
     a wave ahead: the lists only need the id, RLS answers them for whoever is
     asking, and on a miss they are thrown away below unread. Eight round trips,
     one wait. */
  const [
    { data: campaign, error },
    party,
    notes,
    maps,
    items,
    spells,
    containers,
    tokens,
    looks,
    tokenHealth,
  ] = await Promise.all([
    getCampaign(supabase, { id, userId: user.id }),
    listPartyMembers(supabase, id),
    listCampaignNotes(supabase, id),
    listCampaignMaps(supabase, id),
    listCampaignItems(supabase, id),
    listCampaignSpells(supabase, id),
    listCampaignContainers(supabase, id),
    listCampaignTokenTemplates(supabase, id),
    listMemberLooks(supabase, id),
    listTokenHealth(supabase, id, true),
  ]);

  // `bad_id` is a hand-typed URL against a uuid column — a miss rather than a
  // failure. Everything else is handed to the page to throw on.
  const realFailure = error && error.reason !== "bad_id" ? error : null;

  if (realFailure) {
    logFailure("getCampaign", realFailure);
  }

  if (!campaign) {
    return {
      campaign: null,
      members: [],
      notes: [],
      maps: [],
      items: [],
      spells: [],
      containers: [],
      containerItems: [],
      features: [],
      tokens: [],
      error: realFailure,
    };
  }

  if (party.error) {
    logFailure("listPartyMembers", party.error);
  }

  if (notes.error) {
    logFailure("listCampaignNotes", notes.error);
  }

  if (maps.error) {
    logFailure("listCampaignMaps", maps.error);
  }

  if (items.error) {
    logFailure("listCampaignItems", items.error);
  }

  if (spells.error) {
    logFailure("listCampaignSpells", spells.error);
  }

  if (containers.error) {
    logFailure("listCampaignContainers", containers.error);
  }

  if (tokens.error) {
    logFailure("listCampaignTokenTemplates", tokens.error);
  }
  if (tokenHealth.error)
    logFailure("listTokenTemplateHealth", tokenHealth.error);

  if (looks.error) {
    logFailure("listMemberLooks", looks.error);
  }

  const described = looks.error ? [] : looks.data;

  const shelf = containers.error ? [] : containers.data;
  const roster = party.error ? [] : party.data;

  /* After the shelf and the party rather than beside them: both are queries
     whose ids come out of the wave above. One wait for the two. */
  const [held, features] = await Promise.all([
    listContainerItems(
      supabase,
      shelf.map((container) => container.id),
    ),
    listPartyFeatures(
      supabase,
      roster.map((member) => member.id),
    ),
  ]);

  if (held.error) {
    logFailure("listContainerItems", held.error);
  }

  if (features.error) {
    logFailure("listPartyFeatures", features.error);
  }

  // Logged rather than thrown on: the campaign is the page, and a party or a
  // notes tab that could not load is no reason to replace it with an error.
  return {
    campaign,
    members: roster.map((member) => ({
      ...member,
      look: described.find((one) => one.character_id === member.id) ?? null,
    })),
    notes: notes.error ? [] : notes.data,
    // Painted scenes belong to the table's shelf; the sheet would drop them.
    maps: maps.error ? [] : maps.data.filter((map) => !map.is_scene),
    items: items.error ? [] : items.data,
    spells: spells.error ? [] : spells.data,
    containers: shelf,
    containerItems: held.error ? [] : held.data,
    features: features.error ? [] : features.data,
    tokens: tokens.error
      ? []
      : tokens.data.map((token) => ({
          ...token,
          max_hp:
            tokenHealth.data?.find((row) => row.template_id === token.id)
              ?.max_hp ?? null,
        })),
    error: null,
  };
});
