import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBytes,
  mapPathFromUrl,
  MAX_LORE_LENGTH,
  MAX_MAP_BYTES,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  mapObjectPath,
  MIN_SEARCH_LENGTH,
  parseCharacterQuery,
  parseMarkPoint,
  readCampaignValues,
  validateCampaign,
  campaignMapObjectPath,
  DEFAULT_MAP_NAME,
  MAX_EXTRA_MAPS,
  MAX_MAP_NAME_LENGTH,
  readCampaignMaps,
  uploadedBytes,
  validateCampaignMaps,
  markKey,
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

  describe("what one save carries", () => {
    it("accepts a body at exactly the ceiling", () => {
      assert.equal(
        validateCampaign(validValues({ uploadBytes: MAX_UPLOAD_BYTES })),
        null,
      );
    });

    it("rejects one byte over", () => {
      assert.equal(
        validateCampaign(validValues({ uploadBytes: MAX_UPLOAD_BYTES + 1 }))
          .field,
        "map",
      );
    });

    it("refuses a shelf of pictures that are each small enough", () => {
      // The case the ceiling exists for: nothing here is an oversized map, and
      // together they are a request the framework would refuse unread.
      assert.notEqual(
        validateCampaign(
          validValues({
            map: imageFile({ bytes: MAX_MAP_BYTES }),
            uploadBytes: MAX_MAP_BYTES * 3,
          }),
        ),
        null,
      );
    });

    it("names the oversized picture rather than the heavy save", () => {
      // Both are wrong at once; the specific sentence is the useful one.
      assert.match(
        validateCampaign(
          validValues({
            map: imageFile({ bytes: MAX_MAP_BYTES + 1 }),
            uploadBytes: MAX_UPLOAD_BYTES + 1,
          }),
        ).message,
        /once compressed/,
      );
    });
  });
});

describe("uploadedBytes", () => {
  it("weighs every file in the body, not only the world map", () => {
    const data = new FormData();

    data.append("title", "The Sunless Citadel");
    data.append("map", imageFile({ bytes: 300 }));
    data.append("mapFile", imageFile({ bytes: 200 }));
    data.append("mapFile", imageFile({ bytes: 100 }));

    assert.equal(uploadedBytes(data), 600);
  });

  it("ignores the zero-byte file an empty input still submits", () => {
    const data = new FormData();

    data.append("map", new File([], "", { type: "application/octet-stream" }));

    assert.equal(uploadedBytes(data), 0);
  });

  it("reaches validateCampaign through readCampaignValues", () => {
    const data = new FormData();

    data.append("title", "The Sunless Citadel");
    data.append("worldDescription", "");
    data.append("mapFile", imageFile({ bytes: MAX_UPLOAD_BYTES + 1 }));

    assert.equal(validateCampaign(readCampaignValues(data)).field, "map");
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

describe("parseMarkPoint", () => {
  it("keeps a point inside the picture as it was given", () => {
    assert.deepEqual(parseMarkPoint(0.25, 0.75), { x: 0.25, y: 0.75 });
  });

  it("keeps both corners, which are on the map and not off it", () => {
    assert.deepEqual(parseMarkPoint(0, 0), { x: 0, y: 0 });
    assert.deepEqual(parseMarkPoint(1, 1), { x: 1, y: 1 });
  });

  it("clamps a rounding artefact at the edge rather than refusing it", () => {
    assert.deepEqual(parseMarkPoint(1.0000001, -0.0000001), { x: 1, y: 0 });
  });

  it("reads the numbers a form body sends as strings", () => {
    assert.deepEqual(parseMarkPoint("0.5", "0.1"), { x: 0.5, y: 0.1 });
  });

  for (const [x, y, why] of [
    [null, 0.5, "a missing coordinate"],
    [0.5, undefined, "the other one missing"],
    ["left", 0.5, "a word where a number belongs"],
    [Number.NaN, 0.5, "NaN, which no clamp would catch"],
    [Number.POSITIVE_INFINITY, 0.5, "an infinity, which clamping would hide"],
  ]) {
    it(`refuses ${why}`, () => {
      assert.equal(parseMarkPoint(x, y), null);
    });
  }
});

describe("the shelf of maps", () => {
  /** A File the way a parsed multipart body hands one over. */
  function picture({ type = "image/webp", bytes = 64 } = {}) {
    return new File([new Uint8Array(bytes)], "keep.webp", { type });
  }

  function sheet({ kept = [], added = [] } = {}) {
    const data = new FormData();

    // What the zone posts to say it is talking about the shelf at all.
    data.append("mapShelf", "1");

    for (const slot of kept) {
      data.append("mapKept", slot.id);
      data.append("mapKeptName", slot.name);
    }

    for (const slot of added) {
      data.append("mapFile", slot.file);
      data.append("mapFileName", slot.name);
    }

    return data;
  }

  describe("campaignMapObjectPath", () => {
    // The first segment is what the storage policy compares against auth.uid(),
    // so the shape of this string is load-bearing rather than tidy. It is the
    // same bucket, and the same four policies, the world map is admitted by.
    it("puts the object in a folder named after the owner", () => {
      assert.equal(
        campaignMapObjectPath({
          userId: "user-1",
          campaignId: "camp-1",
          mapId: "map-1",
          type: "image/webp",
        }),
        "user-1/camp-1-map-1.webp",
      );
    });

    it("falls back to webp for a type it does not know", () => {
      assert.match(
        campaignMapObjectPath({
          userId: "u",
          campaignId: "c",
          mapId: "m",
          type: "image/avif",
        }),
        /\.webp$/,
      );
    });
  });

  describe("readCampaignMaps", () => {
    it("pairs every name with the slot it was typed into", () => {
      const shelf = readCampaignMaps(
        sheet({
          kept: [
            { id: "a", name: "The Keep" },
            { id: "b", name: "The Crypt" },
          ],
          added: [{ file: picture(), name: "The Docks" }],
        }),
      );

      assert.deepEqual(shelf.kept, [
        { id: "a", name: "The Keep" },
        { id: "b", name: "The Crypt" },
      ]);
      assert.equal(shelf.added.length, 1);
      assert.equal(shelf.added[0].name, "The Docks");
    });

    it("gives a slot left unnamed the column's own default", () => {
      const shelf = readCampaignMaps(
        sheet({ kept: [{ id: "a", name: "   " }] }),
      );

      assert.equal(shelf.kept[0].name, DEFAULT_MAP_NAME);
    });

    // A zone that IS on the sheet and empty means every map was taken off.
    it("reads an emptied zone as an empty shelf", () => {
      assert.deepEqual(readCampaignMaps(sheet()), { kept: [], added: [] });
    });

    /* And a sheet with no zone at all means something else entirely: leave the
       shelf where it is. Without this the two are the same request, and a form
       that never mentioned maps would delete all of them. */
    it("answers null for a sheet that never mentioned the shelf", () => {
      assert.equal(readCampaignMaps(new FormData()), null);
      assert.equal(validateCampaignMaps(null), null);
    });

    it("drops the zero-byte File an empty file input still submits", () => {
      const data = sheet();

      data.append("mapFile", new File([], "", { type: "" }));
      data.append("mapFileName", "Nothing");

      assert.deepEqual(readCampaignMaps(data).added, []);
    });
  });

  describe("validateCampaignMaps", () => {
    it("accepts a shelf inside the limit", () => {
      assert.equal(
        validateCampaignMaps({
          kept: [{ id: "a", name: "The Keep" }],
          added: [{ file: picture(), name: "The Docks" }],
        }),
        null,
      );
    });

    // Counted as it will BE, not as it is being added: a save that keeps ten
    // and adds one is over, and the trigger would refuse it halfway through the
    // upload rather than before it started.
    it("counts what will be on the shelf, not what is arriving", () => {
      const kept = Array.from({ length: MAX_EXTRA_MAPS }, (_, at) => ({
        id: `map-${at}`,
        name: "Kept",
      }));

      assert.equal(validateCampaignMaps({ kept }), null);

      const problem = validateCampaignMaps({
        kept,
        added: [{ file: picture(), name: "One too many" }],
      });

      assert.equal(problem.field, "maps");
    });

    it("refuses a name longer than the column takes", () => {
      const problem = validateCampaignMaps({
        kept: [{ id: "a", name: "x".repeat(MAX_MAP_NAME_LENGTH + 1) }],
      });

      assert.equal(problem.field, "maps");
    });

    it("refuses a file that is not one of the four image types", () => {
      const problem = validateCampaignMaps({
        added: [{ file: picture({ type: "application/pdf" }), name: "Bad" }],
      });

      assert.equal(problem.field, "maps");
    });

    it("refuses one over the ceiling, even after the browser re-encoded it", () => {
      const problem = validateCampaignMaps({
        added: [
          { file: picture({ bytes: 5 * 1024 * 1024 }), name: "Enormous" },
        ],
      });

      assert.equal(problem.field, "maps");
    });

    it("answers null for a sheet that named no maps at all", () => {
      assert.equal(validateCampaignMaps(), null);
    });
  });
});

describe("markKey", () => {
  // What the unique index in 20260921090000 says, said the same way in the
  // browser: a seat has a token on every map it has stood on.
  it("tells the same seat on two maps apart", () => {
    assert.notEqual(markKey("map-a", "char-1"), markKey("map-b", "char-1"));
  });

  it("tells two seats on one map apart", () => {
    assert.notEqual(markKey("map-a", "char-1"), markKey("map-a", "char-2"));
  });

  it("is stable for the same pair", () => {
    assert.equal(markKey("map-a", "char-1"), markKey("map-a", "char-1"));
  });

  // The head of the table has no character and a row from before the shelf has
  // no map. Both are values here rather than absences, or the two would collide
  // with every other token that happens to be missing the same half.
  it("gives the empty halves names of their own", () => {
    assert.equal(markKey("map-a", null), markKey("map-a", undefined));
    assert.notEqual(markKey("map-a", null), markKey("map-a", "dm"));
    assert.notEqual(markKey(null, "char-1"), markKey("-", "char-1"));
  });
});
