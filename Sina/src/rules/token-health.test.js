import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseTokenMaxHp,
  validTokenHealthDelta,
  MAX_TOKEN_HP,
} from "./token-health.js";
import { readPlacedToken } from "./tokens.js";

test("token HP is optional but otherwise positive, integral and bounded", () => {
  assert.equal(parseTokenMaxHp(""), null);
  assert.equal(parseTokenMaxHp(null), null);
  assert.equal(parseTokenMaxHp("32"), 32);
  assert.equal(parseTokenMaxHp(MAX_TOKEN_HP), MAX_TOKEN_HP);
  for (const value of [0, -1, 1.5, "no", Infinity, MAX_TOKEN_HP + 1])
    assert.equal(parseTokenMaxHp(value), undefined);
});

test("damage and healing accept bounded whole changes only", () => {
  for (const value of [-MAX_TOKEN_HP, -1, 1, MAX_TOKEN_HP])
    assert.equal(validTokenHealthDelta(value), true);
  for (const value of [0, 1.5, NaN, Infinity, MAX_TOKEN_HP + 1, "5"])
    assert.equal(validTokenHealthDelta(value), false);
});

test("private HP is stripped from public token messages", () => {
  const token = readPlacedToken({
    id: "t",
    mapId: "m",
    templateId: "enemy",
    x: 0.5,
    y: 0.5,
    current_hp: 9,
    max_hp: 20,
    health: { current_hp: 9 },
  });
  assert.ok(token);
  for (const field of ["current_hp", "max_hp", "health"])
    assert.equal(Object.hasOwn(token, field), false);
});
