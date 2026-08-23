import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COIN_TYPES,
  emptyPurse,
  isCoin,
  MAX_COINS,
  parseCoins,
  parsePurse,
  readPurse,
} from "./currency.js";

describe("the denominations", () => {
  it("lists exactly what `is_coin` admits, in ascending value", () => {
    assert.deepEqual(COIN_TYPES, ["cp", "sp", "ep", "gp", "pp"]);
  });

  it("holds the ceiling `characters_currency_check` keeps", () => {
    assert.equal(MAX_COINS, 9999999);
  });

  it("knows a coin from anything else a caller might send", () => {
    for (const coin of COIN_TYPES) {
      assert.equal(isCoin(coin), true);
    }

    for (const not of ["GP", "gold", "", null, undefined, 0, "cp "]) {
      assert.equal(isCoin(not), false);
    }
  });
});

describe("parseCoins", () => {
  it("takes a number as typed", () => {
    assert.equal(parseCoins("120"), 120);
    assert.equal(parseCoins(120), 120);
  });

  it("tells an empty field from a zero", () => {
    // `Number("")` is 0, so emptiness has to be tested before the number is.
    assert.equal(parseCoins(""), null);
    assert.equal(parseCoins("   "), null);
    assert.equal(parseCoins(null), null);
    assert.equal(parseCoins("0"), 0);
  });

  it("clamps rather than refusing, the way parseQuantity does", () => {
    assert.equal(parseCoins(-40), 0);
    assert.equal(parseCoins(MAX_COINS + 1), MAX_COINS);
  });

  it("rounds, so a pasted fraction is still a number of coins", () => {
    assert.equal(parseCoins("12.4"), 12);
    assert.equal(parseCoins("12.6"), 13);
  });

  it("refuses what is not a number at all", () => {
    assert.equal(parseCoins("gold"), null);
    assert.equal(parseCoins(Number.NaN), null);
    assert.equal(parseCoins(Infinity), null);
  });
});

describe("readPurse", () => {
  it("reads the five columns off a row", () => {
    assert.deepEqual(readPurse({ cp: 1, sp: 2, ep: 3, gp: 4, pp: 5 }), {
      cp: 1,
      sp: 2,
      ep: 3,
      gp: 4,
      pp: 5,
    });
  });

  it("answers zero for a column that is not there", () => {
    // A database a migration behind the app, where a row without these columns
    // would otherwise render as "GP undefined".
    assert.deepEqual(readPurse({ gp: 12 }), { ...emptyPurse(), gp: 12 });
    assert.deepEqual(readPurse(undefined), emptyPurse());
    assert.deepEqual(readPurse(null), emptyPurse());
  });

  it("holds a corrupt row to the same bounds a typed one is held to", () => {
    assert.deepEqual(readPurse({ gp: -5 }), emptyPurse());
    assert.equal(readPurse({ gp: MAX_COINS + 100 }).gp, MAX_COINS);
    assert.equal(readPurse({ gp: "nonsense" }).gp, 0);
  });
});

describe("parsePurse", () => {
  it("clamps all five and adds them up", () => {
    const { coins, total } = parsePurse({ cp: "10", gp: "5", pp: -2 });

    assert.deepEqual(coins, { cp: 10, sp: 0, ep: 0, gp: 5, pp: 0 });
    assert.equal(total, 15);
  });

  it("reports nothing typed as a total of zero, which is not a grant", () => {
    // `move_campaign_currency` refuses that press for the same reason: a log
    // entry saying "granted 0 gp to the party" describes nothing.
    assert.equal(parsePurse({}).total, 0);
    assert.equal(parsePurse(undefined).total, 0);
    assert.deepEqual(parsePurse({}).coins, emptyPurse());
  });
});
