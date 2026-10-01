import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import { updateCharacterFeature } from "./features.js";

const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";
const FEATURE = "6f1c3d2e-0000-4000-8000-0000000000fe";

describe("updateCharacterFeature", () => {
  const LUCKY = { name: "Lucky", description: "Three rerolls a day." };

  it("rewrites the name and the words and never whose it is", async () => {
    const query = stubQuery({ data: { id: FEATURE }, error: null });
    await updateCharacterFeature(query, {
      id: FEATURE,
      characterId: CHARACTER,
      feature: LUCKY,
    });

    assert.deepEqual(query.lastUpdate, LUCKY);
    assert.deepEqual(query.filters, [
      ["id", FEATURE],
      ["character_id", CHARACTER],
    ]);
  });

  it("reads an RLS refusal on the update as a miss", async () => {
    const { data, error } = await updateCharacterFeature(
      stubQuery({ data: null, error: null }),
      { id: FEATURE, characterId: CHARACTER, feature: LUCKY },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });

  it("names a row the bounds refused", async () => {
    const { error } = await updateCharacterFeature(
      stubQuery(postgrestError("23514")),
      { id: FEATURE, characterId: CHARACTER, feature: LUCKY },
    );

    assert.equal(error.reason, "invalid_value");
  });
});
