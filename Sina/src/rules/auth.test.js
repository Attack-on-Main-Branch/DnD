import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkEmail,
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  readSignUpValues,
  validateSignIn,
  validateSignUp,
} from "./auth.js";

function signUpValues(overrides = {}) {
  return {
    displayName: "Elminster",
    email: "el@example.com",
    password: "correct-horse",
    passwordConfirm: "correct-horse",
    ...overrides,
  };
}

describe("validateSignUp", () => {
  it("accepts well-formed values", () => {
    assert.equal(validateSignUp(signUpValues()), null);
  });

  describe("the display name is bounded at BOTH ends", () => {
    // M12: only the floor was enforced here, so sign-up — a public,
    // unauthenticated endpoint — accepted a name the settings form would then
    // refuse to save, stranding the account in a state it could not leave.
    it("rejects a name below the floor", () => {
      const result = validateSignUp(
        signUpValues({ displayName: "a".repeat(MIN_DISPLAY_NAME_LENGTH - 1) }),
      );
      assert.equal(result.field, "displayName");
    });

    it("accepts a name of exactly MAX_DISPLAY_NAME_LENGTH", () => {
      assert.equal(
        validateSignUp(
          signUpValues({ displayName: "a".repeat(MAX_DISPLAY_NAME_LENGTH) }),
        ),
        null,
      );
    });

    it("rejects a name one character past the ceiling", () => {
      const result = validateSignUp(
        signUpValues({ displayName: "a".repeat(MAX_DISPLAY_NAME_LENGTH + 1) }),
      );
      assert.equal(result.field, "displayName");
      assert.match(result.message, /at most/i);
    });

    it("rejects the pathological case an unauthenticated endpoint invites", () => {
      const result = validateSignUp(
        signUpValues({ displayName: "a".repeat(10_000) }),
      );
      assert.equal(result.field, "displayName");
    });
  });

  it("rejects mismatched passwords, and names the confirm field", () => {
    const result = validateSignUp(
      signUpValues({ passwordConfirm: "something-else" }),
    );
    assert.equal(result.field, "passwordConfirm");
  });

  it("rejects a password below the floor", () => {
    const result = validateSignUp(
      signUpValues({
        password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
        passwordConfirm: "a".repeat(MIN_PASSWORD_LENGTH - 1),
      }),
    );
    assert.equal(result.field, "password");
  });

  it("checks the display name before the email, so the first fault reported is the first field", () => {
    const result = validateSignUp(
      signUpValues({ displayName: "x", email: "nonsense" }),
    );
    assert.equal(result.field, "displayName");
  });
});

describe("validateSignIn", () => {
  it("accepts well-formed credentials", () => {
    assert.equal(
      validateSignIn({ email: "el@example.com", password: "correct-horse" }),
      null,
    );
  });

  it("says nothing about whether they are correct — only that they are shaped right", () => {
    assert.equal(
      validateSignIn({
        email: "nobody@example.com",
        password: "wrong-but-long",
      }),
      null,
    );
  });

  it("rejects an empty email distinctly from a malformed one", () => {
    assert.match(
      validateSignIn({ email: "", password: "correct-horse" }).message,
      /enter your email/i,
    );
    assert.match(
      validateSignIn({ email: "not-an-email", password: "correct-horse" })
        .message,
      /valid email/i,
    );
  });
});

describe("checkEmail", () => {
  // L15: this pattern was declared twice, character for character, in the one
  // layer whose entire promise is a single definition. account.js calls this
  // now, so these cases hold for the settings form as well as for sign-up.
  for (const good of [
    "el@example.com",
    "a@b.co",
    "first.last@sub.domain.org",
    "has+plus@example.com",
  ]) {
    it(`accepts ${good}`, () => assert.equal(checkEmail(good), null));
  }

  for (const bad of [
    "",
    "no-at-sign",
    "@example.com",
    "el@",
    "el@example",
    "two @spaces.com",
  ]) {
    it(`rejects ${JSON.stringify(bad)}`, () => {
      const result = checkEmail(bad);
      assert.notEqual(result, null);
      assert.equal(result.field, "email");
    });
  }
});

describe("readSignUpValues", () => {
  function formData(entries) {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.append(key, value);
    return data;
  }

  it("trims the name and email but never the password", () => {
    const values = readSignUpValues(
      formData({
        displayName: "  El  ",
        email: "  el@example.com ",
        password: " spaced ",
      }),
    );
    assert.equal(values.displayName, "El");
    assert.equal(values.email, "el@example.com");
    assert.equal(
      values.password,
      " spaced ",
      "trimming a password would silently change it",
    );
  });

  it("returns empty strings for absent fields", () => {
    const values = readSignUpValues(formData({}));
    assert.deepEqual(values, {
      displayName: "",
      email: "",
      password: "",
      passwordConfirm: "",
    });
  });
});
