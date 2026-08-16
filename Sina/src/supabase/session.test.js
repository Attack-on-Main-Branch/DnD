import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTHENTICATED_HOME,
  authCouldNotAnswer,
  isPublicRoute,
  resolveRedirect,
  SIGNED_OUT_HOME,
} from "./session.js";

describe("authCouldNotAnswer", () => {
  it("says no when there is no error at all", () => {
    assert.equal(authCouldNotAnswer(null), false);
    assert.equal(authCouldNotAnswer(undefined), false);
  });

  describe("a 4xx is auth answering, and the answer is no", () => {
    for (const status of [400, 401, 403, 404, 422, 499]) {
      it(`${status} means sign in again`, () => {
        assert.equal(authCouldNotAnswer({ status }), false);
      });
    }
  });

  describe("everything else means it could not answer", () => {
    // The one that mattered. @supabase/auth-js reports every transport failure
    // — DNS, ECONNREFUSED, reset, TLS, timeout, abort — as an
    // AuthRetryableFetchError carrying status 0, NOT as an error with no
    // status. A plain `status < 500` therefore counted the most common outage
    // as auth saying no, and the visitor was told their session had expired.
    it("0 is a transport failure, not a status below 500", () => {
      assert.equal(authCouldNotAnswer({ status: 0 }), true);
    });

    for (const status of [500, 502, 503, 504, 520]) {
      it(`${status} is the service failing`, () => {
        assert.equal(authCouldNotAnswer({ status }), true);
      });
    }

    it("treats a missing status as unknown rather than as a no", () => {
      assert.equal(authCouldNotAnswer({ message: "boom" }), true);
    });

    it("does not accept a numeric-looking string as a status", () => {
      assert.equal(authCouldNotAnswer({ status: "401" }), true);
    });
  });
});

describe("resolveRedirect", () => {
  it("sends a signed-out visitor away from a private route", () => {
    assert.equal(
      resolveRedirect({ pathname: "/dashboard", isSignedIn: false }),
      SIGNED_OUT_HOME,
    );
  });

  it("sends a signed-in visitor away from the sign-in page", () => {
    assert.equal(
      resolveRedirect({ pathname: "/login", isSignedIn: true }),
      AUTHENTICATED_HOME,
    );
  });

  it("lets a signed-in visitor through to a private route", () => {
    assert.equal(
      resolveRedirect({ pathname: "/dashboard", isSignedIn: true }),
      null,
    );
  });

  describe("when auth could not answer", () => {
    // Redirecting here would be a diagnosis, and the wrong one: the visitor
    // signs in, comes back, and is bounced again, with nothing logged. Letting
    // the request through hands the decision to the page, which verifies for
    // itself and can say what is actually wrong.
    it("does not send a private route to /login", () => {
      assert.equal(
        resolveRedirect({
          pathname: "/dashboard",
          isSignedIn: false,
          authUnavailable: true,
        }),
        null,
      );
    });

    it("holds for nested private routes too", () => {
      assert.equal(
        resolveRedirect({
          pathname: "/dashboard/settings",
          isSignedIn: false,
          authUnavailable: true,
        }),
        null,
      );
    });

    it("still routes the doorway, which has no page to fall through to", () => {
      assert.equal(
        resolveRedirect({
          pathname: "/",
          isSignedIn: false,
          authUnavailable: true,
        }),
        SIGNED_OUT_HOME,
      );
    });

    it("leaves the sign-in page reachable", () => {
      assert.equal(
        resolveRedirect({
          pathname: "/login",
          isSignedIn: false,
          authUnavailable: true,
        }),
        null,
      );
    });
  });

  it("defaults to answering as though auth replied", () => {
    // The flag is optional, so every existing caller keeps its behaviour.
    assert.equal(
      resolveRedirect({ pathname: "/dashboard", isSignedIn: false }),
      SIGNED_OUT_HOME,
    );
  });
});

describe("isPublicRoute", () => {
  it("covers the sign-in page and anything under it", () => {
    assert.equal(isPublicRoute("/login"), true);
    assert.equal(isPublicRoute("/login/reset"), true);
  });

  it("does not let a lookalike prefix through", () => {
    assert.equal(isPublicRoute("/loginish"), false);
    assert.equal(isPublicRoute("/dashboard"), false);
  });
});
