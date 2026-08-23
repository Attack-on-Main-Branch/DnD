import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACTION_TYPES,
  ACTOR_TYPES,
  MAX_ACTIVITY_ENTRIES,
  MAX_ACTOR_NAME_LENGTH,
  readActivity,
  readActivityLog,
} from "./activity.js";

const ROW = {
  id: "6f1c3d2e-0000-4000-8000-000000000000",
  actor_name: "Fern",
  actor_type: "player",
  action_type: "dice_roll",
  payload: { value: 18, dieType: "d20" },
  created_at: "2026-08-23T09:00:00.000Z",
};

function row(over) {
  return { ...ROW, ...over };
}

describe("the catalogue", () => {
  it("lists exactly what the migration's CHECK admits", () => {
    assert.deepEqual(ACTION_TYPES, [
      "dice_roll",
      "secret_dice_roll",
      "hp_change",
      "level_change",
      "item_used",
      "item_dropped",
      "item_transferred",
      "item_granted",
      "item_revoked",
      "coin_spent",
      "coin_transferred",
      "coin_granted",
      "coin_revoked",
    ]);
    assert.deepEqual(ACTOR_TYPES, ["dm", "player"]);
  });

  it("holds the ceiling the purge trigger keeps", () => {
    assert.equal(MAX_ACTIVITY_ENTRIES, 10);
  });
});

describe("readActivity, on a roll", () => {
  it("reads the die and the face it came up on", () => {
    assert.deepEqual(readActivity(ROW), {
      id: ROW.id,
      action: "dice_roll",
      actor: "Fern",
      die: "d20",
      secret: false,
      value: 18,
    });
  });

  it("refuses a face the die does not have", () => {
    assert.equal(
      readActivity(row({ payload: { value: 34, dieType: "d20" } })),
      null,
    );
    assert.equal(
      readActivity(row({ payload: { value: 0, dieType: "d20" } })),
      null,
    );
  });

  it("refuses a die nobody at this table rolls", () => {
    assert.equal(
      readActivity(row({ payload: { value: 3, dieType: "d7" } })),
      null,
    );
  });

  it("keeps no number for a kept roll, even if the row carries one", () => {
    // The database has no branch that writes one. This is the second lock on
    // the same door: a row from a migration behind the app must not leak the
    // one thing the veil exists to hold back.
    const kept = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "secret_dice_roll",
        payload: { dieType: "d20", value: 18 },
      }),
    );

    assert.equal(kept.actor, "Dungeon Master");
    assert.equal(kept.secret, true);
    assert.equal(kept.value, null);
  });
});

describe("readActivity, on a hit point change", () => {
  it("reads the change and its direction", () => {
    const entry = readActivity(
      row({ action_type: "hp_change", payload: { delta: -14 } }),
    );

    assert.equal(entry.delta, -14);
  });

  it("names nobody when the actor moved their own bar", () => {
    // The database omits the key rather than repeating the actor, and that
    // absence is what Maria's "lost" and "gained" branch on.
    const entry = readActivity(
      row({ action_type: "hp_change", payload: { delta: 8 } }),
    );

    assert.equal(entry.target, null);
  });

  it("names whose bar moved when somebody else moved it", () => {
    const entry = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "hp_change",
        payload: { delta: -10, targetName: "Fern" },
      }),
    );

    assert.equal(entry.delta, -10);
    assert.equal(entry.target, "Fern");
  });

  it("refuses a change of nothing, which is not an event", () => {
    assert.equal(
      readActivity(row({ action_type: "hp_change", payload: { delta: 0 } })),
      null,
    );
  });
});

describe("readActivity, on a level change", () => {
  const LEVELLED = {
    actor_name: "Dungeon Master",
    actor_type: "dm",
    action_type: "level_change",
    payload: { level: 5, delta: 1, targetName: "Fern" },
  };

  it("reads where the ring landed and which way it went", () => {
    const entry = readActivity(row(LEVELLED));

    assert.equal(entry.level, 5);
    assert.equal(entry.delta, 1);
    assert.equal(entry.target, "Fern");
  });

  it("reads a level taken back", () => {
    const entry = readActivity(
      row({
        ...LEVELLED,
        payload: { level: 4, delta: -1, targetName: "Fern" },
      }),
    );

    assert.equal(entry.level, 4);
    assert.equal(entry.delta, -1);
  });

  it("refuses a level outside the two ends the column keeps", () => {
    for (const level of [0, 21]) {
      assert.equal(
        readActivity(
          row({ ...LEVELLED, payload: { ...LEVELLED.payload, level } }),
        ),
        null,
      );
    }
  });

  it("refuses a change of nothing, which is not an event", () => {
    assert.equal(
      readActivity(
        row({ ...LEVELLED, payload: { ...LEVELLED.payload, delta: 0 } }),
      ),
      null,
    );
  });

  it("refuses a row that names nobody", () => {
    // Unlike a hit-point change: a level is only ever moved from the head of
    // the table, so the character is never the actor and the sentence has
    // nobody to be about without this.
    assert.equal(
      readActivity(row({ ...LEVELLED, payload: { level: 5, delta: 1 } })),
      null,
    );
  });
});

describe("readActivity, on an item", () => {
  it("reads a stack leaving the pack", () => {
    const entry = readActivity(
      row({
        action_type: "item_used",
        payload: { itemName: "Potion of Healing", quantity: 2 },
      }),
    );

    assert.equal(entry.item, "Potion of Healing");
    assert.equal(entry.quantity, 2);
    assert.equal(entry.target, null);
  });

  it("reads who a transfer went to", () => {
    const entry = readActivity(
      row({
        action_type: "item_transferred",
        payload: { itemName: "Rope", quantity: 1, targetName: "Fern" },
      }),
    );

    assert.equal(entry.target, "Fern");
  });

  it("reads a stack taken back out of a pack", () => {
    const entry = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "item_revoked",
        payload: { itemName: "Torch", quantity: 3, targetName: "Fern" },
      }),
    );

    assert.equal(entry.item, "Torch");
    assert.equal(entry.quantity, 3);
    assert.equal(entry.target, "Fern");
  });

  it("refuses a transfer with nobody at the other end", () => {
    assert.equal(
      readActivity(
        row({
          action_type: "item_transferred",
          payload: { itemName: "Rope", quantity: 1 },
        }),
      ),
      null,
    );
  });

  it("refuses a quantity that is not a whole count of things", () => {
    assert.equal(
      readActivity(
        row({
          action_type: "item_dropped",
          payload: { itemName: "Rope", quantity: 0 },
        }),
      ),
      null,
    );
  });
});

describe("readActivity, on a purse", () => {
  it("reads coins spent, which name nobody", () => {
    const entry = readActivity(
      row({
        action_type: "coin_spent",
        payload: { coin: "gp", amount: 120 },
      }),
    );

    assert.equal(entry.coin, "gp");
    assert.equal(entry.amount, 120);
    assert.equal(entry.target, null);
  });

  it("reads coins handed over, which name the other end", () => {
    const entry = readActivity(
      row({
        action_type: "coin_transferred",
        payload: { coin: "sp", amount: 40, targetName: "Fern" },
      }),
    );

    assert.equal(entry.amount, 40);
    assert.equal(entry.target, "Fern");
  });

  it("reads a grant to the whole party, named by the database", () => {
    const entry = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "coin_granted",
        payload: { coin: "pp", amount: 1, targetName: "the party" },
      }),
    );

    assert.equal(entry.target, "the party");
  });

  it("refuses a hand-over with nobody at the other end", () => {
    assert.equal(
      readActivity(
        row({
          action_type: "coin_transferred",
          payload: { coin: "gp", amount: 5 },
        }),
      ),
      null,
    );
  });

  it("refuses a denomination that is not one of the five", () => {
    assert.equal(
      readActivity(
        row({ action_type: "coin_spent", payload: { coin: "zp", amount: 5 } }),
      ),
      null,
    );
  });

  it("refuses an amount outside what a purse can hold", () => {
    assert.equal(
      readActivity(
        row({ action_type: "coin_spent", payload: { coin: "gp", amount: 0 } }),
      ),
      null,
    );

    assert.equal(
      readActivity(
        row({
          action_type: "coin_spent",
          payload: { coin: "gp", amount: 10000000 },
        }),
      ),
      null,
    );
  });
});

describe("readActivity, on a row that does not hold together", () => {
  it("refuses an action the catalogue has never heard of", () => {
    assert.equal(readActivity(row({ action_type: "cast_spell" })), null);
  });

  it("refuses an actor type outside the two", () => {
    assert.equal(readActivity(row({ actor_type: "npc" })), null);
  });

  it("refuses a nameless actor", () => {
    assert.equal(readActivity(row({ actor_name: "   " })), null);
  });

  it("refuses a payload that is not an object", () => {
    assert.equal(readActivity(row({ payload: "18" })), null);
    assert.equal(readActivity(row({ payload: null })), null);
  });

  it("holds a name to the column's bound", () => {
    const entry = readActivity(row({ actor_name: "x".repeat(400) }));

    assert.equal(entry.actor.length, MAX_ACTOR_NAME_LENGTH);
  });
});

describe("readActivityLog", () => {
  it("keeps the order it was given and drops what it cannot read", () => {
    const log = readActivityLog([
      ROW,
      row({ id: "b", action_type: "cast_spell" }),
      row({ id: "c", action_type: "hp_change", payload: { delta: 5 } }),
    ]);

    assert.deepEqual(
      log.map((entry) => entry.id),
      [ROW.id, "c"],
    );
  });

  it("answers an empty log with an empty list, not null", () => {
    assert.deepEqual(readActivityLog(null), []);
    assert.deepEqual(readActivityLog(undefined), []);
  });
});
