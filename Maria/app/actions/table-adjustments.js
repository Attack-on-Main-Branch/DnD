"use server";

import {
  changeCharacterProficiency,
  readCharacterProficiencies,
  changeTokenHealth,
  listTokenHealth,
  listTokenHealthStates,
} from "sina/data/table-adjustments";
import {
  proficienciesFor,
  PROFICIENCY_GROUPS,
  readProficiencyName,
} from "sina/rules/character-stats";
import { validTokenHealthDelta } from "sina/rules/token-health";
import { createClient, getCurrentUser } from "@/lib/supabase";
import { logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";

const COPY = {
  not_found: "That is no longer yours to change.",
  bad_id: "That is no longer there.",
  invalid_value: "That value is outside the allowed limits.",
  not_ready: "That part of the app is not ready yet.",
};

async function perform(action, work) {
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);
  if (!user) return sessionRejection(action, authError);
  const { data, error } = await work(supabase);
  if (error) {
    const copy = COPY[error.reason];
    logUncovered(action, error, copy);
    return rejected(copy ?? "Could not save that. Try again.");
  }
  return { kind: "success", data };
}

export async function readProficiencies(campaignId, characterId) {
  const result = await perform("readProficiencies", (client) =>
    readCharacterProficiencies(client, campaignId, characterId),
  );
  return presentProficiencies(result);
}

export async function changeProficiency(
  campaignId,
  characterId,
  group,
  value,
  remove = false,
) {
  const name = readProficiencyName(value);
  if (
    !name ||
    !PROFICIENCY_GROUPS.includes(group) ||
    typeof remove !== "boolean"
  ) {
    return rejected(
      "Choose a category and enter a proficiency of up to 60 characters.",
    );
  }
  const result = await perform("changeProficiency", (client) =>
    changeCharacterProficiency(client, {
      campaignId,
      characterId,
      group,
      name,
      remove,
    }),
  );
  return presentProficiencies(result);
}

function presentProficiencies(result) {
  if (result.kind === "success") {
    return {
      kind: "success",
      proficiencies: proficienciesFor(
        result.data.class_id,
        result.data.custom_proficiencies,
      ),
    };
  }
  return result;
}

export async function readTokenHealth(campaignId) {
  return perform("readTokenHealth", (client) =>
    listTokenHealth(client, campaignId),
  );
}

export async function readTokenHealthStates(campaignId) {
  return perform("readTokenHealthStates", (client) =>
    listTokenHealthStates(client, campaignId),
  );
}

export async function adjustTokenHealth(tokenId, delta) {
  if (!validTokenHealthDelta(delta))
    return rejected(
      "Enter a whole number of hit points within the allowed limits.",
    );
  return perform("adjustTokenHealth", (client) =>
    changeTokenHealth(client, tokenId, delta),
  );
}
