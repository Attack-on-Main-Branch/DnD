import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_INSPIRATION,
  mayMoveInspiration,
  parseInspiration,
  steppedInspiration,
} from "./inspiration.js";

describe("reading a figure", () => {
  it("takes a whole number of marks", () => {
    assert.equal(parseInspiration(0), 0);
    assert.equal(parseInspiration(MAX_INSPIRATION), MAX_INSPIRATION);
    assert.equal(parseInspiration("2"), 2);
  });

  it("has none for a figure outside the three", () => {
    assert.equal(parseInspiration(-1), null);
    assert.equal(parseInspiration(MAX_INSPIRATION + 1), null);
    assert.equal(parseInspiration(1.5), null);
  });

  it("reads an absent figure as no answer, not as zero", () => {
    // `campaign_party` returns null for a character whose marks the caller may
    // not read — a permission, not a gap.
    assert.equal(parseInspiration(null), null);
    assert.equal(parseInspiration(undefined), null);
  });
});

describe("who may move one", () => {
  it("lets the head of the table give and take, for anybody", () => {
    assert.equal(
      mayMoveInspiration({ head: true, own: false, spending: true }),
      true,
    );
    assert.equal(
      mayMoveInspiration({ head: true, own: false, spending: false }),
      true,
    );
  });

  it("lets a player spend their own", () => {
    assert.equal(
      mayMoveInspiration({ head: false, own: true, spending: true }),
      true,
    );
  });

  it("does NOT let a player hand one back to themselves", () => {
    assert.equal(
      mayMoveInspiration({ head: false, own: true, spending: false }),
      false,
    );
  });

  it("does not let a player touch somebody else's either way", () => {
    assert.equal(
      mayMoveInspiration({ head: false, own: false, spending: true }),
      false,
    );
    assert.equal(
      mayMoveInspiration({ head: false, own: false, spending: false }),
      false,
    );
  });
});

describe("a press", () => {
  it("moves one mark either way", () => {
    assert.equal(steppedInspiration(2, -1), 1);
    assert.equal(steppedInspiration(2, 1), 3);
  });

  it("stops at both ends", () => {
    assert.equal(steppedInspiration(0, -1), null);
    assert.equal(steppedInspiration(MAX_INSPIRATION, 1), null);
  });

  it("clamps rather than overshooting", () => {
    assert.equal(steppedInspiration(2, 5), MAX_INSPIRATION);
    assert.equal(steppedInspiration(1, -5), 0);
  });

  it("has no answer for a figure or a press it cannot read", () => {
    assert.equal(steppedInspiration(null, -1), null);
    assert.equal(steppedInspiration(2, 0), null);
    assert.equal(steppedInspiration(2, 1.5), null);
  });
});
