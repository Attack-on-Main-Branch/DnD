import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampGridLuminance,
  clampGridSize,
  DEFAULT_GRID_LUMINANCE,
  DEFAULT_GRID_SIZE,
  MAX_GRID_LUMINANCE,
  MAX_GRID_SIZE,
  MIN_GRID_LUMINANCE,
  MIN_GRID_SIZE,
  readGridSettings,
} from "./grid.js";

describe("clampGridSize", () => {
  it("keeps a size the CHECK constraint would take", () => {
    assert.equal(clampGridSize(48), 48);
    assert.equal(clampGridSize(MIN_GRID_SIZE), MIN_GRID_SIZE);
    assert.equal(clampGridSize(MAX_GRID_SIZE), MAX_GRID_SIZE);
  });

  // Clamped rather than refused: a slider is what produces these, and a value a
  // hair outside the bound is a rounding artefact rather than an intention.
  it("pulls one outside it back to the edge", () => {
    assert.equal(clampGridSize(0), MIN_GRID_SIZE);
    assert.equal(clampGridSize(-40), MIN_GRID_SIZE);
    assert.equal(clampGridSize(9000), MAX_GRID_SIZE);
  });

  it("rounds, because the column is an integer", () => {
    assert.equal(clampGridSize(47.6), 48);
  });

  it("answers the default for anything that is not a number", () => {
    for (const value of [null, undefined, "", "wide", NaN, {}]) {
      assert.equal(clampGridSize(value), DEFAULT_GRID_SIZE);
    }
  });
});

describe("clampGridLuminance", () => {
  it("keeps both ends of the ramp and the middle", () => {
    assert.equal(clampGridLuminance(MIN_GRID_LUMINANCE), 0);
    assert.equal(clampGridLuminance(0.5), 0.5);
    assert.equal(clampGridLuminance(MAX_GRID_LUMINANCE), 1);
  });

  it("pulls one outside it back to the edge", () => {
    assert.equal(clampGridLuminance(-2), 0);
    assert.equal(clampGridLuminance(4), 1);
  });

  // A double can arrive as NaN, which passes `between` nowhere — the same
  // hazard `place_campaign_mark` tests for on a point.
  it("answers the default for anything that is not a number", () => {
    for (const value of [null, undefined, "", NaN, "grey"]) {
      assert.equal(clampGridLuminance(value), DEFAULT_GRID_LUMINANCE);
    }
  });
});

describe("readGridSettings", () => {
  it("reads a ruled map back as it was written", () => {
    assert.deepEqual(
      readGridSettings({
        grid_enabled: true,
        grid_size: 72,
        grid_luminance: 0.25,
      }),
      { enabled: true, size: 72, luminance: 0.25 },
    );
  });

  // The `??` belongs here and nowhere else: this reads a row an older deploy
  // may have written before these columns existed.
  it("answers the defaults for a row from before the grid", () => {
    assert.deepEqual(readGridSettings({}), {
      enabled: false,
      size: DEFAULT_GRID_SIZE,
      luminance: DEFAULT_GRID_LUMINANCE,
    });
  });

  it("answers the same for no row at all", () => {
    assert.equal(readGridSettings(null).enabled, false);
    assert.equal(readGridSettings(undefined).size, DEFAULT_GRID_SIZE);
  });

  // A row that got past the constraint another way is still bounded on the way
  // out: the overlay divides by `size`, and a zero there is a blank board.
  it("bounds a value the database should never have held", () => {
    assert.equal(readGridSettings({ grid_size: 0 }).size, MIN_GRID_SIZE);
    assert.equal(readGridSettings({ grid_luminance: 9 }).luminance, 1);
  });
});
