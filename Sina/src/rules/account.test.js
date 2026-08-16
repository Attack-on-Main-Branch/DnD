import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_DISPLAY_NAME_LENGTH as AUTH_MAX } from "./auth.js";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  readPasswordValues,
  validateEmailChange,
  validatePasswordChange,
  validateUsername,
} from "./account.js";

describe("the re-exports the settings forms depend on", () => {
  // M12 moved these to auth.js. username-form.jsx imports them from HERE, so
  // the re-export is load-bearing — dropping it is a runtime failure that no
  // amount of reading auth.js would reveal.
  it("still resolves through account.js", () => {
    assert.equal(typeof MAX_DISPLAY_NAME_LENGTH, "number");
    assert.equal(typeof MIN_DISPLAY_NAME_LENGTH, "number");
    assert.equal(typeof MIN_PASSWORD_LENGTH, "number");
  });

  it("is the same value auth.js enforces, not a second copy", () => {
    assert.equal(MAX_DISPLAY_NAME_LENGTH, AUTH_MAX);
  });
});

describe("validateUsername", () => {
  it("accepts a name inside the bounds", () => {
    assert.equal(validateUsername({ displayName: "Elminster" }), null);
  });

  it("accepts exactly the floor and exactly the ceiling", () => {
    assert.equal(
      validateUsername({ displayName: "a".repeat(MIN_DISPLAY_NAME_LENGTH) }),
      null,
    );
    assert.equal(
      validateUsername({ displayName: "a".repeat(MAX_DISPLAY_NAME_LENGTH) }),
      null,
    );
  });

  it("rejects one either side", () => {
    assert.equal(
      validateUsername({ displayName: "a".repeat(MIN_DISPLAY_NAME_LENGTH - 1) })
        .field,
      "displayName",
    );
    assert.equal(
      validateUsername({ displayName: "a".repeat(MAX_DISPLAY_NAME_LENGTH + 1) })
        .field,
      "displayName",
    );
  });
});

describe("validateEmailChange", () => {
  it("accepts a valid address with a password supplied", () => {
    assert.equal(
      validateEmailChange({
        email: "new@example.com",
        currentPassword: "correct-horse",
      }),
      null,
    );
  });

  it("uses the shared email rule, so it rejects what sign-up rejects", () => {
    // The whole point of L15: these two can no longer disagree.
    assert.equal(
      validateEmailChange({ email: "not-an-email", currentPassword: "x" })
        .field,
      "email",
    );
    assert.equal(
      validateEmailChange({ email: "", currentPassword: "x" }).field,
      "email",
    );
  });

  it("requires the current password, and says which field is missing", () => {
    const result = validateEmailChange({
      email: "new@example.com",
      currentPassword: "",
    });
    assert.equal(result.field, "currentPassword");
  });

  it("reports the malformed email before the missing password", () => {
    const result = validateEmailChange({
      email: "nonsense",
      currentPassword: "",
    });
    assert.equal(result.field, "email");
  });
});

describe("validatePasswordChange", () => {
  const valid = {
    currentPassword: "old-password",
    newPassword: "new-password",
    confirmPassword: "new-password",
  };

  it("accepts a well-formed change", () => {
    assert.equal(validatePasswordChange(valid), null);
  });

  it("requires the current password first", () => {
    assert.equal(
      validatePasswordChange({ ...valid, currentPassword: "" }).field,
      "currentPassword",
    );
  });

  it("rejects a new password below the floor", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const result = validatePasswordChange({
      ...valid,
      newPassword: short,
      confirmPassword: short,
    });
    assert.equal(result.field, "newPassword");
  });

  it("rejects a new password identical to the current one", () => {
    const result = validatePasswordChange({
      currentPassword: "same-password",
      newPassword: "same-password",
      confirmPassword: "same-password",
    });
    assert.equal(result.field, "newPassword");
    assert.match(result.message, /differ/i);
  });

  it("rejects a mismatched confirmation", () => {
    const result = validatePasswordChange({
      ...valid,
      confirmPassword: "something-else",
    });
    assert.equal(result.field, "confirmPassword");
  });
});

describe("readPasswordValues", () => {
  it("never trims — a password is taken exactly as typed", () => {
    const data = new FormData();
    data.append("currentPassword", " old ");
    data.append("newPassword", " new ");
    data.append("confirmPassword", " new ");

    assert.deepEqual(readPasswordValues(data), {
      currentPassword: " old ",
      newPassword: " new ",
      confirmPassword: " new ",
    });
  });
});
