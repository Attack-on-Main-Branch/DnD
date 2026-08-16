import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authError, stubAuth } from "../supabase-stub.js";
import { signIn, signOut, signUp } from "./auth.js";

const CREDENTIALS = { email: "el@example.com", password: "correct-horse" };

describe("signIn", () => {
  const cases = [
    ["invalid_credentials", "invalid_credentials"],
    ["email_not_confirmed", "email_not_confirmed"],
    ["over_request_rate_limit", "rate_limited"],
    ["over_email_send_rate_limit", "rate_limited"],
    ["teapot", "unknown"],
  ];

  for (const [code, reason] of cases) {
    it(`maps ${code} to ${reason}`, async () => {
      const supabase = stubAuth({
        signInWithPassword: async () => authError(code),
      });
      const { error } = await signIn(supabase, CREDENTIALS);
      assert.equal(error.reason, reason);
    });
  }

  it("returns success with no error", async () => {
    const supabase = stubAuth({
      signInWithPassword: async () => ({ data: {}, error: null }),
    });
    const { data, error } = await signIn(supabase, CREDENTIALS);
    assert.equal(error, null);
    assert.equal(data, true);
  });
});

describe("signUp", () => {
  it("maps both spellings of an existing account to email_taken", async () => {
    for (const code of ["user_already_exists", "email_exists"]) {
      const supabase = stubAuth({ signUp: async () => authError(code) });
      const { error } = await signUp(supabase, {
        ...CREDENTIALS,
        displayName: "El",
      });
      assert.equal(error.reason, "email_taken");
    }
  });

  it("maps a disabled project", async () => {
    const supabase = stubAuth({
      signUp: async () => authError("signup_disabled"),
    });
    const { error } = await signUp(supabase, {
      ...CREDENTIALS,
      displayName: "El",
    });
    assert.equal(error.reason, "signup_disabled");
  });

  describe("the session tells the caller whether confirmation is switched on", () => {
    it("reports hasSession when Supabase signed the user straight in", async () => {
      const supabase = stubAuth({
        signUp: async () => ({
          data: { session: { access_token: "x" } },
          error: null,
        }),
      });
      const { data, error } = await signUp(supabase, {
        ...CREDENTIALS,
        displayName: "El",
      });
      assert.equal(error, null);
      assert.equal(data.hasSession, true);
    });

    it("reports no session when the account is parked awaiting a link", async () => {
      // Without this the caller redirects to /dashboard, which bounces the user
      // straight back to /login with no explanation at all.
      const supabase = stubAuth({
        signUp: async () => ({ data: { session: null }, error: null }),
      });
      const { data } = await signUp(supabase, {
        ...CREDENTIALS,
        displayName: "El",
      });
      assert.equal(data.hasSession, false);
    });
  });
});

describe("signOut", () => {
  // L17: this used to swallow the error entirely, so a sign-out that cleared
  // the local session but failed to revoke the others — or returned early with
  // the cookies intact — looked identical to one that worked.
  it("returns the tuple rather than undefined", async () => {
    const supabase = stubAuth({ signOut: async () => ({ error: null }) });
    const result = await signOut(supabase);
    assert.equal(typeof result, "object");
    assert.equal(result.error, null);
    assert.equal(result.data, true);
  });

  it("surfaces a failure instead of discarding it", async () => {
    const supabase = stubAuth({
      signOut: async () => authError("teapot", "network down"),
    });
    const { data, error } = await signOut(supabase);
    assert.equal(data, null);
    assert.equal(error.detail, "network down");
  });
});
