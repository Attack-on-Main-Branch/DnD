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
      "spell_cast",
      "chest_revealed",
      "chest_looted",
      "bag_transferred",
      "xp_change",
      "rest_taken",
      "max_hp_change",
      "instant_death",
      "death_save",
      "character_died",
      "character_revived",
      "condition_applied",
      "condition_removed",
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
      count: 1,
      secret: false,
      value: 18,
    });
  });

  it("reads a handful and the total it came to", () => {
    const entry = readActivity(
      row({ payload: { value: 14, dieType: "d6", count: 3 } }),
    );

    assert.equal(entry.count, 3);
    assert.equal(entry.value, 14);
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

  it("refuses a total the handful could not have come to", () => {
    assert.equal(
      readActivity(row({ payload: { value: 19, dieType: "d6", count: 3 } })),
      null,
    );
    assert.equal(
      readActivity(row({ payload: { value: 2, dieType: "d6", count: 3 } })),
      null,
    );
  });

  it("refuses a count the rail could not have thrown", () => {
    assert.equal(
      readActivity(row({ payload: { value: 4, dieType: "d6", count: 0 } })),
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

  it("names nobody for a rung somebody climbed themselves", () => {
    // A level used to be AWARDED and nothing else, so the character was never
    // the actor and a row without a name was unreadable. Since 20260903090000
    // experience can carry somebody up their own ladder, and the database omits
    // the key for that exactly as it does for a hit point moved on one's own
    // bar. Two sentences, one entry.
    const climbed = readActivity(
      row({ ...LEVELLED, payload: { level: 5, delta: 1 } }),
    );

    assert.equal(climbed.level, 5);
    assert.equal(climbed.delta, 1);
    assert.equal(climbed.target, null);
  });
});

describe("readActivity, on experience", () => {
  it("reads a gain nobody else was named for", () => {
    const gained = readActivity(
      row({ action_type: "xp_change", payload: { delta: 150 } }),
    );

    assert.equal(gained.delta, 150);
    assert.equal(gained.target, null);
  });

  it("reads a grant from the head of the table", () => {
    const granted = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "xp_change",
        payload: { delta: 150, targetName: "the party" },
      }),
    );

    assert.equal(granted.target, "the party");
  });

  it("refuses a change of nothing, and one past a single press", () => {
    assert.equal(
      readActivity(row({ action_type: "xp_change", payload: { delta: 0 } })),
      null,
    );
    assert.equal(
      readActivity(
        row({ action_type: "xp_change", payload: { delta: 100001 } }),
      ),
      null,
    );
  });
});

describe("readActivity, on a rest", () => {
  it("reads which of the two it was", () => {
    const rested = readActivity(
      row({ action_type: "rest_taken", payload: { restType: "long" } }),
    );

    assert.equal(rested.restType, "long");
    assert.equal(rested.target, null);
  });

  it("names the party when the table rested together", () => {
    const rested = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "rest_taken",
        payload: { restType: "short", targetName: "the party" },
      }),
    );

    assert.equal(rested.target, "the party");
  });

  it("refuses a rest nobody takes", () => {
    assert.equal(
      readActivity(row({ action_type: "rest_taken", payload: {} })),
      null,
    );
    assert.equal(
      readActivity(
        row({ action_type: "rest_taken", payload: { restType: "nap" } }),
      ),
      null,
    );
  });
});

describe("readActivity, on a frame that moved", () => {
  it("reads where the maximum landed and the rung it landed on", () => {
    const moved = readActivity(
      row({
        actor_name: "Dungeon Master",
        actor_type: "dm",
        action_type: "max_hp_change",
        payload: { maxHp: 12, level: 2, targetName: "Frieren" },
      }),
    );

    assert.equal(moved.maxHp, 12);
    assert.equal(moved.level, 2);
    assert.equal(moved.target, "Frieren");
  });

  it("refuses a maximum or a rung outside its own ends", () => {
    assert.equal(
      readActivity(
        row({ action_type: "max_hp_change", payload: { maxHp: 0, level: 2 } }),
      ),
      null,
    );
    assert.equal(
      readActivity(
        row({
          action_type: "max_hp_change",
          payload: { maxHp: 9999, level: 2 },
        }),
      ),
      null,
    );
    assert.equal(
      readActivity(
        row({ action_type: "max_hp_change", payload: { maxHp: 12, level: 0 } }),
      ),
      null,
    );
  });

  it("refuses a row missing either half", () => {
    assert.equal(
      readActivity(
        row({ action_type: "max_hp_change", payload: { maxHp: 12 } }),
      ),
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

describe("readActivity, on a spell", () => {
  const cast = (payload) => row({ action_type: "spell_cast", payload });

  it("reads the name and the shelf it came off", () => {
    assert.deepEqual(
      readActivity(cast({ spellName: "Fireball", spellLevel: 3 })),
      {
        id: ROW.id,
        action: "spell_cast",
        actor: "Fern",
        spell: "Fireball",
        level: 3,
        damage: null,
        save: null,
      },
    );
  });

  it("keeps a cantrip, whose level is zero and not nothing", () => {
    const entry = readActivity(cast({ spellName: "Fire Bolt", spellLevel: 0 }));

    assert.equal(entry.level, 0);
  });

  it("names nobody: a spell is cast at the table", () => {
    const entry = readActivity(
      cast({ spellName: "Fireball", spellLevel: 3, targetName: "Fern" }),
    );

    assert.equal(entry.target, undefined);
  });

  it("refuses a shelf that is not one", () => {
    assert.equal(
      readActivity(cast({ spellName: "Wish", spellLevel: 10 })),
      null,
    );
    assert.equal(
      readActivity(cast({ spellName: "Wish", spellLevel: -1 })),
      null,
    );
    assert.equal(readActivity(cast({ spellName: "Wish" })), null);
  });

  it("refuses a spell with no name", () => {
    assert.equal(readActivity(cast({ spellName: "  ", spellLevel: 1 })), null);
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

describe("readActivity, containers", () => {
  const revealed = (payload) =>
    row({
      actor_type: "dm",
      actor_name: "Dungeon Master",
      action_type: "chest_revealed",
      payload,
    });

  const looted = (payload) => row({ action_type: "chest_looted", payload });
  const handed = (payload) => row({ action_type: "bag_transferred", payload });

  it("reads a chest shown to one character, who is named", () => {
    const entry = revealed({
      containerName: "Sunken Iron Chest",
      shown: 1,
      targetName: "Frieren",
    });

    assert.deepEqual(readActivity(entry), {
      id: ROW.id,
      action: "chest_revealed",
      actor: "Dungeon Master",
      container: "Sunken Iron Chest",
      shown: 1,
      target: "Frieren",
    });
  });

  it("reads one shown to several, where there is no one name to say", () => {
    const entry = readActivity(
      revealed({ containerName: "Crypt Chest", shown: 3 }),
    );

    assert.equal(entry.shown, 3);
    assert.equal(entry.target, null);
  });

  it("refuses a reveal that reached nobody", () => {
    assert.equal(
      readActivity(revealed({ containerName: "Chest", shown: 0 })),
      null,
    );
    assert.equal(readActivity(revealed({ shown: 1 })), null);
  });

  it("reads a stack taken out of a chest, which names nobody", () => {
    const entry = readActivity(
      looted({ containerName: "Crypt Chest", itemName: "Rope", quantity: 2 }),
    );

    assert.equal(entry.container, "Crypt Chest");
    assert.equal(entry.item, "Rope");
    assert.equal(entry.quantity, 2);
    assert.equal(entry.target, undefined);
  });

  it("refuses a loot line with no chest, no item, or no amount", () => {
    assert.equal(readActivity(looted({ itemName: "Rope", quantity: 2 })), null);
    assert.equal(
      readActivity(looted({ containerName: "Chest", quantity: 2 })),
      null,
    );
    assert.equal(
      readActivity(
        looted({ containerName: "Chest", itemName: "Rope", quantity: 0 }),
      ),
      null,
    );
  });

  it("reads a bag handed over, which must name its receiver", () => {
    const entry = readActivity(
      handed({ containerName: "Bag of Holding", targetName: "Fern" }),
    );

    assert.equal(entry.container, "Bag of Holding");
    assert.equal(entry.target, "Fern");

    // A bag put back on the table names nobody and is never written down.
    assert.equal(
      readActivity(handed({ containerName: "Bag of Holding" })),
      null,
    );
  });

  it("holds a container name to its own shorter bound", () => {
    const entry = readActivity(
      handed({ containerName: "b".repeat(400), targetName: "Fern" }),
    );

    assert.equal(entry.container.length, 60);
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

describe("readActivity, at zero hit points", () => {
  function entry(action, payload) {
    return row({ action_type: action, payload });
  }

  it("reads the blow that skipped the three saves", () => {
    assert.deepEqual(
      entry("instant_death", { damage: 40, targetName: "Frieren" }),
      entry("instant_death", { damage: 40, targetName: "Frieren" }),
    );

    const read = readActivity(
      entry("instant_death", { damage: 40, targetName: "Frieren" }),
    );

    assert.equal(read.damage, 40);
    assert.equal(read.target, "Frieren");
  });

  it("refuses a blow that is no blow at all", () => {
    for (const damage of [0, -3, null, "hard"]) {
      assert.equal(readActivity(entry("instant_death", { damage })), null);
    }
  });

  it("reads a save, the face and what it came to", () => {
    const read = readActivity(
      entry("death_save", { roll: 17, outcome: "success" }),
    );

    assert.equal(read.roll, 17);
    assert.equal(read.outcome, "success");
  });

  it("refuses a save whose outcome disagrees with its own face", () => {
    assert.equal(
      readActivity(entry("death_save", { roll: 3, outcome: "success" })),
      null,
    );

    assert.equal(
      readActivity(entry("death_save", { roll: 20, outcome: "success" })),
      null,
    );
  });

  it("refuses a face no d20 has", () => {
    for (const roll of [0, 21, null]) {
      assert.equal(
        readActivity(entry("death_save", { roll, outcome: "success" })),
        null,
      );
    }
  });

  it("reads the end, and the way back from it", () => {
    assert.equal(
      readActivity(entry("character_died", { targetName: "Frieren" })).target,
      "Frieren",
    );

    assert.equal(
      readActivity(entry("character_revived", { targetName: "Frieren" }))
        .target,
      "Frieren",
    );
  });

  it("refuses a revival with nobody at the other end of it", () => {
    assert.equal(readActivity(entry("character_revived", {})), null);
  });
});
