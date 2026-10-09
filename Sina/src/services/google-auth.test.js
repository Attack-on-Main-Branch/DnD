import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import {
  applicationDefaultPath,
  googleAccessToken,
  loadApplicationDefault,
  readCredentials,
  vercelFederation,
} from "./google-auth.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const PEM = privateKey.export({ type: "pkcs8", format: "pem" });

let made = 0;

/** A fresh identity per test, so the token cache never carries across. */
function serviceAccount() {
  made += 1;

  return {
    type: "service_account",
    client_email: `painter-${made}@project.iam.gserviceaccount.com`,
    private_key: PEM,
    project_id: "trial-project",
  };
}

function userLogin() {
  made += 1;

  return {
    type: "authorized_user",
    client_id: "client.apps.googleusercontent.com",
    client_secret: "secret",
    refresh_token: `refresh-${made}`,
    quota_project_id: "trial-project",
  };
}

function federation() {
  made += 1;

  return vercelFederation({
    projectNumber: "123456",
    poolId: "vercel",
    providerId: `vercel-${made}`,
    serviceAccountEmail: "painter@trial-project.iam.gserviceaccount.com",
  });
}

/** Answers each URL from a table of `[status, body]`. */
function google(routes) {
  const calls = [];

  const fetch = async (url, init) => {
    calls.push({ url, init });

    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    const [status, body] = routes[key] ?? [404, null];

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };

  return { fetch, calls };
}

const OAUTH = "https://oauth2.googleapis.com/token";
const STS = "https://sts.googleapis.com/v1/token";
const IAM = "https://iamcredentials.googleapis.com/";

describe("readCredentials", () => {
  it("reads a service account key, as JSON or base64", () => {
    const key = serviceAccount();

    assert.equal(readCredentials(JSON.stringify(key)).type, "service_account");
    assert.equal(
      readCredentials(Buffer.from(JSON.stringify(key)).toString("base64"))
        .client_email,
      key.client_email,
    );
  });

  it("reads a gcloud user login", () => {
    assert.equal(
      readCredentials(JSON.stringify(userLogin())).type,
      "authorized_user",
    );
  });

  it("refuses anything else", () => {
    assert.equal(readCredentials(""), null);
    assert.equal(readCredentials("not json"), null);
    assert.equal(readCredentials('{"type":"external_account"}'), null);
    assert.equal(readCredentials('{"type":"authorized_user"}'), null);
  });
});

describe("applicationDefaultPath", () => {
  it("prefers GOOGLE_APPLICATION_CREDENTIALS", () => {
    assert.equal(
      applicationDefaultPath({
        env: { GOOGLE_APPLICATION_CREDENTIALS: "/keys/adc.json" },
        platform: "win32",
        home: "/home/dm",
      }),
      "/keys/adc.json",
    );
  });

  it("looks under APPDATA on Windows", () => {
    assert.equal(
      applicationDefaultPath({
        env: { APPDATA: "C:\\Users\\dm\\AppData\\Roaming" },
        platform: "win32",
        home: "C:\\Users\\dm",
      }),
      "C:\\Users\\dm\\AppData\\Roaming\\gcloud\\application_default_credentials.json",
    );
  });

  it("looks under ~/.config elsewhere", () => {
    assert.equal(
      applicationDefaultPath({ env: {}, platform: "linux", home: "/home/dm" }),
      "/home/dm/.config/gcloud/application_default_credentials.json",
    );
  });
});

describe("loadApplicationDefault", () => {
  it("reads the gcloud login it finds", async () => {
    const login = userLogin();

    const credentials = await loadApplicationDefault({
      env: {},
      platform: "linux",
      home: "/home/dm",
      readFile: async () => JSON.stringify(login),
    });

    assert.equal(credentials.refresh_token, login.refresh_token);
  });

  it("answers null when there is none", async () => {
    const credentials = await loadApplicationDefault({
      env: {},
      platform: "linux",
      home: "/home/dm",
      readFile: async () => {
        throw new Error("ENOENT");
      },
    });

    assert.equal(credentials, null);
  });
});

describe("googleAccessToken, as a service account", () => {
  it("trades a signed assertion for a token", async () => {
    const key = serviceAccount();
    const { fetch, calls } = google({
      [OAUTH]: [200, { access_token: "ya29.sa", expires_in: 3599 }],
    });

    const { token } = await googleAccessToken(key, { fetch });

    const form = new URLSearchParams(calls[0].init.body);
    const [header, claims, signature] = form.get("assertion").split(".");
    const said = JSON.parse(Buffer.from(claims, "base64url").toString());

    assert.equal(token, "ya29.sa");
    assert.equal(
      form.get("grant_type"),
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
    );
    assert.equal(said.iss, key.client_email);
    assert.equal(said.scope, "https://www.googleapis.com/auth/cloud-platform");
    assert.ok(
      createVerify("RSA-SHA256")
        .update(`${header}.${claims}`)
        .verify(publicKey, signature, "base64url"),
    );
  });

  it("reads an unsignable key as a set-up problem, before any request", async () => {
    const { fetch, calls } = google({});

    const { error } = await googleAccessToken(
      { type: "service_account", client_email: "x@y", private_key: "no" },
      { fetch },
    );

    assert.equal(error.reason, "painter_key");
    assert.equal(calls.length, 0);
  });
});

describe("googleAccessToken, as a gcloud login", () => {
  it("refreshes, then reuses the token", async () => {
    const login = userLogin();
    const { fetch, calls } = google({
      [OAUTH]: [200, { access_token: "ya29.user", expires_in: 3599 }],
    });

    const first = await googleAccessToken(login, { fetch });
    const second = await googleAccessToken(login, { fetch });

    const form = new URLSearchParams(calls[0].init.body);

    assert.equal(first.token, "ya29.user");
    assert.equal(second.token, "ya29.user");
    assert.equal(calls.length, 1);
    assert.equal(form.get("grant_type"), "refresh_token");
    assert.equal(form.get("refresh_token"), login.refresh_token);
    assert.equal(form.get("client_id"), login.client_id);
  });

  it("reads an expired login as one to sign in again", async () => {
    const { fetch } = google({
      [OAUTH]: [
        400,
        {
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        },
      ],
    });

    const { error } = await googleAccessToken(userLogin(), { fetch });

    assert.equal(error.reason, "painter_login");
  });

  it("reads a Google outage as unavailable", async () => {
    const { fetch } = google({ [OAUTH]: [503, null] });

    const { error } = await googleAccessToken(userLogin(), { fetch });

    assert.equal(error.reason, "painter_unavailable");
  });
});

describe("googleAccessToken, through Vercel federation", () => {
  it("exchanges the OIDC token, then acts as the service account", async () => {
    const credentials = federation();
    const { fetch, calls } = google({
      [STS]: [200, { access_token: "federated", expires_in: 3600 }],
      [IAM]: [
        200,
        {
          accessToken: "ya29.wif",
          expireTime: new Date(Date.now() + 3600_000).toISOString(),
        },
      ],
    });

    const { token } = await googleAccessToken(credentials, {
      fetch,
      subjectToken: async () => "vercel-oidc",
    });

    const exchange = new URLSearchParams(calls[0].init.body);

    assert.equal(token, "ya29.wif");
    assert.equal(calls[0].url, STS);
    assert.equal(
      exchange.get("grant_type"),
      "urn:ietf:params:oauth:grant-type:token-exchange",
    );
    assert.equal(exchange.get("subject_token"), "vercel-oidc");
    assert.equal(
      exchange.get("subject_token_type"),
      "urn:ietf:params:oauth:token-type:jwt",
    );
    assert.match(
      exchange.get("audience"),
      /^\/\/iam\.googleapis\.com\/projects\/123456\/locations\/global\/workloadIdentityPools\/vercel\/providers\//,
    );
    assert.equal(
      calls[1].url,
      "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/painter%40trial-project.iam.gserviceaccount.com:generateAccessToken",
    );
    assert.equal(calls[1].init.headers.authorization, "Bearer federated");
  });

  it("reads a missing OIDC token as a set-up problem", async () => {
    const { fetch, calls } = google({});

    const { error } = await googleAccessToken(federation(), {
      fetch,
      subjectToken: async () => {
        throw new Error("no token outside Vercel");
      },
    });

    assert.equal(error.reason, "painter_key");
    assert.equal(calls.length, 0);
  });

  it("reads a refused exchange as a set-up problem", async () => {
    const { fetch } = google({ [STS]: [400, { error: "invalid_target" }] });

    const { error } = await googleAccessToken(federation(), {
      fetch,
      subjectToken: async () => "vercel-oidc",
    });

    assert.equal(error.reason, "painter_key");
  });

  it("reads an IAM outage as unavailable", async () => {
    const { fetch } = google({
      [STS]: [200, { access_token: "federated" }],
      [IAM]: [503, null],
    });

    const { error } = await googleAccessToken(federation(), {
      fetch,
      subjectToken: async () => "vercel-oidc",
    });

    assert.equal(error.reason, "painter_unavailable");
  });
});
