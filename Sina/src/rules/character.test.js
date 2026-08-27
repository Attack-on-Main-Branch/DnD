import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ABILITIES,
  ABILITY_BASELINE,
  ABILITY_BUDGET,
  abilityBreakdown,
  abilityLowerRefund,
  abilityModifier,
  abilityPointsRemaining,
  abilityRaiseCost,
  abilitySpend,
  ALIGNMENTS,
  alignmentLabel,
  archetypeDetails,
  avatarObjectPath,
  avatarPathFromUrl,
  canLowerAbility,
  canRaiseAbility,
  abilityScoresOf,
  characterHandle,
  healthFraction,
  healthTier,
  HEALTH_TIERS,
  MAX_HP,
  classDetails,
  classLabel,
  defaultAbilityScores,
  defaultSkills,
  DICE_COLOR_VALUES,
  formatModifier,
  isDiceColor,
  MAX_AVATAR_BYTES,
  MAX_ABILITY,
  MAX_NAME_LENGTH,
  MAX_PROSE_LENGTH,
  MIN_ABILITY,
  RACE_ABILITY_BONUSES,
  RACES,
  raceAbilityBonus,
  readCharacterValues,
  validateCharacter,
} from "./character.js";

/** A set of values that must always pass, so each test can spoil exactly one. */
function validValues(overrides = {}) {
  return {
    name: "Gandalf",
    discriminator: "0451",
    race: "Human",
    archetype: "warrior",
    classId: "fighter",
    alignment: "lawful_good",
    diceColor: "violet",
    avatar: null,
    abilities: defaultAbilityScores(),
    skills: defaultSkills(),
    backstory: "",
    personality: "",
    ...overrides,
  };
}

const DRAGON = "🐉"; // one code point, two UTF-16 units — the whole point below

describe("validateCharacter", () => {
  it("accepts a well-formed character", () => {
    assert.equal(validateCharacter(validValues()), null);
  });

  it("names the offending field rather than just failing", () => {
    const result = validateCharacter(validValues({ race: "Ent" }));
    assert.equal(result.field, "race");
    assert.match(result.message, /race/i);
  });

  describe("name length is counted the way Postgres counts it", () => {
    // char_length() counts code points; `.length` counts UTF-16 units. A name
    // this file accepts must never be one the CHECK constraint then rejects.
    it("rejects a single astral character as too short", () => {
      const result = validateCharacter(validValues({ name: DRAGON }));
      assert.equal(result.field, "name");
    });

    it("accepts two astral characters", () => {
      assert.equal(
        validateCharacter(validValues({ name: DRAGON.repeat(2) })),
        null,
      );
    });

    it("accepts a name of exactly MAX_NAME_LENGTH astral characters", () => {
      const name = DRAGON.repeat(MAX_NAME_LENGTH);
      assert.equal(
        name.length,
        MAX_NAME_LENGTH * 2,
        "precondition: UTF-16 length is double",
      );
      assert.equal(validateCharacter(validValues({ name })), null);
    });

    it("rejects one character past the ceiling", () => {
      const result = validateCharacter(
        validValues({ name: "a".repeat(MAX_NAME_LENGTH + 1) }),
      );
      assert.equal(result.field, "name");
    });
  });

  describe("prose length is counted the same way", () => {
    // This is the L20 regression: `.length` here halved the real ceiling for
    // anyone writing emoji, in the two fields most likely to contain them.
    for (const field of ["backstory", "personality"]) {
      it(`accepts ${field} of MAX_PROSE_LENGTH astral characters`, () => {
        const prose = DRAGON.repeat(MAX_PROSE_LENGTH);
        assert.equal(prose.length, MAX_PROSE_LENGTH * 2);
        assert.equal(validateCharacter(validValues({ [field]: prose })), null);
      });

      it(`rejects ${field} one code point past the ceiling`, () => {
        const result = validateCharacter(
          validValues({ [field]: "a".repeat(MAX_PROSE_LENGTH + 1) }),
        );
        assert.equal(result.field, field);
      });
    }
  });

  describe("the discriminator is exactly four digits", () => {
    for (const bad of ["45", "04510", "abcd", "045a", "", " 451"]) {
      it(`rejects ${JSON.stringify(bad)}`, () => {
        assert.equal(
          validateCharacter(validValues({ discriminator: bad })).field,
          "discriminator",
        );
      });
    }

    it("accepts a leading-zero tag", () => {
      assert.equal(
        validateCharacter(validValues({ discriminator: "0000" })),
        null,
      );
    });
  });

  describe("the class pair must be internally consistent", () => {
    it("rejects a path that belongs to a different archetype", () => {
      // The check that stops a hand-crafted POST pairing Warrior with Wizard.
      const result = validateCharacter(
        validValues({ archetype: "warrior", classId: "wizard" }),
      );
      assert.equal(result.field, "classId");
    });

    it("rejects an archetype with no path chosen", () => {
      assert.equal(
        validateCharacter(validValues({ classId: "" })).field,
        "classId",
      );
    });

    it("rejects an unknown archetype", () => {
      assert.equal(
        validateCharacter(validValues({ archetype: "bard-king" })).field,
        "archetype",
      );
    });

    it("accepts every real archetype/path pair in the catalogue", () => {
      for (const archetype of archetypeDetails("warrior")
        ? ["warrior", "mage", "archer", "assassin", "priest"]
        : []) {
        for (const path of archetypeDetails(archetype).paths) {
          assert.equal(
            validateCharacter(validValues({ archetype, classId: path.id })),
            null,
            `${archetype}/${path.id} should be valid`,
          );
        }
      }
    });
  });

  it("rejects an alignment outside the catalogue", () => {
    assert.equal(
      validateCharacter(validValues({ alignment: "lawful_smug" })).field,
      "alignment",
    );
  });

  it("rejects a colour outside the palette", () => {
    assert.equal(
      validateCharacter(validValues({ diceColor: "beige" })).field,
      "diceColor",
    );
  });

  it("accepts every race and every colour the catalogue declares", () => {
    for (const race of RACES) {
      assert.equal(
        validateCharacter(validValues({ race })),
        null,
        `${race} should be valid`,
      );
    }
    for (const diceColor of DICE_COLOR_VALUES) {
      assert.equal(
        validateCharacter(validValues({ diceColor })),
        null,
        `${diceColor} should be valid`,
      );
    }
    for (const { value } of ALIGNMENTS) {
      assert.equal(
        validateCharacter(validValues({ alignment: value })),
        null,
        `${value} should be valid`,
      );
    }
  });
});

describe("readCharacterValues", () => {
  function formData(entries) {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.append(key, value);
    return data;
  }

  it("normalises the CRLF a textarea submits back to LF", () => {
    // A textarea's API value uses LF and its submission value uses CRLF, so
    // every Enter made the string one character longer than the counter said.
    const values = readCharacterValues(
      formData({ backstory: "one\r\ntwo\r\nthree" }),
    );
    assert.equal(values.backstory, "one\ntwo\nthree");
  });

  it("normalises a lone CR too, which no browser sends but a crafted post can", () => {
    assert.equal(
      readCharacterValues(formData({ personality: "a\rb" })).personality,
      "a\nb",
    );
  });

  it("trims the name and the prose", () => {
    const values = readCharacterValues(
      formData({ name: "  Gandalf  ", backstory: "  hi  " }),
    );
    assert.equal(values.name, "Gandalf");
    assert.equal(values.backstory, "hi");
  });

  it("returns empty strings rather than null for absent fields", () => {
    const values = readCharacterValues(formData({}));
    assert.equal(values.name, "");
    assert.equal(values.backstory, "");
    assert.equal(values.classId, "");
  });
});

describe("catalogue lookups", () => {
  it("finds a path by its own id without being told the archetype", () => {
    const found = classDetails("warlock");
    assert.equal(found.archetype.id, "mage");
    assert.equal(found.path.name, "Warlock");
  });

  it("returns null rather than throwing for an unknown class", () => {
    assert.equal(classDetails("necromancer"), null);
    assert.equal(classLabel("necromancer"), null);
  });

  it("returns null for the characters made before classes existed", () => {
    assert.equal(classLabel(null), null);
  });

  it("falls back to the raw value for an unknown alignment", () => {
    assert.equal(alignmentLabel("lawful_smug"), "lawful_smug");
  });

  it("path ids are unique across the whole catalogue", () => {
    // classDetails() looks a path up without its archetype, which is only sound
    // while this holds.
    const ids = ["warrior", "mage", "archer", "assassin", "priest"].flatMap(
      (a) => archetypeDetails(a).paths.map((p) => p.id),
    );
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("characterHandle", () => {
  it("joins the name and tag the way a DM will type it", () => {
    assert.equal(
      characterHandle({ name: "Gandalf", discriminator: "0451" }),
      "Gandalf#0451",
    );
  });
});

describe("ability point-buy", () => {
  /** The baseline sheet, with named scores moved off it. */
  function scores(overrides = {}) {
    return { ...defaultAbilityScores(), ...overrides };
  }

  it("starts every score at the baseline, costing nothing", () => {
    assert.equal(abilitySpend(defaultAbilityScores()), 0);
    assert.equal(
      abilityPointsRemaining(defaultAbilityScores()),
      ABILITY_BUDGET,
    );
    assert.equal(defaultAbilityScores().str, ABILITY_BASELINE);
  });

  describe("the published cost table", () => {
    // Spelled out rather than derived, so a change to the curve has to be made
    // here too and cannot arrive disguised as a refactor.
    const CUMULATIVE = {
      7: -3,
      8: -2,
      9: -1,
      10: 0,
      11: 1,
      12: 2,
      13: 3,
      14: 5,
      15: 7,
    };

    for (const [score, cost] of Object.entries(CUMULATIVE)) {
      it(`a single ${score} spends ${cost}`, () => {
        assert.equal(abilitySpend(scores({ str: Number(score) })), cost);
      });
    }

    it("matches the closed form the database CHECK uses", () => {
      // characters_ability_budget_check cannot import this table, so it spells
      // the same curve as (v - 10) + greatest(v - 13, 0). Were the two to part
      // company, a sheet the browser accepted would come back from Postgres as
      // a constraint violation with nothing useful to say. This is where that
      // divergence surfaces instead.
      for (let value = MIN_ABILITY; value <= MAX_ABILITY; value += 1) {
        const closedForm = value - 10 + Math.max(value - 13, 0);

        assert.equal(
          abilitySpend(scores({ str: value })),
          closedForm,
          `the SQL formula disagrees at ${value}`,
        );
      }
    });
  });

  describe("step prices", () => {
    it("charges one point per step up to 13", () => {
      for (let value = MIN_ABILITY; value < 13; value += 1) {
        assert.equal(abilityRaiseCost(value), 1, `at ${value}`);
      }
    });

    it("charges two for each of the last two steps", () => {
      assert.equal(abilityRaiseCost(13), 2);
      assert.equal(abilityRaiseCost(14), 2);
    });

    it("has no price at the ceiling", () => {
      assert.equal(abilityRaiseCost(MAX_ABILITY), null);
    });

    it("refunds exactly what the step up cost", () => {
      for (let value = MIN_ABILITY + 1; value <= MAX_ABILITY; value += 1) {
        assert.equal(
          abilityLowerRefund(value),
          abilityRaiseCost(value - 1),
          `coming back down from ${value}`,
        );
      }
    });

    it("has nothing to refund at the floor", () => {
      assert.equal(abilityLowerRefund(MIN_ABILITY), null);
    });
  });

  describe("what the stepper offers", () => {
    it("will not go below the floor or above the ceiling", () => {
      assert.equal(canLowerAbility(scores({ str: MIN_ABILITY }), "str"), false);
      assert.equal(canRaiseAbility(scores({ str: MAX_ABILITY }), "str"), false);
    });

    it("refuses a step the purse cannot pay for", () => {
      // 13 in five scores is 15 points exactly: nothing left anywhere.
      const spent = scores({ str: 13, dex: 13, con: 13, int: 13, wis: 13 });

      assert.equal(abilityPointsRemaining(spent), 0);
      assert.equal(canRaiseAbility(spent, "cha"), false);
    });

    it("weighs the price of the step, not just the balance", () => {
      const nearlySpent = scores({
        str: 13,
        dex: 13,
        con: 13,
        int: 13,
        wis: 12,
      });

      assert.equal(abilityPointsRemaining(nearlySpent), 1);
      // One point buys the 12 to 13 step...
      assert.equal(canRaiseAbility(nearlySpent, "wis"), true);
      // ...but not the 13 to 14 step, at the same balance.
      assert.equal(canRaiseAbility(nearlySpent, "int"), false);
    });

    it("lets a dumped score pay for a raise elsewhere", () => {
      assert.equal(
        abilityPointsRemaining(scores({ str: MIN_ABILITY })),
        ABILITY_BUDGET + 3,
      );
    });
  });

  describe("racial bonuses", () => {
    it("covers every race the catalogue offers", () => {
      for (const race of RACES) {
        assert.ok(
          RACE_ABILITY_BONUSES[race],
          `${race} has no entry, so it would silently grant nothing`,
        );
      }
    });

    it("names only real abilities", () => {
      const ids = new Set(ABILITIES.map((ability) => ability.id));

      for (const [race, bonuses] of Object.entries(RACE_ABILITY_BONUSES)) {
        for (const id of Object.keys(bonuses)) {
          assert.ok(ids.has(id), `${race} grants an unknown ability "${id}"`);
        }
      }
    });

    it("gives every race three points in total", () => {
      for (const [race, bonuses] of Object.entries(RACE_ABILITY_BONUSES)) {
        const total = Object.values(bonuses).reduce((sum, n) => sum + n, 0);

        assert.equal(total, 3, `${race} is worth ${total}, not 3`);
      }
    });

    it("is zero for an ability a race does not favour, and for no race", () => {
      assert.equal(raceAbilityBonus("Elf", "str"), 0);
      assert.equal(raceAbilityBonus("Nonesuch", "str"), 0);
    });
  });

  describe("modifiers", () => {
    // Including the negative side, where flooring is the step that naive
    // division gets wrong: -1 / 2 truncates towards zero and yields 0.
    const EXPECTED = { 7: -2, 8: -1, 9: -1, 10: 0, 11: 0, 12: 1, 17: 3, 20: 5 };

    for (const [total, modifier] of Object.entries(EXPECTED)) {
      it(`a total of ${total} gives ${modifier}`, () => {
        assert.equal(abilityModifier(Number(total)), modifier);
      });
    }

    it("always writes a sign, zero included", () => {
      assert.equal(formatModifier(3), "+3");
      assert.equal(formatModifier(0), "+0");
      assert.equal(formatModifier(-2), "-2");
    });
  });

  describe("the sheet's breakdown", () => {
    it("adds the race to the bought score", () => {
      const dex = abilityBreakdown("Elf", scores({ dex: 15 })).find(
        (row) => row.id === "dex",
      );

      assert.deepEqual(
        {
          base: dex.base,
          bonus: dex.bonus,
          total: dex.total,
          modifier: dex.modifier,
        },
        { base: 15, bonus: 2, total: 17, modifier: 3 },
      );
    });

    it("keeps printing order and covers all six", () => {
      assert.deepEqual(
        abilityBreakdown("Human", defaultAbilityScores()).map((row) => row.id),
        ABILITIES.map((ability) => ability.id),
      );
    });
  });

  describe("validation", () => {
    it("accepts an untouched sheet", () => {
      assert.equal(validateCharacter(validValues()), null);
    });

    it("accepts a sheet that spends within the budget", () => {
      const spent = scores({ str: 15, dex: 15, con: MIN_ABILITY });

      assert.equal(abilityPointsRemaining(spent), ABILITY_BUDGET - 11);
      assert.equal(validateCharacter(validValues({ abilities: spent })), null);
    });

    it("refuses a sheet that overspends", () => {
      const problem = validateCharacter(
        validValues({ abilities: scores({ str: 15, dex: 15, con: 15 }) }),
      );

      assert.equal(problem?.field, "abilities");
      assert.match(problem.message, /over the 15 available/);
    });

    it("refuses a score outside the bought range", () => {
      for (const value of [MIN_ABILITY - 1, MAX_ABILITY + 1]) {
        const problem = validateCharacter(
          validValues({ abilities: scores({ wis: value }) }),
        );

        assert.equal(problem?.field, "ability_wis", `at ${value}`);
      }
    });

    it("refuses a payload with an ability missing altogether", () => {
      const missing = defaultAbilityScores();
      delete missing.cha;

      assert.equal(
        validateCharacter(validValues({ abilities: missing }))?.field,
        "ability_cha",
      );
    });

    it("refuses a fractional score rather than rounding it", () => {
      assert.equal(
        validateCharacter(validValues({ abilities: scores({ int: 12.5 }) }))
          ?.field,
        "ability_int",
      );
    });
  });

  describe("reading the form", () => {
    function formOf(entries) {
      const data = new FormData();

      for (const [key, value] of Object.entries(entries)) {
        data.set(key, value);
      }

      return data;
    }

    it("parses each score off its own field", () => {
      const { abilities } = readCharacterValues(
        formOf({ ability_str: "15", ability_wis: "7" }),
      );

      assert.equal(abilities.str, 15);
      assert.equal(abilities.wis, 7);
    });

    it("leaves an absent field as NaN so validation can refuse it", () => {
      // Deliberately not defaulted to the baseline: a stripped field would
      // otherwise become a 10 nobody chose and the budget never charged for.
      const values = readCharacterValues(formOf({}));

      assert.ok(Number.isNaN(values.abilities.str));
      assert.equal(
        validateCharacter(validValues({ abilities: values.abilities }))?.field,
        "ability_str",
      );
    });
  });
});

describe("hit points", () => {
  describe("healthFraction", () => {
    it("is the share of the maximum, clamped to the track", () => {
      assert.equal(healthFraction(50, 100), 0.5);
      assert.equal(healthFraction(140, 100), 1);
      assert.equal(healthFraction(-20, 100), 0);
    });

    it("reads a missing or impossible maximum as no health rather than NaN", () => {
      assert.equal(healthFraction(undefined, 100), 0);
      assert.equal(healthFraction(50, 0), 0);
      assert.equal(healthFraction(Number.NaN, 100), 0);
    });

    it("defaults the maximum to MAX_HP, which is now the derived ceiling", () => {
      assert.equal(healthFraction(MAX_HP), 1);
      assert.equal(healthFraction(MAX_HP / 2), 0.5);
    });
  });

  describe("healthTier", () => {
    it("draws both thresholds where the sheet says they are", () => {
      assert.equal(healthTier(51, 100), "healthy");
      assert.equal(healthTier(50, 100), "wounded");
      assert.equal(healthTier(21, 100), "wounded");
      assert.equal(healthTier(20, 100), "critical");
      assert.equal(healthTier(0, 100), "critical");
    });

    it("is a fraction of the maximum, not a count of hit points", () => {
      // 40 of 200 is the same trouble as 20 of 100, and neither is 40 of 100.
      assert.equal(healthTier(40, 200), "critical");
      assert.equal(healthTier(40, 100), "wounded");
    });

    it("only ever answers with a tier the presentation layer knows", () => {
      for (const current of [-5, 0, 20, 21, 50, 51, 100, 500]) {
        assert.ok(HEALTH_TIERS.includes(healthTier(current, 100)));
      }
    });
  });
});

describe("the maximum a character is worth", () => {
  it("is not on the form at all: the row computes it", () => {
    // The box is gone since 20260907090000 — a maximum is the path, the rung
    // and the Constitution, and `characters_sync_max_hp` derives it. Nothing a
    // caller posts can name one.
    const data = new FormData();
    data.set("maxHp", "999");

    assert.equal("maxHp" in readCharacterValues(data), false);
    assert.equal(validateCharacter(validValues()), null);
  });
});

describe("abilityScoresOf", () => {
  it("reads a stored row back into the shape the picker holds", () => {
    const scores = abilityScoresOf({
      ability_str: 15,
      ability_dex: 12,
      ability_con: 11,
      ability_int: 10,
      ability_wis: 9,
      ability_cha: 8,
    });

    assert.deepEqual(scores, {
      str: 15,
      dex: 12,
      con: 11,
      int: 10,
      wis: 9,
      cha: 8,
    });
  });

  it("falls back to the baseline for a row written before the columns", () => {
    assert.deepEqual(abilityScoresOf({}), defaultAbilityScores());
    assert.deepEqual(abilityScoresOf(null), defaultAbilityScores());
  });
});

describe("the skills on the sheet", () => {
  function formData(entries) {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.append(key, value);
    return data;
  }

  it("is optional throughout: a sheet nobody touched still saves", () => {
    const values = readCharacterValues(formData({}));

    assert.deepEqual(values.skills, {});
    assert.equal(
      validateCharacter(validValues({ skills: values.skills })),
      null,
    );
  });

  it("carries a proficiency and a typed bonus off the form", () => {
    const values = readCharacterValues(
      formData({ skill_stealth: "on", skill_athletics_bonus: "-2" }),
    );

    assert.deepEqual(values.skills, {
      stealth: { proficient: true, custom_bonus: null },
      athletics: { proficient: false, custom_bonus: -2 },
    });
  });

  it("refuses a bonus the database would refuse too", () => {
    const problem = validateCharacter(
      validValues({
        skills: { stealth: { proficient: true, custom_bonus: 99 } },
      }),
    );

    assert.equal(problem.field, "skills");
  });

  it("refuses before it reads the alignment, so one message is the sheet's", () => {
    // Ordered where the section is on the sheet: under the ability scores it
    // is calculated from, above the temperament questions.
    const problem = validateCharacter(
      validValues({
        skills: { juggling: { proficient: true, custom_bonus: null } },
        alignment: "nonsense",
      }),
    );

    assert.equal(problem.field, "skills");
  });
});

describe("the portrait", () => {
  /** A File the way a parsed multipart body hands one over. */
  function portrait({ type = "image/webp", bytes = 64 } = {}) {
    return new File([new Uint8Array(bytes)], "face.webp", { type });
  }

  describe("avatarObjectPath", () => {
    // The first segment is what the storage policy compares against auth.uid(),
    // so the shape of this string is load-bearing rather than tidy. The stamp
    // is what keeps a replacement from being served out of a cache told to hold
    // the old one for a year.
    it("puts the object in a folder named after the owner", () => {
      assert.equal(
        avatarObjectPath({
          userId: "user-1",
          characterId: "char-1",
          type: "image/webp",
          stamp: 1756000000000,
        }),
        "user-1/char-1-1756000000000.webp",
      );
    });

    it("gives a replacement a name of its own", () => {
      const first = avatarObjectPath({
        userId: "u",
        characterId: "c",
        type: "image/webp",
        stamp: 1,
      });
      const second = avatarObjectPath({
        userId: "u",
        characterId: "c",
        type: "image/webp",
        stamp: 2,
      });

      assert.notEqual(first, second);
    });

    it("falls back to webp for a type it does not know", () => {
      assert.match(
        avatarObjectPath({
          userId: "u",
          characterId: "c",
          type: "image/avif",
          stamp: 1,
        }),
        /\.webp$/,
      );
    });
  });

  describe("avatarPathFromUrl", () => {
    // This value names an object for deletion, so it is worth being sure it can
    // only ever name one inside the bucket.
    const base =
      "https://project.supabase.co/storage/v1/object/public/character-avatars/";

    it("recovers the path a public URL was built from", () => {
      assert.equal(
        avatarPathFromUrl(`${base}user-1/char-1-7.webp`),
        "user-1/char-1-7.webp",
      );
    });

    it("refuses a URL from another bucket", () => {
      assert.equal(
        avatarPathFromUrl(
          "https://project.supabase.co/storage/v1/object/public/campaign-maps/u/c.webp",
        ),
        null,
      );
    });

    it("refuses a path that could climb out of the bucket", () => {
      assert.equal(avatarPathFromUrl(`${base}../secrets/key.webp`), null);
    });

    it("answers null for anything that is not a string", () => {
      assert.equal(avatarPathFromUrl(null), null);
      assert.equal(avatarPathFromUrl(undefined), null);
    });
  });

  describe("readCharacterValues", () => {
    it("drops the zero-byte File an empty file input still submits", () => {
      const data = new FormData();
      data.append("avatar", new File([], "", { type: "" }));

      assert.equal(readCharacterValues(data).avatar, null);
    });

    it("keeps a real one, and reads the flag that says to leave one alone", () => {
      const data = new FormData();
      data.append("avatar", portrait({ bytes: 32 }));
      data.append("keepAvatar", "1");

      const values = readCharacterValues(data);

      assert.equal(values.avatar?.size, 32);
      assert.equal(values.keepAvatar, true);
    });

    it("reads no flag as leaving nothing behind", () => {
      assert.equal(readCharacterValues(new FormData()).keepAvatar, false);
    });
  });

  describe("validateCharacter", () => {
    it("refuses a file that is not one of the four image types", () => {
      const problem = validateCharacter(
        validValues({ avatar: portrait({ type: "application/pdf" }) }),
      );

      assert.equal(problem.field, "avatar");
    });

    it("refuses one over the ceiling, even after the browser re-encoded it", () => {
      const problem = validateCharacter(
        validValues({ avatar: portrait({ bytes: MAX_AVATAR_BYTES + 1 }) }),
      );

      assert.equal(problem.field, "avatar");
    });

    it("accepts one inside it", () => {
      assert.equal(
        validateCharacter(validValues({ avatar: portrait({ bytes: 1024 }) })),
        null,
      );
    });
  });
});

describe("isDiceColor", () => {
  it("admits every slug the palette declares", () => {
    for (const value of DICE_COLOR_VALUES) {
      assert.equal(isDiceColor(value), true, `${value} should be a colour`);
    }
  });

  // The guard exists because a colour arrives at a table over a socket.
  it("refuses anything else, whatever shape it arrives in", () => {
    for (const value of ["beige", "", null, undefined, 7, {}]) {
      assert.equal(isDiceColor(value), false);
    }
  });
});
