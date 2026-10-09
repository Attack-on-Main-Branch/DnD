import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  clearMemberLook,
  listMemberLooks,
  saveMemberLook,
} from "./member-looks.js";
import {
  lookImageObjectPath,
  validateMemberLook,
} from "../rules/member-looks.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000ch4";

describe("listMemberLooks", () => {
  it("asks for one campaign and never for a user_id", async () => {
    const chain = stubQuery({ data: null, error: null });

    const { data } = await listMemberLooks(chain, CAMPAIGN);

    assert.deepEqual(data, []);
    assert.deepEqual(chain.filters, [["campaign_id", CAMPAIGN]]);
    assert.doesNotMatch(chain.lastSelect, /user_id/);
  });

  it("reads a missing membership as a miss", async () => {
    const { error } = await saveMemberLook(stubQuery(postgrestError("23503")), {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
      description: "Tall",
    });

    assert.equal(error.reason, "not_found");
  });
});

describe("saveMemberLook", () => {
  it("keeps the picture when none is given", async () => {
    const chain = stubQuery({
      data: [{ character_id: CHARACTER }],
      error: null,
    });

    await saveMemberLook(chain, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
      description: "Tall",
    });

    assert.equal("image_url" in chain.lastUpsert.payload, false);
    assert.equal(
      chain.lastUpsert.options.onConflict,
      "campaign_id,character_id",
    );
  });

  it("writes the picture when one is given", async () => {
    const chain = stubQuery({
      data: [{ character_id: CHARACTER }],
      error: null,
    });

    await saveMemberLook(chain, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
      imageUrl: "https://x/look.webp",
      description: null,
    });

    assert.equal(chain.lastUpsert.payload.image_url, "https://x/look.webp");
  });
});

describe("clearMemberLook", () => {
  it("answers the picture it let go of", async () => {
    const chain = stubQuery({
      data: [{ image_url: "https://x/look.webp" }],
      error: null,
    });

    const { data } = await clearMemberLook(chain, {
      campaignId: CAMPAIGN,
      characterId: CHARACTER,
    });

    assert.equal(data.imageUrl, "https://x/look.webp");
    assert.deepEqual(chain.filters, [
      ["campaign_id", CAMPAIGN],
      ["character_id", CHARACTER],
    ]);
  });
});

describe("validateMemberLook", () => {
  const file = (overrides) => ({
    name: "look.webp",
    type: "image/webp",
    size: 1000,
    arrayBuffer: async () => new ArrayBuffer(0),
    ...overrides,
  });

  it("bounds the description and the picture", () => {
    assert.ok(
      validateMemberLook({ description: "x".repeat(301) }).errors.description,
    );
    assert.ok(
      validateMemberLook({ image: file({ type: "text/plain" }) }).errors.image,
    );
    assert.ok(
      validateMemberLook({ image: file({ size: 2 * 1024 * 1024 }) }).errors
        .image,
    );
  });

  it("reads an empty description as none", () => {
    assert.deepEqual(validateMemberLook({ description: "  " }).values, {
      description: null,
      image: null,
    });
  });

  it("puts the owner's uid first", () => {
    assert.equal(
      lookImageObjectPath({
        userId: "u",
        campaignId: "c",
        characterId: "k",
        type: "image/webp",
        stamp: 7,
      }),
      "u/c-look-k-7.webp",
    );
  });
});
