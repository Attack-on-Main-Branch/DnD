/**
 * A feature: something a character can do that no column on `characters`
 * describes. Darkvision, War Caster, a boon from whoever runs the table.
 *
 * TWO FIELDS AND NOTHING ELSE, deliberately. A feat in 5e has prerequisites, a
 * source, a level it arrives at and sometimes a choice inside it — and none of
 * that is a thing this app could enforce, so pretending to model it would be a
 * form asking questions nobody can answer. A name and what it does is what a
 * table actually reads out.
 *
 * Every bound is mirrored by a CHECK in 20260913090000. Changing one means
 * changing both, and `char_length` there counts code points, which is what
 * `countCharacters` counts too.
 */

import { countCharacters } from "./text.js";

export const MAX_FEATURE_NAME_LENGTH = 80;

/** A note's own bound: a feature is read out at a table, not published. */
export const MAX_FEATURE_DESCRIPTION_LENGTH = 1000;

/** Mirrors the `character_features_enforce_limit` trigger. */
export const MAX_CHARACTER_FEATURES = 40;

function text(value, limit) {
  const trimmed = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return trimmed && countCharacters(trimmed) <= limit ? trimmed : null;
}

/**
 * A description keeps its line breaks — it is prose, and a feat written as
 * three bullets is three bullets. Trimmed at the ends and bounded, nothing
 * more.
 */
function prose(value, limit) {
  const trimmed = String(value ?? "").trim();

  return trimmed && countCharacters(trimmed) <= limit ? trimmed : null;
}

/**
 * One feature as it will be written. `{ values }` or `{ errors }`, the shape
 * `validateContainer` and `validateItem` both use.
 */
export function validateFeature({ name, description }) {
  const errors = {};
  const cleanName = text(name, MAX_FEATURE_NAME_LENGTH);
  const cleanDescription = prose(description, MAX_FEATURE_DESCRIPTION_LENGTH);

  if (!cleanName) {
    errors.name = `A feature needs a name of 1 to ${MAX_FEATURE_NAME_LENGTH} characters.`;
  }

  if (!cleanDescription) {
    errors.description = `A feature needs a description of 1 to ${MAX_FEATURE_DESCRIPTION_LENGTH} characters.`;
  }

  return Object.keys(errors).length > 0
    ? { values: null, errors }
    : {
        values: { name: cleanName, description: cleanDescription },
        errors: null,
      };
}

/**
 * One row, reduced to what a card draws — or null for anything that does not
 * hold together. The checks stand for a database a migration behind the app,
 * the way `readContainer` does.
 */
export function readFeature(row) {
  const id = row?.id;
  const name = text(row?.name, MAX_FEATURE_NAME_LENGTH);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    characterId: row.character_id ?? null,
    name,
    description: prose(row.description, MAX_FEATURE_DESCRIPTION_LENGTH) ?? "",
    createdAt: row.created_at ?? null,
  };
}

/** The whole list, with anything unreadable left out. */
export function readFeatures(rows) {
  return (rows ?? []).map(readFeature).filter(Boolean);
}
