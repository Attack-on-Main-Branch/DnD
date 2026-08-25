/**
 * What a container is — a bag somebody carries, or a chest the table has not
 * found yet.
 *
 * A READER as well as a validator, which the pack has no need of: two shapes
 * live in one table, and normalising them once here keeps every drawer from
 * asking which it is holding.
 *
 * Every bound is mirrored by a CHECK in 20260831090000. Changing one means
 * changing both.
 */

/** Mirrors the `type` CHECK. */
export const CONTAINER_TYPES = ["bag", "chest"];

export const MAX_CONTAINER_NAME_LENGTH = 60;

/** Mirrors the trigger in the same migration. */
export const MAX_CAMPAIGN_CONTAINERS = 24;

/** The party limit: `reveal_chest` filters the list against `campaign_members`. */
export const MAX_CONTAINER_AUDIENCE = 6;

export function isContainerType(value) {
  return CONTAINER_TYPES.includes(value);
}

function text(value, limit) {
  const trimmed = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return trimmed ? trimmed.slice(0, limit) : "";
}

/** Deduplicated, in the order chosen, bounded — and nothing but ids. */
function ids(values) {
  const kept = [];

  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value === "string" && value && !kept.includes(value)) {
      kept.push(value);
    }
  }

  return kept.slice(0, MAX_CONTAINER_AUDIENCE);
}

/**
 * One container, as it will be written. `{ values }` or `{ errors }`, the shape
 * `validateItem` uses.
 *
 * A NAME AND A KIND, and nothing else: a bag is put into somebody's hands and a
 * chest is revealed at the table, never here, so neither an owner nor an
 * audience can arrive with a container being made.
 */
export function validateContainer({ name, type }) {
  const errors = {};
  const cleanName = text(name, MAX_CONTAINER_NAME_LENGTH);

  if (cleanName.length === 0) {
    errors.name = "A container needs a name.";
  }

  if (!isContainerType(type)) {
    errors.type = "Choose a bag or a chest.";
  }

  return Object.keys(errors).length > 0
    ? { values: null, errors }
    : { values: { name: cleanName, type }, errors: null };
}

/**
 * One row, reduced to what a drawer draws — or null for anything that does not
 * hold together. The checks stand for a database a migration behind the app.
 */
export function readContainer(row) {
  const id = row?.id;
  const type = row?.type;
  const name = text(row?.name, MAX_CONTAINER_NAME_LENGTH);

  if (!id || !isContainerType(type) || !name) {
    return null;
  }

  const chest = type === "chest";

  return {
    id,
    name,
    type,
    campaignId: row.campaign_id ?? null,
    ownerCharacterId: chest ? null : (row.owner_character_id ?? null),
    isRevealed: chest ? Boolean(row.is_revealed) : false,
    visibleTo: chest ? ids(row.visible_to_character_ids) : [],
    createdAt: row.created_at ?? null,
  };
}

/** The whole shelf, with anything unreadable left out. */
export function readContainers(rows) {
  return (rows ?? []).map(readContainer).filter(Boolean);
}

/**
 * Whether a seat may open this one. A CONVENIENCE and never a permission: the
 * SELECT policy asks the same questions and `take_chest_item` asks them again.
 * A null `characterId` is the head of the table, who sees everything.
 */
export function canOpenContainer(container, characterId) {
  if (!container) {
    return false;
  }

  if (characterId === null || characterId === undefined) {
    return true;
  }

  return container.type === "chest"
    ? container.isRevealed && container.visibleTo.includes(characterId)
    : container.ownerCharacterId === characterId;
}
