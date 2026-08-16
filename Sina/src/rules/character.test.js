import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALIGNMENTS,
  alignmentLabel,
  archetypeDetails,
  AVATAR_COLOR_VALUES,
  characterHandle,
  classDetails,
  classLabel,
  MAX_NAME_LENGTH,
  MAX_PROSE_LENGTH,
  RACES,
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
    colorTheme: "violet",
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
      validateCharacter(validValues({ colorTheme: "beige" })).field,
      "colorTheme",
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
    for (const colorTheme of AVATAR_COLOR_VALUES) {
      assert.equal(
        validateCharacter(validValues({ colorTheme })),
        null,
        `${colorTheme} should be valid`,
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
