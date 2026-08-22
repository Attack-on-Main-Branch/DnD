import {
  getCampaign,
  listCampaignNotes,
  listPartyMembers,
} from "sina/data/campaigns";
import { listCampaignItems } from "sina/data/inventory";
import { cache } from "react";

import { logFailure } from "@/lib/errors";
import { createClient, currentUser } from "@/lib/supabase";

/**
 * One load for a campaign, its party, its notes and its items. `cache` deduplicates within
 * a request: Next calls `generateMetadata` and the component separately, which
 * would otherwise fetch all three twice per view.
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
      error: realFailure,
    };
  }

  // Together rather than one after the other: three round trips, one wait.
  const [party, notes, items] = await Promise.all([
    listPartyMembers(supabase, id),
    listCampaignNotes(supabase, id),
    listCampaignItems(supabase, id),
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

  // Logged rather than thrown on: the campaign is the page, and a party or a
  // notes tab that could not load is no reason to replace it with an error.
  return {
    campaign,
    members: party.error ? [] : party.data,
    notes: notes.error ? [] : notes.data,
    items: items.error ? [] : items.data,
    error: null,
  };
});
