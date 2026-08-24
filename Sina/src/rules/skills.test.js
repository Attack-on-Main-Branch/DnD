import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ABILITIES } from "./character.js";
import { MAX_LEVEL, MIN_LEVEL } from "./level.js";
import {
  BASE_PROFICIENCY_BONUS,
  MAX_SKILL_BONUS,
  MIN_SKILL_BONUS,
  parseSkillBonus,
  proficiencyBonus,
  readSkills,
  SKILLS,
  skillBonusFieldName,
  skillDetails,
  skillFieldName,
  skillState,
  skillTotal,
  skillsForAbility,
  skillsOf,
  validateSkills,
} from "./skills.js";

function formData(entries) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

describe("proficiencyBonus", () => {
  // The table on the character sheet, band by band.
  const BANDS = [
    [[1, 2, 3, 4], 2],
    [[5, 6, 7, 8], 3],
    [[9, 10, 11, 12], 4],
    [[13, 14, 15, 16], 5],
    [[17, 18, 19, 20], 6],
  ];

  for (const [levels, bonus] of BANDS) {
    it(`is +${bonus} at levels ${levels[0]}–${levels.at(-1)}`, () => {
      for (const level of levels) {
        assert.equal(proficiencyBonus(level), bonus);
      }
    });
  }

  it("starts a new character at the base bonus", () => {
    assert.equal(proficiencyBonus(MIN_LEVEL), BASE_PROFICIENCY_BONUS);
  });

  it("clamps rather than refusing, the way parseLevel does", () => {
    assert.equal(proficiencyBonus(0), proficiencyBonus(MIN_LEVEL));
    assert.equal(proficiencyBonus(99), proficiencyBonus(MAX_LEVEL));
    assert.equal(proficiencyBonus(null), BASE_PROFICIENCY_BONUS);
    assert.equal(proficiencyBonus("nonsense"), BASE_PROFICIENCY_BONUS);
  });
});

describe("the catalogue", () => {
  it("has the eighteen standard skills", () => {
    assert.equal(SKILLS.length, 18);
  });

  it("gives every skill a unique id", () => {
    assert.equal(new Set(SKILLS.map((skill) => skill.id)).size, SKILLS.length);
  });

  it("rolls every skill against an ability that exists", () => {
    // The one place the two catalogues have to agree: the grid groups skills by
    // asking ABILITIES for its ids, so a typo here yields an empty group rather
    // than an error.
    const ids = new Set(ABILITIES.map((ability) => ability.id));

    for (const skill of SKILLS) {
      assert.ok(ids.has(skill.ability), `${skill.id} rolls against nothing`);
    }
  });

  it("splits them the way the sheet does", () => {
    const counts = Object.fromEntries(
      ABILITIES.map((ability) => [
        ability.id,
        skillsForAbility(ability.id).length,
      ]),
    );

    // Constitution has none, and that is the rule rather than an omission.
    assert.deepEqual(counts, {
      str: 1,
      dex: 3,
      con: 0,
      int: 5,
      wis: 5,
      cha: 4,
    });
  });

  it("finds a skill by id, and nothing by anything else", () => {
    assert.equal(skillDetails("stealth").ability, "dex");
    assert.equal(skillDetails("juggling"), null);
    assert.equal(skillDetails(undefined), null);
  });
});

describe("parseSkillBonus", () => {
  it("reads an empty box as nothing typed", () => {
    assert.equal(parseSkillBonus(""), null);
    assert.equal(parseSkillBonus("   "), null);
    assert.equal(parseSkillBonus(null), null);
  });

  it("reads a signed or unsigned whole number", () => {
    assert.equal(parseSkillBonus("3"), 3);
    assert.equal(parseSkillBonus("+3"), 3);
    assert.equal(parseSkillBonus("-2"), -2);
  });

  it("leaves anything else NaN, for validation to refuse", () => {
    // Not defaulted to null: a mangled field must not become "nothing typed",
    // which is silently a different sheet. Same reasoning as readAbilityScores.
    for (const junk of ["1.5", "9e9", "--1", "three", "1000"]) {
      assert.ok(Number.isNaN(parseSkillBonus(junk)), `${junk} should be NaN`);
    }
  });
});

describe("readSkills", () => {
  it("stores nothing for a sheet nobody touched", () => {
    assert.deepEqual(readSkills(formData({})), {});
  });

  it("ignores the empty boxes the grid always submits", () => {
    const fields = Object.fromEntries(
      SKILLS.map((skill) => [skillBonusFieldName(skill.id), ""]),
    );

    assert.deepEqual(readSkills(formData(fields)), {});
  });

  it("keeps a proficiency on its own", () => {
    assert.deepEqual(
      readSkills(formData({ [skillFieldName("stealth")]: "on" })),
      {
        stealth: { proficient: true, custom_bonus: null },
      },
    );
  });

  it("keeps a typed bonus on its own", () => {
    assert.deepEqual(
      readSkills(formData({ [skillBonusFieldName("athletics")]: "+3" })),
      { athletics: { proficient: false, custom_bonus: 3 } },
    );
  });

  it("keeps both, and leaves the other sixteen out", () => {
    const skills = readSkills(
      formData({
        [skillFieldName("stealth")]: "on",
        [skillBonusFieldName("stealth")]: "9",
        [skillBonusFieldName("arcana")]: "",
      }),
    );

    assert.deepEqual(skills, {
      stealth: { proficient: true, custom_bonus: 9 },
    });
  });
});

describe("skillsOf", () => {
  it("is empty for a row written before the column existed", () => {
    assert.deepEqual(skillsOf({}), {});
    assert.deepEqual(skillsOf(null), {});
  });

  it("reads the column back as the grid holds it", () => {
    const stored = {
      stealth: { proficient: true, custom_bonus: null },
      athletics: { proficient: false, custom_bonus: 3 },
    };

    assert.deepEqual(skillsOf({ skills: stored }), stored);
  });

  it("drops what the catalogue no longer knows about", () => {
    // The column outlives any one version of SKILLS, so a renamed or retired
    // skill must not reach the grid as a card it cannot draw.
    const skills = skillsOf({
      skills: {
        juggling: { proficient: true, custom_bonus: null },
        stealth: { proficient: true, custom_bonus: null },
      },
    });

    assert.deepEqual(skills, {
      stealth: { proficient: true, custom_bonus: null },
    });
  });

  it("drops a malformed entry rather than trusting it", () => {
    const skills = skillsOf({
      skills: {
        stealth: "yes",
        arcana: { proficient: "true", custom_bonus: "3" },
        insight: { proficient: true },
      },
    });

    assert.deepEqual(skills, {
      insight: { proficient: true, custom_bonus: null },
    });
  });

  it("refuses an array, which is an object to typeof", () => {
    assert.deepEqual(skillsOf({ skills: [] }), {});
  });
});

describe("skillState", () => {
  it("answers for a skill the map says nothing about", () => {
    assert.deepEqual(skillState({}, "stealth"), {
      proficient: false,
      custom_bonus: null,
    });
  });

  it("answers for one it does", () => {
    assert.deepEqual(
      skillState({ stealth: { proficient: true, custom_bonus: 4 } }, "stealth"),
      { proficient: true, custom_bonus: 4 },
    );
  });
});

describe("skillTotal", () => {
  it("is the ability modifier alone without proficiency", () => {
    assert.equal(skillTotal({ modifier: 2, level: 1 }), 2);
  });

  it("adds the proficiency bonus for the level when trained", () => {
    assert.equal(skillTotal({ modifier: 2, level: 1, proficient: true }), 4);
    assert.equal(skillTotal({ modifier: 2, level: 17, proficient: true }), 8);
  });

  it("adds a typed bonus on top rather than standing in for the total", () => {
    // Arcana picked and 3 typed into the box reads +5 on the sheet: the box is
    // the extra, so the arithmetic underneath still follows the ability.
    assert.equal(
      skillTotal({ modifier: 0, level: 1, proficient: true, customBonus: 3 }),
      5,
    );
    assert.equal(
      skillTotal({ modifier: 2, level: 1, proficient: true, customBonus: 7 }),
      11,
    );
    assert.equal(skillTotal({ modifier: 3, level: 1, customBonus: 0 }), 3);
    assert.equal(skillTotal({ modifier: 3, level: 1, customBonus: -1 }), 2);
  });

  it("ignores a modifier that is not a number", () => {
    assert.equal(skillTotal({ modifier: Number.NaN, level: 1 }), 0);
  });
});

describe("validateSkills", () => {
  it("accepts a sheet with no skills on it at all", () => {
    assert.equal(validateSkills({}), null);
  });

  it("accepts a proficiency and a bonus at either bound", () => {
    assert.equal(
      validateSkills({
        stealth: { proficient: true, custom_bonus: null },
        arcana: { proficient: false, custom_bonus: MIN_SKILL_BONUS },
        insight: { proficient: true, custom_bonus: MAX_SKILL_BONUS },
      }),
      null,
    );
  });

  it("refuses a key that is not a skill", () => {
    const problem = validateSkills({
      juggling: { proficient: true, custom_bonus: null },
    });

    assert.equal(problem.field, "skills");
  });

  it("refuses a bonus past either bound", () => {
    for (const bonus of [MIN_SKILL_BONUS - 1, MAX_SKILL_BONUS + 1]) {
      const problem = validateSkills({
        stealth: { proficient: false, custom_bonus: bonus },
      });

      assert.equal(problem.field, "skills");
    }
  });

  it("refuses the NaN a mangled box arrives as", () => {
    const problem = validateSkills({
      stealth: { proficient: false, custom_bonus: Number.NaN },
    });

    assert.equal(problem.field, "skills");
  });

  it("refuses a fraction, which no CHECK constraint would take either", () => {
    const problem = validateSkills({
      stealth: { proficient: false, custom_bonus: 1.5 },
    });

    assert.equal(problem.field, "skills");
  });

  it("refuses a proficiency that is not a boolean", () => {
    const problem = validateSkills({
      stealth: { proficient: "yes", custom_bonus: null },
    });

    assert.equal(problem.field, "skills");
  });

  it("refuses what is not a map of skills at all", () => {
    for (const value of [null, undefined, [], "stealth"]) {
      assert.equal(validateSkills(value).field, "skills");
    }
  });
});
