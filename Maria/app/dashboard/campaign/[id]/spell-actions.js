"use server";

import { revalidatePath } from "next/cache";
import { insertCampaignSpell, removeCampaignSpell } from "sina/data/spells";
import { MAX_CAMPAIGN_SPELLS, validateSpell } from "sina/rules/spells";

import { logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignSheetPath, campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The campaign's spell catalogue, written and struck out from the Create tab.
 * Separate from play/spell-actions.js: those teach and cast what exists, these
 * decide what exists. Nothing here touches anybody's spellbook.
 */

/** `already_known` is a unique violation, which here means the name is taken. */
const SPELL_COPY = {
  already_known: "A spell by that name is already written down.",
  limit_reached: `A campaign holds ${MAX_CAMPAIGN_SPELLS} spells. Strike one out first.`,
  invalid_value: "That is outside what a spell can hold.",
  not_found: "That campaign is no longer yours.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That campaign is no longer there.",
};

/** The sheet shows the catalogue and the table searches it. */
function revalidateBoth(campaignId) {
  revalidatePath(campaignSheetPath(campaignId));
  revalidatePath(campaignTablePath(campaignId));
}

function refused(action, error, fallback) {
  const copy = SPELL_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/**
 * The slug `validateSpell` derives is the point: it is the key a spellbook
 * stacks on, prefixed `custom:` so a homebrew Fireball and the SRD's can sit on
 * one shelf.
 */
export async function writeCampaignSpell(campaignId, values) {
  const { values: spell, errors } = validateSpell(values ?? {});

  if (errors) {
    return rejected(errors.name ?? errors.level ?? errors.description);
  }

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("writeCampaignSpell", authError);
  }

  // "DMs write their own spellbook" answers for the owner and returns no row
  // to anybody else, which reads here as a miss.
  const { error } = await insertCampaignSpell(supabase, { campaignId, spell });

  if (error) {
    return refused("writeCampaignSpell", error, "Could not write that down.");
  }

  revalidateBoth(campaignId);
  return { kind: "success", name: spell.name };
}

/** One struck out. What the party has already learned is untouched. */
export async function strikeCampaignSpell(campaignId, id) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return sessionRejection("strikeCampaignSpell", authError);
  }

  const { error } = await removeCampaignSpell(supabase, { campaignId, id });

  if (error) {
    return refused("strikeCampaignSpell", error, "Could not strike that out.");
  }

  revalidateBoth(campaignId);
  return { kind: "success" };
}
