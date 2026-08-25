import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postgrestError, stubQuery } from "../supabase-stub.js";
import {
  consumeSpellSlot,
  forgetSpell,
  learnSpell,
  listCharacterSpells,
  listPartySpells,
  restoreSpellSlot,
} from "./spells.js";

const CHARACTER = "6f1c3d2e-0000-4000-8000-000000000000";
const OTHER = "6f1c3d2e-0000-4000-8000-000000000001";

const SPELL = {
  slug: "fireball",
  name: "Fireball",
  level: 3,
  school: "Evocation",
  castingTime: "1 action",
  range: "150 feet",
  components: "V, S, M",
  material: "A tiny ball of bat guano and sulfur.",
  duration: "Instantaneous",
  concentration: false,
  ritual: false,
  attackSave: "DEX save",
  damage: "8d6 Fire",
  description: "A bright streak flashes from your pointing finger.",
  higherLevel: "The damage increases by 1d6 for each slot above 3rd.",
  classes: "Sorcerer, Wizard",
  damageByLevel: { 3: "8d6", 4: "9d6" },
  healByLevel: {},
};

/** Every SQLSTATE this layer promises to say something specific about. */
const SQLSTATES = [
  ["23505", "already_known", "a spell already on the shelf"],
  ["23514", "invalid_value", "a row that got past readCatalogueSpell"],
  ["23503", "not_found", "a character deleted mid-request"],
  ["42P01", "missing_table", "migrations not applied"],
  ["22P02", "bad_id", "a junk id against a uuid column"],
];

describe("classify, through listCharacterSpells", () => {
  for (const [code, reason, why] of SQLSTATES) {
    it(`maps ${code} to ${reason} (${why})`, async () => {
      const { data, error } = await listCharacterSpells(
        stubQuery(postgrestError(code)),
        CHARACTER,
      );
      assert.equal(data, null);
      assert.equal(error.reason, reason);
    });
  }

  it("reads PostgREST's own miss as a table that is not there", async () => {
    const { error } = await listCharacterSpells(
      stubQuery(postgrestError("PGRST205")),
      CHARACTER,
    );
    assert.equal(error.reason, "missing_table");
  });

  it("reads the trigger's raise as the ceiling it is", async () => {
    const { error } = await learnSpell(
      stubQuery(postgrestError("P0001", "spell_limit_reached")),
      { characterId: CHARACTER, spell: SPELL },
    );
    assert.equal(error.reason, "limit_reached");
  });

  it("falls back to unknown for a code it has no answer for", async () => {
    const { error } = await listCharacterSpells(
      stubQuery(postgrestError("42501")),
      CHARACTER,
    );
    assert.equal(error.reason, "unknown");
  });

  it("keeps the raw message as detail, for the log rather than the user", async () => {
    const { error } = await listCharacterSpells(
      stubQuery(
        postgrestError("42501", 'permission denied for "character_spells"'),
      ),
      CHARACTER,
    );
    assert.equal(error.detail, 'permission denied for "character_spells"');
  });
});

describe("listCharacterSpells", () => {
  it("asks for the columns the card draws and no others", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCharacterSpells(query, CHARACTER);

    assert.match(query.lastSelect, /spell_slug/);
    assert.match(query.lastSelect, /level/);
    assert.match(query.lastSelect, /damage_by_level/);
    // There is no `user_id` on this table, and nothing here may invent one.
    assert.ok(!query.lastSelect.includes("user_id"));
  });

  it("scopes to the one character", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCharacterSpells(query, CHARACTER);

    assert.deepEqual(query.filters, [["character_id", CHARACTER]]);
  });

  it("answers an empty shelf with a list, not null", async () => {
    const { data } = await listCharacterSpells(
      stubQuery({ data: null, error: null }),
      CHARACTER,
    );

    assert.deepEqual(data, []);
  });
});

describe("listPartySpells", () => {
  it("asks about the whole party in one round trip", async () => {
    const query = stubQuery({ data: [], error: null });
    await listPartySpells(query, [CHARACTER, OTHER]);

    assert.deepEqual(query.filters, [
      ["character_id", [CHARACTER, OTHER], "in"],
    ]);
  });

  it("answers an empty party without a query at all", async () => {
    // PostgREST renders `in.()` as a syntax error, and a campaign with nobody
    // in it is the ordinary state of a new one.
    const query = stubQuery(postgrestError("42601"));
    const { data, error } = await listPartySpells(query, []);

    assert.deepEqual(data, []);
    assert.equal(error, null);
    assert.equal(query.lastSelect, null);
  });
});

describe("learnSpell", () => {
  it("writes the SRD's own answer, column for column", async () => {
    const query = stubQuery({ data: { id: "row" }, error: null });
    await learnSpell(query, { characterId: CHARACTER, spell: SPELL });

    assert.deepEqual(query.lastInsert, {
      character_id: CHARACTER,
      spell_slug: "fireball",
      name: "Fireball",
      level: 3,
      school: "Evocation",
      casting_time: "1 action",
      range_text: "150 feet",
      components: "V, S, M",
      material: "A tiny ball of bat guano and sulfur.",
      duration: "Instantaneous",
      concentration: false,
      ritual: false,
      attack_save: "DEX save",
      damage: "8d6 Fire",
      description: "A bright streak flashes from your pointing finger.",
      higher_level: "The damage increases by 1d6 for each slot above 3rd.",
      classes: "Sorcerer, Wizard",
      damage_by_level: { 3: "8d6", 4: "9d6" },
      heal_by_level: {},
    });
  });

  it("reads no row back as a refusal, not a write that landed", async () => {
    // RLS filters silently, so an insert nobody was entitled to make comes
    // back as no row rather than as a failure.
    const { data, error } = await learnSpell(
      stubQuery({ data: null, error: null }),
      { characterId: OTHER, spell: SPELL },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("forgetSpell", () => {
  it("scopes to the character and the shelf key", async () => {
    const query = stubQuery({ data: [{ id: "row" }], error: null });
    await forgetSpell(query, { characterId: CHARACTER, slug: "fireball" });

    assert.deepEqual(query.filters, [
      ["character_id", CHARACTER],
      ["spell_slug", "fireball"],
    ]);
  });

  it("reads a delete that matched nothing as a miss", async () => {
    // A DELETE matching nothing is not an error, so without the `.select()`
    // somebody else's character id looks exactly like a successful forget.
    const { data, error } = await forgetSpell(
      stubQuery({ data: [], error: null }),
      { characterId: OTHER, slug: "fireball" },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "not_found");
  });
});

describe("the slot functions", () => {
  it("spends one through the RPC that can refuse", async () => {
    const query = stubQuery({ data: { 3: { used: 1, max: 2 } }, error: null });

    const { data } = await consumeSpellSlot(query, {
      characterId: CHARACTER,
      slotLevel: 3,
    });

    assert.equal(query.lastRpc.name, "consume_spell_slot");
    assert.deepEqual(query.lastRpc.params, {
      target_character: CHARACTER,
      p_slot: 3,
    });
    assert.deepEqual(data, { 3: { used: 1, max: 2 } });
  });

  it("reads a null from the function as no slot left", async () => {
    // Not the same as a failure: nothing went wrong, there was nothing there.
    const { data, error } = await consumeSpellSlot(
      stubQuery({ data: null, error: null }),
      { characterId: CHARACTER, slotLevel: 3 },
    );

    assert.equal(data, null);
    assert.equal(error.reason, "no_slots");
  });

  it("puts one back through the other RPC", async () => {
    const query = stubQuery({ data: { 3: { used: 0, max: 2 } }, error: null });

    await restoreSpellSlot(query, { characterId: CHARACTER, slotLevel: 3 });

    assert.equal(query.lastRpc.name, "restore_spell_slot");
  });

  it("reads a refused restore as a miss", async () => {
    // 20260827090000 admits the head of the table alone, so a player calling
    // this gets the same nothing a deleted character gives.
    const { error } = await restoreSpellSlot(
      stubQuery({ data: null, error: null }),
      { characterId: OTHER, slotLevel: 3 },
    );

    assert.equal(error.reason, "not_found");
  });
});
