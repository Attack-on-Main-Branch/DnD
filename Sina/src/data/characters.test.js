import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  getCharacter,
  insertCharacter,
  listCharacters,
  removeCharacter,
  updateCharacter,
} from "./characters.js";

const ARGS = { id: "6f1c3d2e-0000-4000-8000-000000000000", userId: "user-1" };

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23505", "handle_taken", "a name and tag already taken"],
  ["23514", "invalid_value", "a row that got past validateCharacter"],
  ["42P01", "missing_table", "migrations not applied"],
  ["42703", "missing_column", "a migration written but never pushed"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through getCharacter", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await getCharacter(
        stubQuery(postgrestError(code)),
        ARGS,
      );
      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await getCharacter(
      stubQuery(postgrestError("42501")),
      ARGS,
    );
    assert.equal(error.reason, "unknown");
  });

  it("keeps the raw message as detail, for the log rather than the user", async () => {
    const { error } = await getCharacter(
      stubQuery(
        postgrestError("42501", 'permission denied for table "characters"'),
      ),
      ARGS,
    );
    assert.equal(error.detail, 'permission denied for table "characters"');
  });

  describe("22P02 specifically", () => {
    // The regression this test exists for: `id` is a uuid column, so Postgres
    // refuses the cast before it considers a row. That arrives as an error, not
    // as an empty result — so a mistyped URL classified as `unknown`, and the
    // character route's "throw on a failed read" turned a 404 into a 500.
    it("is a distinct reason, not unknown", async () => {
      const { error } = await getCharacter(
        stubQuery(
          postgrestError("22P02", 'invalid input syntax for type uuid: "foo"'),
        ),
        { id: "foo", userId: "user-1" },
      );
      assert.equal(error.reason, "bad_id");
      assert.notEqual(error.reason, "unknown");
    });
  });

  it("returns the row with no error when the read succeeds", async () => {
    const row = { id: ARGS.id, name: "Gandalf" };
    const { data, error } = await getCharacter(
      stubQuery({ data: row, error: null }),
      ARGS,
    );
    assert.equal(error, null);
    assert.deepEqual(data, row);
  });

  it("treats a genuine miss as null data and no error", async () => {
    // maybeSingle() turns "no rows" into null, which is NOT a failure.
    const { data, error } = await getCharacter(
      stubQuery({ data: null, error: null }),
      ARGS,
    );
    assert.equal(data, null);
    assert.equal(error, null);
  });
});

describe("the character limit is recognised by its exception message", () => {
  it("maps the trigger's raise to limit_reached", async () => {
    // The trigger raises a bare exception with no SQLSTATE of its own, so this
    // is matched on the message. If that string ever changes in the migration,
    // this test is what notices.
    const result = await insertCharacter(
      stubQuery(postgrestError("P0001", "character_limit_reached")),
      { userId: "user-1", values: { abilities: {} } },
    );
    assert.equal(result.error.reason, "limit_reached");
  });
});

describe("removeCharacter", () => {
  it("reports success only when a row actually came back", async () => {
    const { data, error } = await removeCharacter(
      stubQuery({ data: [{ id: ARGS.id }], error: null }),
      ARGS,
    );
    assert.equal(error, null);
    assert.equal(data, true);
  });

  describe("a delete that matched nothing", () => {
    // L21: neither Postgres nor PostgREST treats zero rows as an error, and RLS
    // filters silently — so this used to report success for work it had not
    // done, for a stale id or one belonging to somebody else alike.
    it("is not success", async () => {
      const { data, error } = await removeCharacter(
        stubQuery({ data: [], error: null }),
        ARGS,
      );
      assert.equal(data, null);
      assert.notEqual(error, null);
    });

    it("is reported as not_found", async () => {
      const { error } = await removeCharacter(
        stubQuery({ data: [], error: null }),
        ARGS,
      );
      assert.equal(error.reason, "not_found");
    });

    it("handles a null data payload the same way", async () => {
      const { error } = await removeCharacter(
        stubQuery({ data: null, error: null }),
        ARGS,
      );
      assert.equal(error.reason, "not_found");
    });
  });

  it("still surfaces a real database error as itself", async () => {
    const { error } = await removeCharacter(
      stubQuery(postgrestError("42P01")),
      ARGS,
    );
    assert.equal(error.reason, "missing_table");
  });
});

describe("listCharacters", () => {
  it("returns the rows", async () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const { data, error } = await listCharacters(
      stubQuery({ data: rows, error: null }),
      "user-1",
    );
    assert.equal(error, null);
    assert.deepEqual(data, rows);
  });

  it("substitutes an empty array for a null payload, so callers can always map", async () => {
    const { data } = await listCharacters(
      stubQuery({ data: null, error: null }),
      "user-1",
    );
    assert.deepEqual(data, []);
  });

  it("reports a missing table as such, which is what the dashboard banner reads", async () => {
    const { data, error } = await listCharacters(
      stubQuery(postgrestError("42P01")),
      "user-1",
    );
    assert.equal(data, null);
    assert.equal(error.reason, "missing_table");
  });
});

describe("the query shape itself", () => {
  // These assert on what the builder was ASKED for, not on what it answered.
  // Every one of them was green while the corresponding line was deleted,
  // because the stub used to discard its arguments — which is exactly the class
  // of mistake that ships when somebody simplifies a query layer.

  describe("owner scoping", () => {
    // `characters.js` calls these "a second lock on the same door": RLS already
    // scopes every query to the owner, and these filters mean a mistake in a
    // policy still cannot turn an id from a URL into somebody else's character.
    it("getCharacter filters on both id and user_id", async () => {
      const q = stubQuery({ data: null, error: null });
      await getCharacter(q, ARGS);
      assert.deepEqual(q.filters, [
        ["id", ARGS.id],
        ["user_id", ARGS.userId],
      ]);
    });

    it("listCharacters filters on user_id", async () => {
      const q = stubQuery({ data: [], error: null });
      await listCharacters(q, "user-1");
      assert.deepEqual(q.filters, [["user_id", "user-1"]]);
    });

    it("removeCharacter filters on both id and user_id", async () => {
      const q = stubQuery({ data: [{ id: ARGS.id }], error: null });
      await removeCharacter(q, ARGS);
      assert.deepEqual(q.filters, [
        ["id", ARGS.id],
        ["user_id", ARGS.userId],
      ]);
    });
  });

  describe("the selected columns", () => {
    it("never include user_id", async () => {
      // The `20260816120000` migration's argument that its disclosed leak is
      // low-impact rests on this: no user_id ever reaches the client, so an
      // attacker has no uuid to probe with. Nothing enforced it until now.
      const q = stubQuery({ data: null, error: null });
      await getCharacter(q, ARGS);
      assert.ok(q.lastSelect, "a column list should have been requested");
      const selected = q.lastSelect.split(",").map((c) => c.trim());
      assert.ok(
        !selected.includes("user_id"),
        `COLUMNS must not select user_id, got: ${q.lastSelect}`,
      );
    });

    it("include the fields the character sheet renders", async () => {
      const q = stubQuery({ data: null, error: null });
      await getCharacter(q, ARGS);

      // Split rather than match. A regex built from a template literal is one
      // dropped backslash away from searching for a backspace character, which
      // is what the first version of this test actually did.
      const selected = q.lastSelect.split(",").map((c) => c.trim());

      for (const column of [
        "id",
        "name",
        "discriminator",
        "race",
        "class_id",
        "alignment",
        "color_theme",
        "level",
        "skills",
        "backstory",
        "personality",
        "created_at",
      ]) {
        assert.ok(
          selected.includes(column),
          `${column} should be selected, got: ${q.lastSelect}`,
        );
      }
    });
  });

  describe("insertCharacter's column map", () => {
    // The one place camelCase rule values become snake_case columns. A rename
    // applied to one side only yields `undefined`, which Postgres stores as
    // NULL or the column default rather than raising — so it is silent.
    const VALUES = {
      name: "Gandalf",
      discriminator: "0451",
      race: "Human",
      archetype: "warrior",
      classId: "fighter",
      alignment: "lawful_good",
      colorTheme: "violet",
      maxHp: 42,
      abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 11, cha: 7 },
      skills: { stealth: { proficient: true, custom_bonus: null } },
      backstory: "a tale",
      personality: "grumpy",
    };

    it("maps every value onto its column", async () => {
      const q = stubQuery({ data: null, error: null });
      await insertCharacter(q, { userId: "user-1", values: VALUES });

      assert.deepEqual(q.lastInsert, {
        user_id: "user-1",
        kind: "player",
        name: "Gandalf",
        discriminator: "0451",
        race: "Human",
        archetype: "warrior",
        class_id: "fighter",
        alignment: "lawful_good",
        color_theme: "violet",
        // Both, from the one value: a character starts the day whole.
        max_hp: 42,
        current_hp: 42,
        ability_str: 15,
        ability_dex: 14,
        ability_con: 13,
        ability_int: 12,
        ability_wis: 11,
        ability_cha: 7,
        skills: { stealth: { proficient: true, custom_bonus: null } },
        backstory: "a tale",
        personality: "grumpy",
      });
    });

    it("never writes a generated total column", async () => {
      // The six `_total` columns are GENERATED ALWAYS in the migration, and
      // Postgres refuses an INSERT that names one — with a 428C9, which
      // classify() has nothing to say about. So this is a mistake that would
      // reach the user as the generic failure, from code that looks right.
      const q = stubQuery({ data: null, error: null });
      await insertCharacter(q, { userId: "user-1", values: VALUES });

      const generated = Object.keys(q.lastInsert).filter((column) =>
        column.endsWith("_total"),
      );

      assert.deepEqual(generated, []);
    });

    it("writes the caller's user_id, not the values'", async () => {
      // The fixture has to be hostile: handed plain VALUES, which carries no
      // owner, the assertion below cannot fail. Both spellings, because the
      // caller decides the shape.
      const q = stubQuery({ data: null, error: null });
      await insertCharacter(q, {
        userId: "user-1",
        values: { ...VALUES, userId: "user-2", user_id: "user-2" },
      });

      assert.equal(
        q.lastInsert.user_id,
        "user-1",
        "the owner must come from the authenticated caller, never from the payload",
      );
    });

    it("leaves no column undefined", async () => {
      // `undefined` here is the shape a half-applied rename takes.
      const q = stubQuery({ data: null, error: null });
      await insertCharacter(q, { userId: "user-1", values: VALUES });
      const undefinedColumns = Object.entries(q.lastInsert)
        .filter(([, v]) => v === undefined)
        .map(([k]) => k);
      assert.deepEqual(undefinedColumns, []);
    });
  });
});

describe("updateCharacter's parameter map", () => {
  const VALUES = {
    name: "Gandalf",
    discriminator: "0451",
    race: "Human",
    archetype: "warrior",
    classId: "fighter",
    alignment: "lawful_good",
    colorTheme: "violet",
    maxHp: 42,
    abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 11, cha: 7 },
    skills: { stealth: { proficient: true, custom_bonus: null } },
    backstory: "a tale",
    personality: "grumpy",
  };

  it("sends every editable value to the definer function", async () => {
    const q = stubQuery({ data: true, error: null });
    await updateCharacter(q, { id: ARGS.id, values: VALUES });

    assert.equal(q.lastRpc.name, "update_character");
    assert.deepEqual(q.lastRpc.params, {
      target_character: ARGS.id,
      new_name: "Gandalf",
      new_discriminator: "0451",
      new_race: "Human",
      new_archetype: "warrior",
      new_class_id: "fighter",
      new_alignment: "lawful_good",
      new_color_theme: "violet",
      new_max_hp: 42,
      new_ability_str: 15,
      new_ability_dex: 14,
      new_ability_con: 13,
      new_ability_int: 12,
      new_ability_wis: 11,
      new_ability_cha: 7,
      new_skills: { stealth: { proficient: true, custom_bonus: null } },
      new_backstory: "a tale",
      new_personality: "grumpy",
    });
  });

  it("never names a column the function has no parameter for", async () => {
    // A parameter list PostgREST cannot match is a PGRST202, which classify()
    // reads as a migration written but never pushed — a long way from the
    // typo that caused it.
    const q = stubQuery({ data: true, error: null });
    await updateCharacter(q, { id: ARGS.id, values: VALUES });

    const undefinedParams = Object.entries(q.lastRpc.params)
      .filter(([, v]) => v === undefined)
      .map(([k]) => k);

    assert.deepEqual(undefinedParams, []);
  });

  it("reads a false answer as a refusal or a miss, never as a save", async () => {
    const { data, error } = await updateCharacter(
      stubQuery({ data: false, error: null }),
      { id: ARGS.id, values: VALUES },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});
