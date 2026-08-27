import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_FEATURE_DESCRIPTION_LENGTH,
  MAX_FEATURE_NAME_LENGTH,
  readFeature,
  readFeatures,
  validateFeature,
} from "./features.js";

const GOOD = { name: "Darkvision", description: "See 60 feet in dim light." };

describe("validateFeature", () => {
  it("takes a name and a description", () => {
    const { values, errors } = validateFeature(GOOD);

    assert.equal(errors, null);
    assert.deepEqual(values, GOOD);
  });

  it("collapses the whitespace in a name and keeps it in a description", () => {
    const { values } = validateFeature({
      name: "  War   Caster  ",
      description: "  One.\n\nTwo.  ",
    });

    assert.equal(values.name, "War Caster");
    assert.equal(values.description, "One.\n\nTwo.");
  });

  it("refuses an empty half", () => {
    for (const missing of ["name", "description"]) {
      const { values, errors } = validateFeature({ ...GOOD, [missing]: "   " });

      assert.equal(values, null);
      assert.ok(errors[missing]);
    }
  });

  it("refuses either half past its bound", () => {
    assert.ok(
      validateFeature({
        ...GOOD,
        name: "x".repeat(MAX_FEATURE_NAME_LENGTH + 1),
      }).errors.name,
    );

    assert.ok(
      validateFeature({
        ...GOOD,
        description: "x".repeat(MAX_FEATURE_DESCRIPTION_LENGTH + 1),
      }).errors.description,
    );
  });

  it("counts code points, the way the CHECK does", () => {
    // Sixteen emoji are sixteen characters here and thirty-two in UTF-16.
    const emoji = "🗡".repeat(MAX_FEATURE_NAME_LENGTH);

    assert.equal(validateFeature({ ...GOOD, name: emoji }).errors, null);
    assert.ok(validateFeature({ ...GOOD, name: emoji + "🗡" }).errors.name);
  });
});

describe("readFeature", () => {
  it("reads a row", () => {
    const read = readFeature({
      id: "f-1",
      character_id: "c-1",
      name: "Lucky",
      description: "Three rerolls.",
      created_at: "2026-09-13T09:00:00Z",
    });

    assert.equal(read.id, "f-1");
    assert.equal(read.characterId, "c-1");
    assert.equal(read.name, "Lucky");
    assert.equal(read.description, "Three rerolls.");
  });

  it("is null for a row with no id or no name", () => {
    assert.equal(readFeature({ name: "Lucky" }), null);
    assert.equal(readFeature({ id: "f-1", name: "   " }), null);
    assert.equal(readFeature(null), null);
  });

  it("answers an empty description rather than nothing at all", () => {
    assert.equal(readFeature({ id: "f-1", name: "Lucky" }).description, "");
  });
});

describe("readFeatures", () => {
  it("leaves out what does not hold together", () => {
    const read = readFeatures([
      { id: "f-1", name: "Lucky", description: "x" },
      { name: "Nameless row" },
      null,
    ]);

    assert.equal(read.length, 1);
    assert.equal(read[0].name, "Lucky");
  });

  it("answers an empty list for nothing at all", () => {
    assert.deepEqual(readFeatures(null), []);
  });
});
