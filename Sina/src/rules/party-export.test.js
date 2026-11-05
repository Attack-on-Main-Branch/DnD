import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  partyExportFixture,
  EXPORT_CHARACTER,
} from "../party-export-fixture.js";
import { buildPartyExport } from "./party-export.js";

const WHEN = "2026-11-03T12:00:00.000Z";

describe("party JSON export", () => {
  it("exports the character's stored health and calculated combat numbers", () => {
    const result = buildPartyExport(partyExportFixture(), WHEN);
    const character = result.characters[0];
    assert.equal(result.schemaVersion, "1.0.0");
    assert.equal(result.exportedAt, WHEN);
    assert.equal(character.handle, "Fern#0451");
    assert.equal(character.build.class.name, "Wizard");
    assert.deepEqual(character.abilities.int, {
      base: 14,
      total: 16,
      modifier: 3,
    });
    assert.equal(character.proficiencyBonus, 3);
    assert.deepEqual(character.health, {
      currentHp: 12,
      maxHp: 30,
      temporaryHp: 4,
      maxTemporaryHp: 8,
      deathSaves: { successes: 0, failures: 0 },
      dying: false,
      dead: false,
    });
    assert.equal(character.combat.armorClass, 14);
    assert.equal(character.combat.initiativeBonus, 2);
    assert.equal(character.combat.speedFeet, 30);
    assert.equal(character.combat.passivePerception, 14);
    assert.deepEqual(character.savingThrows.int, {
      proficient: true,
      bonus: 6,
    });
    assert.deepEqual(character.savingThrows.dex, {
      proficient: false,
      bonus: 2,
    });
    assert.equal(Object.keys(character.skills).length, 18);
    assert.equal(character.skills.perception.bonus, 5);
    assert.deepEqual(character.proficiencies.weapons, ["Longbow"]);
  });

  it("keeps weapon details, carried-bag locations, spell rules and spell slots", () => {
    const character = buildPartyExport(partyExportFixture(), WHEN)
      .characters[0];
    assert.equal(character.inventory[0].location.name, "Satchel");
    assert.equal(character.inventory[0].facts.damage, "1d8 Piercing");
    assert.equal(character.inventory[0].facts.requiresAttunement, true);
    assert.deepEqual(character.inventory[1].location, { type: "pack" });
    assert.equal(character.inventory[1].inHand, true);
    assert.equal(character.spellcasting.saveDC, 14);
    assert.equal(character.spellcasting.attackBonus, 6);
    assert.deepEqual(
      character.spellcasting.slots.find((slot) => slot.level === 3),
      { level: 3, max: 2, used: 1, remaining: 1 },
    );
    assert.deepEqual(character.spells[0].damageByLevel, { 3: "8d6", 4: "9d6" });
    assert.equal(
      character.spells[0].description,
      "Fire spreads around corners.",
    );
    assert.equal(character.features[0].name, "Battle Focus");
  });

  it("omits excluded state, optional metadata and private fields at every level", () => {
    const exported = JSON.parse(
      JSON.stringify(buildPartyExport(partyExportFixture(), WHEN)),
    );
    function check(value) {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        assert.ok(
          ![
            "conditions",
            "inspiration",
            "hitDice",
            "hit_dice_spent",
            "uses_remaining",
            "coin_gp",
            "currency",
            "documentId",
            "catalogueId",
            "avatar_url",
            "image_url",
            "backstory",
            "personality",
            "user_id",
            "is_prepared",
          ].includes(key),
          key,
        );
        check(child);
      }
    }
    check(exported);
    assert.ok(!JSON.stringify(exported).includes("PRIVATE_"));
  });

  it("only includes records belonging to the party and totals all members", () => {
    const source = partyExportFixture();
    const second = "second-character";
    source.members.push({
      ...source.members[0],
      id: second,
      name: "Ash",
      current_hp: 20,
      max_hp: 40,
      temp_hp: 0,
      temp_hp_max: 0,
    });
    source.sheets.push({
      ...source.sheets[0],
      id: second,
      class_id: "fighter",
      level: 3,
    });
    source.inventory.push({
      ...source.inventory[0],
      id: "foreign",
      character_id: "outsider",
      name: "PRIVATE_FOREIGN_ITEM",
    });
    source.spells.push({
      ...source.spells[0],
      character_id: "outsider",
      name: "PRIVATE_FOREIGN_SPELL",
    });
    source.features.push({
      ...source.features[0],
      character_id: "outsider",
      name: "PRIVATE_FOREIGN_FEATURE",
    });
    const result = buildPartyExport(source, WHEN);
    assert.equal(result.characters.length, 2);
    assert.equal(result.characters[0].id, EXPORT_CHARACTER);
    assert.equal(result.characters[1].spellcasting, null);
    assert.equal(result.summary.partySize, 2);
    assert.deepEqual(result.summary.levels, {
      min: 3,
      max: 5,
      average: 4,
      distribution: { 3: 1, 5: 1 },
    });
    assert.deepEqual(result.summary.health, {
      currentHp: 32,
      maxHp: 70,
      temporaryHp: 4,
      maxTemporaryHp: 8,
    });
    assert.ok(!JSON.stringify(result).includes("PRIVATE_FOREIGN"));
  });

  it("rejects an incomplete sheet instead of silently exporting invented stats", () => {
    const source = partyExportFixture();
    source.sheets = [];
    assert.throws(() => buildPartyExport(source, WHEN), /incomplete_party/);
    const missingHealth = partyExportFixture();
    missingHealth.members[0].current_hp = null;
    assert.throws(
      () => buildPartyExport(missingHealth, WHEN),
      /incomplete_party/,
    );
  });

  it("exports an empty party with explicit empty totals", () => {
    const source = partyExportFixture();
    source.members = [];
    source.sheets = [];
    const result = buildPartyExport(source, WHEN);
    assert.deepEqual(result.characters, []);
    assert.equal(result.summary.partySize, 0);
    assert.equal(result.summary.levels.average, null);
    assert.equal(result.summary.health.maxHp, 0);
  });
});
