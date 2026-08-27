/**
 * The fifteen conditions 5e names, and the colour each one wears here.
 *
 * A STATIC DICTIONARY AND NOT A TABLE. Every one of these is in the rulebook and
 * none of them is a thing a campaign invents, so there is nothing to store but
 * WHICH of them a character is under — which is a `text[]` on `characters` and
 * nothing more.
 *
 * THE COLOURS ARE NOT HERE. They were, and every one of them rendered as plain
 * ink: Tailwind scans the package its stylesheet lives in, so a class named in
 * this workspace is a class that never reaches the CSS. Maria's
 * condition-presentation.js holds them now and throws at load if this list
 * grows a key it has no palette for — the seam character-presentation.js keeps
 * for avatar colours, for the same reason.
 *
 * Its own module for the reason health.js and death.js are: the party card and
 * the session drawer both render this in the browser, and `rules/character.js`
 * would bring four hundred lines of catalogue with it.
 *
 * `CONDITION_KEYS` mirrors the CHECK in 20260914090000. Changing one means
 * changing both.
 */

export const CONDITIONS = {
  blinded: { name: "Blinded" },
  charmed: { name: "Charmed" },
  deafened: { name: "Deafened" },
  frightened: { name: "Frightened" },
  grappled: { name: "Grappled" },
  incapacitated: { name: "Incapacitated" },
  invisible: { name: "Invisible" },
  paralyzed: { name: "Paralyzed" },
  petrified: { name: "Petrified" },
  poisoned: { name: "Poisoned" },
  prone: { name: "Prone" },
  restrained: { name: "Restrained" },
  stunned: { name: "Stunned" },
  unconscious: { name: "Unconscious" },
  exhaustion: { name: "Exhaustion" },
};

/** In the order the grid prints them, which is the rulebook's own: alphabetical
    but for exhaustion, which 5e lists last because it is the one with levels. */
export const CONDITION_KEYS = Object.keys(CONDITIONS);

/**
 * The whole table in place of one character. A sentinel rather than a null,
 * because null is what a caller passes by accident and this has to be said on
 * purpose — `toggle_party_condition` is a different function with a different
 * permission behind it.
 */
export const ALL_PARTY = "ALL_PARTY";

export function isCondition(key) {
  return Object.hasOwn(CONDITIONS, key);
}

export function conditionDetails(key) {
  return CONDITIONS[key] ?? null;
}

/** The name a sentence uses. The key itself for one this catalogue has lost. */
export function conditionName(key) {
  return CONDITIONS[key]?.name ?? String(key ?? "");
}

/**
 * The column as a card reads it: known keys, deduplicated, in the catalogue's
 * own order rather than the array's.
 *
 * ORDERED HERE AND NOT IN SQL, deliberately. The order a condition was applied
 * in says nothing — what a table reads is a row of badges, and a row that
 * reshuffles itself every time one is added is one nobody can scan.
 */
export function readConditions(value) {
  const held = new Set(Array.isArray(value) ? value : []);

  return CONDITION_KEYS.filter((key) => held.has(key));
}

/** Where a toggle leaves the list, and which way it went. */
export function toggledConditions(held, key) {
  if (!isCondition(key)) {
    return null;
  }

  const standing = readConditions(held);
  const applied = !standing.includes(key);

  return {
    applied,
    conditions: applied
      ? readConditions([...standing, key])
      : standing.filter((one) => one !== key),
  };
}
