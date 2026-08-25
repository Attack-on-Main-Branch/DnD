import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canOpenContainer,
  CONTAINER_TYPES,
  isContainerType,
  MAX_CAMPAIGN_CONTAINERS,
  MAX_CONTAINER_AUDIENCE,
  MAX_CONTAINER_NAME_LENGTH,
  readContainer,
  readContainers,
  validateContainer,
} from "./containers.js";

const FRIEREN = "6f1c3d2e-0000-4000-8000-000000000000";
const FERN = "6f1c3d2e-0000-4000-8000-000000000001";
const STARK = "6f1c3d2e-0000-4000-8000-000000000002";
const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";

const CHEST_ROW = {
  id: "6f1c3d2e-0000-4000-8000-00000000c4e5",
  campaign_id: CAMPAIGN,
  name: "Sunken Iron Chest",
  type: "chest",
  owner_character_id: null,
  is_revealed: true,
  visible_to_character_ids: [FRIEREN],
  created_at: "2026-08-31T09:00:00.000Z",
};

const BAG_ROW = {
  ...CHEST_ROW,
  id: "6f1c3d2e-0000-4000-8000-00000000ba61",
  name: "Bag of Holding",
  type: "bag",
  owner_character_id: FRIEREN,
  is_revealed: false,
  visible_to_character_ids: [],
};

describe("the catalogue", () => {
  it("lists exactly what the migration's CHECK admits", () => {
    assert.deepEqual(CONTAINER_TYPES, ["bag", "chest"]);
  });

  it("holds the bounds the constraints mirror", () => {
    assert.equal(MAX_CONTAINER_NAME_LENGTH, 60);
    assert.equal(MAX_CAMPAIGN_CONTAINERS, 24);
    // The party limit: `reveal_chest` filters against `campaign_members`, so a
    // longer list could never be satisfied.
    assert.equal(MAX_CONTAINER_AUDIENCE, 6);
  });

  it("recognises the two kinds and nothing else", () => {
    assert.ok(isContainerType("bag"));
    assert.ok(isContainerType("chest"));
    assert.ok(!isContainerType("barrel"));
    assert.ok(!isContainerType(undefined));
  });
});

describe("validateContainer", () => {
  it("takes a name and a kind", () => {
    const { values, errors } = validateContainer({
      name: "Bag of Holding",
      type: "bag",
    });

    assert.equal(errors, null);
    assert.deepEqual(values, { name: "Bag of Holding", type: "bag" });
  });

  it("refuses a container with no name", () => {
    const { values, errors } = validateContainer({ name: "   ", type: "bag" });

    assert.equal(values, null);
    assert.match(errors.name, /needs a name/);
  });

  it("refuses a kind the table has never heard of", () => {
    const { errors } = validateContainer({ name: "Barrel", type: "barrel" });

    assert.match(errors.type, /bag or a chest/);
  });

  it("collapses whitespace and truncates to the column", () => {
    const { values } = validateContainer({
      name: `  a   ${"n".repeat(200)}  `,
      type: "chest",
    });

    assert.equal(values.name.length, MAX_CONTAINER_NAME_LENGTH);
    assert.ok(values.name.startsWith("a n"));
  });

  it("keeps no owner and no audience, which the table decides", () => {
    const { values } = validateContainer({
      name: "Chest",
      type: "chest",
      ownerCharacterId: FRIEREN,
      visibleTo: [FRIEREN, FERN],
    });

    assert.deepEqual(Object.keys(values).sort(), ["name", "type"]);
  });
});

describe("readContainer", () => {
  it("reads a chest into the shape a drawer draws", () => {
    assert.deepEqual(readContainer(CHEST_ROW), {
      id: CHEST_ROW.id,
      name: "Sunken Iron Chest",
      type: "chest",
      campaignId: CAMPAIGN,
      ownerCharacterId: null,
      isRevealed: true,
      visibleTo: [FRIEREN],
      createdAt: CHEST_ROW.created_at,
    });
  });

  it("reads a bag, whose audience is never anything", () => {
    const bag = readContainer(BAG_ROW);

    assert.equal(bag.ownerCharacterId, FRIEREN);
    assert.deepEqual(bag.visibleTo, []);
    assert.equal(bag.isRevealed, false);
  });

  it("answers a row of the older shape with null rather than half a card", () => {
    assert.equal(readContainer({ ...CHEST_ROW, type: "barrel" }), null);
    assert.equal(readContainer({ ...CHEST_ROW, name: "  " }), null);
    assert.equal(readContainer({ ...CHEST_ROW, id: null }), null);
    assert.equal(readContainer(null), null);
  });

  it("survives an array column that arrived null", () => {
    const chest = readContainer({
      ...CHEST_ROW,
      visible_to_character_ids: null,
    });

    assert.deepEqual(chest.visibleTo, []);
  });

  it("leaves the unreadable out of the shelf rather than failing it", () => {
    assert.equal(readContainers([CHEST_ROW, { id: null }, BAG_ROW]).length, 2);
    assert.deepEqual(readContainers(null), []);
  });
});

describe("canOpenContainer", () => {
  const chest = readContainer(CHEST_ROW);
  const bag = readContainer(BAG_ROW);

  it("shows the head of the table everything at it", () => {
    assert.ok(canOpenContainer(chest, null));
    assert.ok(canOpenContainer(bag, null));
  });

  it("shows a chest only to the characters it was revealed to", () => {
    assert.ok(canOpenContainer(chest, FRIEREN));
    assert.ok(!canOpenContainer(chest, STARK));
  });

  it("keeps a chest shut while it is unrevealed, list or no list", () => {
    const dark = readContainer({ ...CHEST_ROW, is_revealed: false });

    assert.ok(!canOpenContainer(dark, FRIEREN));
  });

  it("shows a bag to whoever is carrying it", () => {
    assert.ok(canOpenContainer(bag, FRIEREN));
    assert.ok(!canOpenContainer(bag, FERN));
  });

  it("shows an unassigned bag to nobody but the head of the table", () => {
    const loose = readContainer({ ...BAG_ROW, owner_character_id: null });

    assert.ok(canOpenContainer(loose, null));
    assert.ok(!canOpenContainer(loose, FRIEREN));
  });
});
