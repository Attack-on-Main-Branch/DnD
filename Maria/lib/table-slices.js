/**
 * What a chair at the table can ask to have read back, and how the asking is
 * written into the URL of api/campaigns/[id]/table — one place, so the browser
 * that builds the question and the route that parses it cannot drift apart.
 */
export const TABLE_SLICES = [
  "activity",
  "combat",
  "containers",
  "features",
  "inventory",
  "maps",
  "party",
  "purses",
  "sheets",
  "spells",
  "tokens",
];

/** Six to a party. A bandwidth measure, never a permission. */
const MOST_CHARACTERS = 12;

export function asksAnything(want) {
  return (
    Boolean(want?.seatCharacterId) ||
    TABLE_SLICES.some((slice) => want?.[slice])
  );
}

export function tableSliceQuery(want = {}) {
  const query = new URLSearchParams();
  const asked = TABLE_SLICES.filter((slice) => want[slice]);
  const ids = (want.characterIds ?? []).filter(Boolean);

  if (asked.length > 0) {
    query.set("want", asked.join(","));
  }

  if (ids.length > 0) {
    query.set("characters", ids.join(","));
  }

  if (want.seatCharacterId) {
    query.set("seat", want.seatCharacterId);
  }

  return query.toString();
}

export function readTableSliceQuery(params) {
  const asked = new Set((params.get("want") ?? "").split(","));
  const want = {};

  for (const slice of TABLE_SLICES) {
    if (asked.has(slice)) {
      want[slice] = true;
    }
  }

  want.characterIds = (params.get("characters") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, MOST_CHARACTERS);
  want.seatCharacterId = params.get("seat") || null;

  return want;
}

/** Two questions asked as one: every slice either wanted, for everybody named. */
export function mergeWants(held, asked = {}) {
  const merged = { ...held };

  for (const slice of TABLE_SLICES) {
    if (asked[slice]) {
      merged[slice] = true;
    }
  }

  merged.characterIds = [
    ...new Set([...(held?.characterIds ?? []), ...(asked.characterIds ?? [])]),
  ];
  merged.seatCharacterId =
    asked.seatCharacterId ?? held?.seatCharacterId ?? null;

  return merged;
}
