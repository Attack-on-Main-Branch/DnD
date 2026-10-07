import { proficienciesFor } from "../rules/character-stats.js";

function failure(error) {
  const reason =
    error.code === "23514"
      ? "invalid_value"
      : error.code === "22P02"
        ? "bad_id"
        : ["42883", "PGRST202", "42P01", "PGRST205"].includes(error.code)
          ? "not_ready"
          : error.message?.includes("token_limit_reached")
            ? "limit_reached"
            : "failed";
  return { data: null, error: { reason, detail: error.message } };
}

async function rpc(supabase, name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return failure(error);
  return data === null
    ? { data: null, error: { reason: "not_found", detail: null } }
    : { data, error: null };
}

export function readCharacterProficiencies(supabase, campaignId, characterId) {
  return rpc(supabase, "read_character_proficiencies", {
    p_campaign_id: campaignId,
    p_character_id: characterId,
  });
}

export async function changeCharacterProficiency(
  supabase,
  { campaignId, characterId, group, name, remove },
) {
  const standing = await readCharacterProficiencies(
    supabase,
    campaignId,
    characterId,
  );
  if (standing.error) return standing;
  const base = proficienciesFor(
    standing.data.class_id,
    standing.data.custom_proficiencies,
  )[group];
  return rpc(supabase, "change_character_proficiency", {
    p_campaign_id: campaignId,
    p_character_id: characterId,
    p_group: group,
    p_name: name,
    p_remove: Boolean(remove),
    p_base: base,
  });
}

export function writeTokenTemplate(
  supabase,
  { id, campaignId, name, imageUrl, maxHp, editing = false },
) {
  return rpc(supabase, "write_token_template", {
    p_id: id,
    p_campaign_id: campaignId,
    p_name: name,
    p_image_url: imageUrl ?? null,
    p_max_hp: maxHp,
    p_editing: editing,
  });
}

export function changeTokenHealth(supabase, tokenId, delta) {
  return rpc(supabase, "change_token_health", {
    p_token_id: tokenId,
    p_delta: delta,
  });
}

export async function listTokenHealth(supabase, campaignId, templates = false) {
  const { data, error } = await supabase
    .from(templates ? "token_template_health" : "map_token_health")
    .select(templates ? "template_id, max_hp" : "token_id, current_hp, max_hp")
    .eq("campaign_id", campaignId);
  return error ? failure(error) : { data: data ?? [], error: null };
}
