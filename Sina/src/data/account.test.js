import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authError, stubAuth } from "../supabase-stub.js";
import {
  setDisplayName,
  setEmail,
  setPassword,
  verifyPassword,
} from "./account.js";

const CREDENTIALS = { email: "el@example.com", password: "correct-horse" };

function signInReturning(result) {
  return stubAuth({ signInWithPassword: async () => result });
}

function updateReturning(result) {
  return stubAuth({ updateUser: async () => result });
}

describe("verifyPassword", () => {
  // M2: this returned a bare boolean, so every failure — rate limits, 5xx,
  // unconfirmed email — reached the user as "that password is not correct",
  // which is the one reply guaranteed to make somebody retry into the wall.
  it("returns a tuple, not a boolean", async () => {
    const result = await verifyPassword(
      signInReturning({ data: {}, error: null }),
      CREDENTIALS,
    );
    assert.equal(typeof result, "object");
    assert.equal(result.error, null);
    assert.equal(result.data, true);
  });

  it("distinguishes a wrong password from everything else", async () => {
    const { error } = await verifyPassword(
      signInReturning(authError("invalid_credentials")),
      CREDENTIALS,
    );
    assert.equal(error.reason, "invalid_credentials");
  });

  it("reports a rate limit as a rate limit", async () => {
    for (const code of [
      "over_request_rate_limit",
      "over_email_send_rate_limit",
    ]) {
      const { error } = await verifyPassword(
        signInReturning(authError(code)),
        CREDENTIALS,
      );
      assert.equal(
        error.reason,
        "rate_limited",
        `${code} should be rate_limited`,
      );
    }
  });

  it("reports an unconfirmed email as such", async () => {
    // Re-authentication hits the same endpoint the login form does, so it can
    // come back the same way. Without a case here, a user with a correct
    // password was told it was wrong, forever.
    const { error } = await verifyPassword(
      signInReturning(authError("email_not_confirmed")),
      CREDENTIALS,
    );
    assert.equal(error.reason, "email_not_confirmed");
  });

  it("does not claim a wrong password for a failure it cannot classify", async () => {
    const { error } = await verifyPassword(
      signInReturning(authError("teapot")),
      CREDENTIALS,
    );
    assert.equal(error.reason, "unknown");
    assert.notEqual(error.reason, "invalid_credentials");
  });
});

describe("setEmail", () => {
  it("reports the change as applied when Supabase returns the new address", async () => {
    const { data, error } = await setEmail(
      updateReturning({
        data: { user: { email: "new@example.com" } },
        error: null,
      }),
      "new@example.com",
    );
    assert.equal(error, null);
    assert.equal(data.applied, true);
  });

  it("reports it as pending when confirmation is switched on and the old address comes back", async () => {
    const { data } = await setEmail(
      updateReturning({
        data: { user: { email: "old@example.com" } },
        error: null,
      }),
      "new@example.com",
    );
    assert.equal(data.applied, false);
  });

  it("classifies a taken address", async () => {
    for (const code of ["email_exists", "user_already_exists"]) {
      const { error } = await setEmail(
        updateReturning(authError(code)),
        "taken@example.com",
      );
      assert.equal(error.reason, "email_taken");
    }
  });

  it("classifies an address Supabase itself rejects", async () => {
    const { error } = await setEmail(
      updateReturning(authError("email_address_invalid")),
      "nope@nope",
    );
    assert.equal(error.reason, "email_invalid");
  });
});

describe("setPassword", () => {
  it("classifies a weak password", async () => {
    const { error } = await setPassword(
      updateReturning(authError("weak_password")),
      "12345678",
    );
    assert.equal(error.reason, "weak_password");
  });

  it("classifies a password unchanged from the current one", async () => {
    const { error } = await setPassword(
      updateReturning(authError("same_password")),
      "same",
    );
    assert.equal(error.reason, "same_password");
  });

  it("returns success cleanly", async () => {
    const { data, error } = await setPassword(
      updateReturning({ data: { user: {} }, error: null }),
      "brand-new-password",
    );
    assert.equal(error, null);
    assert.equal(data, true);
  });
});

describe("setDisplayName", () => {
  it("classifies the rate limit the settings action now has copy for", async () => {
    const { error } = await setDisplayName(
      updateReturning(authError("over_request_rate_limit")),
      "Elminster",
    );
    assert.equal(error.reason, "rate_limited");
  });

  it("returns success cleanly", async () => {
    const { data, error } = await setDisplayName(
      updateReturning({ data: { user: {} }, error: null }),
      "Elminster",
    );
    assert.equal(error, null);
    assert.equal(data, true);
  });
});
