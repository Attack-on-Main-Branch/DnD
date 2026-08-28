import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_RING_COLOR,
  MAX_CAMPAIGN_TOKENS,
  MAX_TOKEN_IMAGE_BYTES,
  MAX_TOKEN_NAME_LENGTH,
  nextRingColor,
  readPlacedToken,
  readPlacedTokens,
  ringColorAt,
  TOKEN_RING_COLORS,
  tokenImageObjectPath,
  tokenImagePathFromUrl,
  validateTokenTemplate,
} from "./tokens.js";

const MAP = "6f1c3d2e-0000-4000-8000-00000000ma91";
const TOKEN = "6f1c3d2e-0000-4000-8000-0000000000t1";
const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000ch4";
const TEMPLATE = "6f1c3d2e-0000-4000-8000-0000000007e3";

/** What a Server Action is handed: a File that crossed a realm boundary. */
function picture({ type = "image/webp", size = 4096 } = {}) {
  return {
    name: "goblin.webp",
    type,
    size,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
  };
}

function row(over = {}) {
  return {
    id: TOKEN,
    map_id: MAP,
    character_id: null,
    template_id: TEMPLATE,
    is_party_marker: false,
    hex_q: 2,
    hex_r: -3,
    world_x: 0.25,
    world_y: 0.5,
    ring_color: "#3b82f6",
    is_hidden: false,
    is_dead: false,
    conditions: [],
    ...over,
  };
}

describe("the palette", () => {
  it("holds eight colours, none of them twice", () => {
    assert.equal(TOKEN_RING_COLORS.length, 8);
    assert.equal(new Set(TOKEN_RING_COLORS).size, 8);
  });

  it("spells every colour the way the CHECK constraint reads it", () => {
    for (const color of TOKEN_RING_COLORS) {
      assert.match(color, /^#[0-9a-f]{6}$/);
    }
  });

  it("reads round rather than running off the end", () => {
    assert.equal(ringColorAt(0), TOKEN_RING_COLORS[0]);
    assert.equal(ringColorAt(8), TOKEN_RING_COLORS[0]);
    assert.equal(ringColorAt(9), TOKEN_RING_COLORS[1]);
  });

  it("falls back rather than trusting a number it was not given", () => {
    assert.equal(ringColorAt(-1), DEFAULT_RING_COLOR);
    assert.equal(ringColorAt(null), DEFAULT_RING_COLOR);
    assert.equal(ringColorAt("second"), DEFAULT_RING_COLOR);
  });

  it("deals the next copy the first colour nobody is wearing", () => {
    assert.equal(nextRingColor([]), TOKEN_RING_COLORS[0]);
    assert.equal(nextRingColor([TOKEN_RING_COLORS[0]]), TOKEN_RING_COLORS[1]);
  });

  it("fills a gap rather than counting — a killed goblin frees its colour", () => {
    const taken = [TOKEN_RING_COLORS[0], TOKEN_RING_COLORS[2]];

    assert.equal(nextRingColor(taken), TOKEN_RING_COLORS[1]);
  });

  it("goes round once every colour is spoken for", () => {
    assert.equal(nextRingColor(TOKEN_RING_COLORS), TOKEN_RING_COLORS[0]);
  });
});

describe("validateTokenTemplate", () => {
  it("takes a name and a picture", () => {
    const { values, errors } = validateTokenTemplate({
      name: "  Goblin  ",
      image: picture(),
    });

    assert.equal(errors, null);
    assert.deepEqual(values, { name: "Goblin" });
  });

  it("refuses a piece with no name", () => {
    const { errors } = validateTokenTemplate({ name: "   ", image: picture() });

    assert.ok(errors.name);
  });

  it("counts code points, as the CHECK constraint's char_length does", () => {
    const { errors } = validateTokenTemplate({
      name: "🐉".repeat(MAX_TOKEN_NAME_LENGTH),
      image: picture(),
    });

    assert.equal(errors, null);
  });

  it("refuses a name past the column's own bound", () => {
    const { errors } = validateTokenTemplate({
      name: "a".repeat(MAX_TOKEN_NAME_LENGTH + 1),
      image: picture(),
    });

    assert.ok(errors.name);
  });

  it("refuses a piece with no picture — the board has one blank disc already", () => {
    const { errors } = validateTokenTemplate({ name: "Goblin", image: null });

    assert.ok(errors.image);
  });

  it("refuses a file that is not a picture we can use", () => {
    const { errors } = validateTokenTemplate({
      name: "Goblin",
      image: picture({ type: "application/pdf" }),
    });

    assert.ok(errors.image);
  });

  it("refuses one over the byte ceiling", () => {
    const { errors } = validateTokenTemplate({
      name: "Goblin",
      image: picture({ size: MAX_TOKEN_IMAGE_BYTES + 1 }),
    });

    assert.ok(errors.image);
  });
});

describe("the picture's path", () => {
  it("puts the uid first, which is what the storage policy compares", () => {
    assert.equal(
      tokenImageObjectPath({
        userId: "user-1",
        campaignId: "camp-1",
        templateId: "piece-1",
        type: "image/webp",
      }),
      "user-1/camp-1-token-piece-1.webp",
    );
  });

  it("recovers the path from a public URL, so a struck piece takes it too", () => {
    assert.equal(
      tokenImagePathFromUrl(
        "https://x.supabase.co/storage/v1/object/public/campaign-maps/user-1/camp-1-token-piece-1.webp",
      ),
      "user-1/camp-1-token-piece-1.webp",
    );
  });

  it("does not recognise a URL from somewhere else", () => {
    assert.equal(tokenImagePathFromUrl("https://example.com/goblin.png"), null);
  });
});

describe("readPlacedToken", () => {
  it("reads a row into the shape the board draws from", () => {
    assert.deepEqual(readPlacedToken(row()), {
      id: TOKEN,
      mapId: MAP,
      characterId: null,
      templateId: TEMPLATE,
      isPartyMarker: false,
      x: 0.25,
      y: 0.5,
      q: 2,
      r: -3,
      ringColor: "#3b82f6",
      initiative: null,
      placedAt: null,
      isHidden: false,
      isDead: false,
      conditions: [],
    });
  });

  it("carries what it rolled and when it was put down", () => {
    const token = readPlacedToken(
      row({ initiative: 17, placed_at: "2026-09-26T09:00:00.000Z" }),
    );

    assert.equal(token.initiative, 17);
    assert.equal(token.placedAt, "2026-09-26T09:00:00.000Z");
  });

  it("reads a number outside the bounds as not having rolled", () => {
    assert.equal(readPlacedToken(row({ initiative: 500 })).initiative, null);
    assert.equal(readPlacedToken(row({ initiative: 4.5 })).initiative, null);
  });

  it("reads a message off the wire, which names its fields the other way", () => {
    const token = readPlacedToken({
      id: TOKEN,
      mapId: MAP,
      characterId: CHARACTER,
      x: 0.1,
      y: 0.2,
      q: 0,
      r: 0,
      ringColor: "#10b981",
    });

    assert.equal(token.characterId, CHARACTER);
    assert.equal(token.x, 0.1);
    assert.equal(token.ringColor, "#10b981");
  });

  it("refuses a piece wearing two faces", () => {
    assert.equal(readPlacedToken(row({ character_id: CHARACTER })), null);
  });

  it("refuses a piece wearing none", () => {
    assert.equal(readPlacedToken(row({ template_id: null })), null);
  });

  it("refuses a piece with no map to stand on", () => {
    assert.equal(readPlacedToken(row({ map_id: null })), null);
  });

  it("refuses a missing coordinate rather than reading it as the corner", () => {
    assert.equal(readPlacedToken(row({ world_x: null })), null);
    assert.equal(readPlacedToken(row({ world_y: "" })), null);
  });

  it("clamps a point that arrived outside the picture", () => {
    const token = readPlacedToken(row({ world_x: 1.4, world_y: -0.2 }));

    assert.equal(token.x, 1);
    assert.equal(token.y, 0);
  });

  it("takes the default for a colour outside the palette", () => {
    assert.equal(
      readPlacedToken(row({ ring_color: "#123456" })).ringColor,
      DEFAULT_RING_COLOR,
    );
  });

  it("has no cell where the board has no grid", () => {
    const token = readPlacedToken(row({ hex_q: null, hex_r: null }));

    assert.equal(token.q, null);
    assert.equal(token.r, null);
  });

  it("drops a condition the rulebook has never heard of", () => {
    const token = readPlacedToken(
      row({ conditions: ["poisoned", "bewildered", "prone"] }),
    );

    assert.deepEqual(token.conditions, ["poisoned", "prone"]);
  });

  it("leaves a malformed row out of the list rather than drawing it", () => {
    const drawn = readPlacedTokens([row(), { id: TOKEN }, null]);

    assert.equal(drawn.length, 1);
  });

  it("reads nothing out of nothing", () => {
    assert.deepEqual(readPlacedTokens(undefined), []);
  });
});

describe("the limit", () => {
  it("is five, as the trigger in 20260922090000 raises at", () => {
    assert.equal(MAX_CAMPAIGN_TOKENS, 5);
  });
});
