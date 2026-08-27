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
import { listCampaignSpells } from "sina/data/spells";
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

  const { data: campaign, error } = await getCampaign(supabase, {
    id,
    userId: user.id,
  });

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
      error: realFailure,
    };
  }

  // Together rather than one after the other: six round trips, one wait.
  const [party, notes, maps, items, spells, containers] = await Promise.all([
    listPartyMembers(supabase, id),
    listCampaignNotes(supabase, id),
    listCampaignMaps(supabase, id),
    listCampaignItems(supabase, id),
    listCampaignSpells(supabase, id),
    listCampaignContainers(supabase, id),
  ]);

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
    members: party.error ? [] : party.data,
    notes: notes.error ? [] : notes.data,
    maps: maps.error ? [] : maps.data,
    items: items.error ? [] : items.data,
    spells: spells.error ? [] : spells.data,
    containers: shelf,
    containerItems: held.error ? [] : held.data,
    features: features.error ? [] : features.data,
    error: null,
  };
});
