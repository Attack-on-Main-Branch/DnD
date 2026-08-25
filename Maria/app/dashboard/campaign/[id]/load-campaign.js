import {
  getCampaign,
  listCampaignNotes,
  listPartyMembers,
} from "sina/data/campaigns";
import {
  listCampaignContainers,
  listContainerItems,
} from "sina/data/containers";
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
      items: [],
      spells: [],
      containers: [],
      containerItems: [],
      error: realFailure,
    };
  }

  // Together rather than one after the other: five round trips, one wait.
  const [party, notes, items, spells, containers] = await Promise.all([
    listPartyMembers(supabase, id),
    listCampaignNotes(supabase, id),
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

  /* After the shelf rather than beside it: the ids are the query. */
  const held = await listContainerItems(
    supabase,
    shelf.map((container) => container.id),
  );

  if (held.error) {
    logFailure("listContainerItems", held.error);
  }

  // Logged rather than thrown on: the campaign is the page, and a party or a
  // notes tab that could not load is no reason to replace it with an error.
  return {
    campaign,
    members: party.error ? [] : party.data,
    notes: notes.error ? [] : notes.data,
    items: items.error ? [] : items.data,
    spells: spells.error ? [] : spells.data,
    containers: shelf,
    containerItems: held.error ? [] : held.data,
    error: null,
  };
});
