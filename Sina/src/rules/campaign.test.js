import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBytes,
  mapPathFromUrl,
  MAX_LORE_LENGTH,
  MAX_MAP_BYTES,
  MAX_TITLE_LENGTH,
  mapObjectPath,
  MIN_SEARCH_LENGTH,
  parseCharacterQuery,
  readCampaignValues,
  validateCampaign,
} from "./campaign.js";

const DRAGON = "🐉"; // one code point, two UTF-16 units — the whole point below

/** A set of values that must always pass, so each test can spoil exactly one. */
function validValues(overrides = {}) {
  return {
    title: "The Sunless Citadel",
    worldDescription: "",
    map: null,
    ...overrides,
  };
}

function imageFile({ name = "map.webp", type = "image/webp", bytes = 1024 }) {
  return new File([new Uint8Array(bytes)], name, { type });
}

function formData(entries) {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }

  return data;
}

describe("validateCampaign", () => {
  it("accepts a well-formed campaign", () => {
    assert.equal(validateCampaign(validValues()), null);
  });

  it("accepts one with no description and no map", () => {
    assert.equal(
      validateCampaign(validValues({ worldDescription: "", map: null })),
      null,
    );
  });

  describe("the title is counted the way Postgres counts it", () => {
    // char_length() counts code points; `.length` counts UTF-16 units. A title
    // this file accepts must never be one the CHECK constraint then rejects.
    it("rejects a single astral character as too short", () => {
      assert.equal(
        validateCampaign(validValues({ title: DRAGON })).field,
        "title",
      );
    });

    it("accepts two astral characters", () => {
      assert.equal(
        validateCampaign(validValues({ title: DRAGON.repeat(2) })),
        null,
      );
    });

    it("accepts exactly MAX_TITLE_LENGTH astral characters", () => {
      const title = DRAGON.repeat(MAX_TITLE_LENGTH);

      assert.equal(
        title.length,
        MAX_TITLE_LENGTH * 2,
        "precondition: UTF-16 length is double",
      );
      assert.equal(validateCampaign(validValues({ title })), null);
    });

    it("rejects one character past the ceiling", () => {
      assert.equal(
        validateCampaign(
          validValues({ title: "a".repeat(MAX_TITLE_LENGTH + 1) }),
        ).field,
        "title",
      );
    });

    it("rejects a title that is only whitespace", () => {
      // readCampaignValues trims, so this is the shape a hand-built post takes.
      assert.equal(validateCampaign(validValues({ title: "" })).field, "title");
    });
  });

  describe("the description is bounded", () => {
    it("accepts MAX_LORE_LENGTH astral characters", () => {
      const prose = DRAGON.repeat(MAX_LORE_LENGTH);

      assert.equal(prose.length, MAX_LORE_LENGTH * 2);
      assert.equal(
        validateCampaign(validValues({ worldDescription: prose })),
        null,
      );
    });

    it("rejects one code point past the ceiling", () => {
      assert.equal(
        validateCampaign(
          validValues({ worldDescription: "a".repeat(MAX_LORE_LENGTH + 1) }),
        ).field,
        "worldDescription",
      );
    });
  });

  describe("the map", () => {
    for (const type of ["image/webp", "image/png", "image/jpeg", "image/gif"]) {
      it(`accepts ${type}`, () => {
        assert.equal(
          validateCampaign(validValues({ map: imageFile({ type }) })),
          null,
        );
      });
    }

    it("rejects a type that is not an image we serve", () => {
      const problem = validateCampaign(
        validValues({ map: imageFile({ type: "application/pdf" }) }),
      );

      assert.equal(problem.field, "map");
    });

    it("rejects an SVG, which is a script vector as much as an image", () => {
      assert.equal(
        validateCampaign(
          validValues({ map: imageFile({ type: "image/svg+xml" }) }),
        ).field,
        "map",
      );
    });

    it("accepts a map at exactly the size limit", () => {
      assert.equal(
        validateCampaign(
          validValues({ map: imageFile({ bytes: MAX_MAP_BYTES }) }),
        ),
        null,
      );
    });

    it("rejects one byte over", () => {
      assert.equal(
        validateCampaign(
          validValues({ map: imageFile({ bytes: MAX_MAP_BYTES + 1 }) }),
        ).field,
        "map",
      );
    });
  });
});

describe("readCampaignValues", () => {
  it("trims the title and normalises the description's line breaks", () => {
    // A textarea's submission value uses CRLF where its API value used LF, so
    // every Enter was costing a character against the limit.
    const values = readCampaignValues(
      formData({
        title: "  The Sunless Citadel  ",
        worldDescription: "one\r\ntwo",
      }),
    );

    assert.equal(values.title, "The Sunless Citadel");
    assert.equal(values.worldDescription, "one\ntwo");
  });

  it("returns empty strings rather than null for absent fields", () => {
    const values = readCampaignValues(formData({}));

    assert.equal(values.title, "");
    assert.equal(values.worldDescription, "");
  });

  describe("an empty file input is not a map", () => {
    // A file input that was never used still submits an entry: a File with an
    // empty name and no bytes. Treated as a map, that puts a 0-byte object in
    // the bucket and a URL to nothing in the row.
    it("ignores the zero-byte placeholder a browser sends", () => {
      const data = new FormData();
      data.append("title", "Untouched");
      data.append(
        "map",
        new File([], "", { type: "application/octet-stream" }),
      );

      assert.equal(readCampaignValues(data).map, null);
    });

    it("ignores a named file with no bytes in it", () => {
      const data = new FormData();
      data.append("map", imageFile({ bytes: 0 }));

      assert.equal(readCampaignValues(data).map, null);
    });

    it("keeps a real one", () => {
      const data = new FormData();
      data.append("map", imageFile({ bytes: 32 }));

      assert.equal(readCampaignValues(data).map?.size, 32);
    });
  });
});

describe("mapObjectPath", () => {
  // The first segment is what the storage policy compares against auth.uid(),
  // so the shape of this string is load-bearing rather than tidy.
  it("puts the object in a folder named after the owner", () => {
    assert.equal(
      mapObjectPath({
        userId: "user-1",
        campaignId: "camp-1",
        type: "image/webp",
      }),
      "user-1/camp-1.webp",
    );
  });

  for (const [type, extension] of [
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/gif", "gif"],
    ["image/webp", "webp"],
  ]) {
    it(`gives ${type} the extension .${extension}`, () => {
      assert.match(
        mapObjectPath({ userId: "u", campaignId: "c", type }),
        new RegExp(`\\.${extension}$`),
      );
    });
  }

  it("falls back to webp for a type it does not know", () => {
    assert.match(
      mapObjectPath({ userId: "u", campaignId: "c", type: "image/avif" }),
      /\.webp$/,
    );
  });
});

describe("mapPathFromUrl", () => {
  // This value names an object for deletion, so it is worth being sure it can
  // only ever name one inside the bucket.
  const base =
    "https://project.supabase.co/storage/v1/object/public/campaign-maps/";

  it("recovers the path a public URL was built from", () => {
    assert.equal(
      mapPathFromUrl(`${base}user-1/camp-1.webp`),
      "user-1/camp-1.webp",
    );
  });

  it("decodes an escaped segment", () => {
    assert.equal(
      mapPathFromUrl(`${base}user-1/a%20map.webp`),
      "user-1/a map.webp",
    );
  });

  it("refuses anything that is not one of our URLs", () => {
    assert.equal(mapPathFromUrl("https://elsewhere.example/x.webp"), null);
    assert.equal(mapPathFromUrl(""), null);
    assert.equal(mapPathFromUrl(null), null);
    assert.equal(mapPathFromUrl(undefined), null);
  });

  it("refuses a path that tries to climb out of the bucket", () => {
    assert.equal(mapPathFromUrl(`${base}../other-bucket/secret.webp`), null);
    assert.equal(mapPathFromUrl(`${base}user-1/../../x.webp`), null);
  });

  it("refuses an empty path", () => {
    assert.equal(mapPathFromUrl(base), null);
  });
});

describe("formatBytes", () => {
  it("reads as a person would write it", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2 KB");
    assert.equal(formatBytes(4 * 1024 * 1024), "4 MB");
    assert.equal(formatBytes(1.5 * 1024 * 1024), "1.5 MB");
  });
});

describe("parseCharacterQuery", () => {
  // Whatever this lets through becomes a prefix query against every character
  // in the database, so the floor and the shapes both matter.
  describe("a name fragment", () => {
    it("takes the beginning of a name", () => {
      assert.deepEqual(parseCharacterQuery("fri"), {
        namePrefix: "fri",
        discriminatorPrefix: null,
      });
    });

    it("keeps spaces inside it", () => {
      assert.deepEqual(parseCharacterQuery("Natsuki Sub"), {
        namePrefix: "Natsuki Sub",
        discriminatorPrefix: null,
      });
    });

    it("keeps the case as typed, so a message can quote it back", () => {
      assert.equal(parseCharacterQuery("FRI").namePrefix, "FRI");
    });

    it(`refuses fewer than ${MIN_SEARCH_LENGTH} characters`, () => {
      assert.equal(parseCharacterQuery("f"), null);
    });

    it("counts code points, so one astral character is still one", () => {
      assert.equal(parseCharacterQuery("🐉"), null);
    });
  });

  describe("a tag", () => {
    it("reads bare digits as the tag, not as a name", () => {
      assert.deepEqual(parseCharacterQuery("1000"), {
        namePrefix: null,
        discriminatorPrefix: "1000",
      });
    });

    it("takes a leading hash off", () => {
      assert.deepEqual(parseCharacterQuery("#1000"), {
        namePrefix: null,
        discriminatorPrefix: "1000",
      });
    });

    it("allows a partial tag, which is below the name floor", () => {
      // Two digits is a narrow enough search on a four-digit field, where two
      // letters of a name is not.
      assert.deepEqual(parseCharacterQuery("10"), {
        namePrefix: null,
        discriminatorPrefix: "10",
      });
    });
  });

  describe("both halves", () => {
    it("splits a whole handle", () => {
      assert.deepEqual(parseCharacterQuery("Frieren#1000"), {
        namePrefix: "Frieren",
        discriminatorPrefix: "1000",
      });
    });

    it("allows either half to be partial", () => {
      assert.deepEqual(parseCharacterQuery("fri#10"), {
        namePrefix: "fri",
        discriminatorPrefix: "10",
      });
    });

    it("forgives whitespace around the hash, which chat clients add", () => {
      assert.deepEqual(parseCharacterQuery("  Frieren # 1000  "), {
        namePrefix: "Frieren",
        discriminatorPrefix: "1000",
      });
    });

    it("still applies the name floor to the name half", () => {
      assert.equal(parseCharacterQuery("f#1000"), null);
    });
  });

  describe("refuses anything that is not a query", () => {
    for (const bad of ["", "   ", "#", " # ", "f", null, undefined]) {
      it(JSON.stringify(bad), () => {
        assert.equal(parseCharacterQuery(bad), null);
      });
    }
  });

  it("passes LIKE metacharacters through for the database to escape", () => {
    // Not stripped here on purpose: the SQL function escapes them, and a name
    // may legitimately contain one. What matters is that `%` alone is still
    // too short to be a query.
    assert.equal(parseCharacterQuery("%"), null);
    assert.equal(parseCharacterQuery("a%").namePrefix, "a%");
  });
});
