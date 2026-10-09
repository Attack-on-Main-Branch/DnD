/**
 * Signing in to Google Cloud as the server, three ways: a service account's
 * JSON key, the developer's own `gcloud auth application-default login`, or
 * Vercel's OIDC token traded through Workload Identity Federation. Failures
 * come back as a `reason` code.
 */

import { createHash, createSign } from "node:crypto";
import { readFile as readFromDisk } from "node:fs/promises";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const STS_URL = "https://sts.googleapis.com/v1/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

const TOKEN_LIFETIME_S = 3600;

/** A token this close to expiring is not reused. */
const TOKEN_MARGIN_MS = 5 * 60 * 1000;
const TOKEN_TIMEOUT_MS = 15_000;

/** The server's own credentials, never a user's, so per instance is right. */
const cache = new Map();

/**
 * A service account key or a gcloud user login, as JSON or base64-encoded
 * JSON. Null for anything else.
 */
export function readCredentials(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  let parsed;

  try {
    parsed = JSON.parse(
      text.startsWith("{")
        ? text
        : Buffer.from(text, "base64").toString("utf8"),
    );
  } catch {
    return null;
  }

  if (
    typeof parsed?.client_email === "string" &&
    typeof parsed?.private_key === "string" &&
    (parsed.type ?? "service_account") === "service_account"
  ) {
    return { ...parsed, type: "service_account" };
  }

  if (
    parsed?.type === "authorized_user" &&
    typeof parsed.client_id === "string" &&
    typeof parsed.client_secret === "string" &&
    typeof parsed.refresh_token === "string"
  ) {
    return parsed;
  }

  return null;
}

export function vercelFederation({
  projectNumber,
  poolId,
  providerId,
  serviceAccountEmail,
}) {
  return {
    type: "vercel_federation",
    audience:
      `//iam.googleapis.com/projects/${projectNumber}/locations/global/` +
      `workloadIdentityPools/${poolId}/providers/${providerId}`,
    serviceAccountEmail,
  };
}

/** Where Google's own libraries look for Application Default Credentials. */
export function applicationDefaultPath({ env, platform, home }) {
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (platform === "win32") {
    return env.APPDATA
      ? win32.join(
          env.APPDATA,
          "gcloud",
          "application_default_credentials.json",
        )
      : null;
  }

  return posix.join(
    home,
    ".config",
    "gcloud",
    "application_default_credentials.json",
  );
}

export async function loadApplicationDefault({
  readFile = (path) => readFromDisk(path, "utf8"),
  env = process.env,
  platform = process.platform,
  home = homedir(),
} = {}) {
  const path = applicationDefaultPath({ env, platform, home });

  if (!path) {
    return null;
  }

  try {
    return readCredentials(await readFile(path));
  } catch {
    return null;
  }
}

function identity(credentials) {
  switch (credentials.type) {
    case "service_account":
      return `sa:${credentials.client_email}`;
    case "authorized_user":
      return `user:${createHash("sha256").update(credentials.refresh_token).digest("hex")}`;
    default:
      return `wif:${credentials.audience}:${credentials.serviceAccountEmail}`;
  }
}

export function forgetGoogleToken(credentials) {
  if (credentials) {
    cache.delete(identity(credentials));
  }
}

function problem(reason, detail) {
  return { error: { reason, detail: detail ? String(detail) : null } };
}

async function post(send, url, { headers, body }) {
  try {
    const response = await send(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    });

    return { response, body: await response.json().catch(() => null) };
  } catch (thrown) {
    return { thrown };
  }
}

function refused({ response, body }, { login = false } = {}) {
  const detail =
    body?.error_description ??
    body?.error?.message ??
    body?.error ??
    `HTTP ${response.status}`;

  if (response.status >= 500) {
    return problem("painter_unavailable", detail);
  }

  // An expired or revoked gcloud login: signing in again is the fix.
  if (login && body?.error === "invalid_grant") {
    return problem("painter_login", detail);
  }

  return problem("painter_key", detail);
}

const FORM = { "content-type": "application/x-www-form-urlencoded" };

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function serviceAccountToken(credentials, send) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    `${encode({ alg: "RS256", typ: "JWT" })}.` +
    encode({
      iss: credentials.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + TOKEN_LIFETIME_S,
    });

  let signature;

  try {
    signature = createSign("RSA-SHA256")
      .update(unsigned)
      .sign(credentials.private_key, "base64url");
  } catch (thrown) {
    return problem("painter_key", thrown);
  }

  const answer = await post(send, TOKEN_URL, {
    headers: FORM,
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }).toString(),
  });

  return oauthAnswer(answer);
}

async function userToken(credentials, send) {
  const answer = await post(send, TOKEN_URL, {
    headers: FORM,
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    }).toString(),
  });

  return oauthAnswer(answer, { login: true });
}

function oauthAnswer(answer, options) {
  if (answer.thrown) {
    return problem("painter_unavailable", answer.thrown);
  }

  if (!answer.response.ok || typeof answer.body?.access_token !== "string") {
    return refused(answer, options);
  }

  return {
    token: answer.body.access_token,
    expiresAt:
      Date.now() + Number(answer.body.expires_in ?? TOKEN_LIFETIME_S) * 1000,
  };
}

/** Vercel's OIDC token → a federated token from STS → the service account's. */
async function federatedToken(credentials, send, subjectToken) {
  if (typeof subjectToken !== "function") {
    return problem("painter_key", "no Vercel OIDC token supplier");
  }

  let subject;

  try {
    subject = await subjectToken();
  } catch (thrown) {
    return problem("painter_key", thrown);
  }

  if (!subject) {
    return problem("painter_key", "no Vercel OIDC token");
  }

  const exchanged = await post(send, STS_URL, {
    headers: FORM,
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: credentials.audience,
      scope: SCOPE,
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token: subject,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    }).toString(),
  });

  if (exchanged.thrown) {
    return problem("painter_unavailable", exchanged.thrown);
  }

  if (
    !exchanged.response.ok ||
    typeof exchanged.body?.access_token !== "string"
  ) {
    return refused(exchanged);
  }

  const impersonated = await post(
    send,
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
      `${encodeURIComponent(credentials.serviceAccountEmail)}:generateAccessToken`,
    {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${exchanged.body.access_token}`,
      },
      body: JSON.stringify({
        scope: [SCOPE],
        lifetime: `${TOKEN_LIFETIME_S}s`,
      }),
    },
  );

  if (impersonated.thrown) {
    return problem("painter_unavailable", impersonated.thrown);
  }

  if (
    !impersonated.response.ok ||
    typeof impersonated.body?.accessToken !== "string"
  ) {
    return refused(impersonated);
  }

  return {
    token: impersonated.body.accessToken,
    expiresAt:
      Date.parse(impersonated.body.expireTime) ||
      Date.now() + TOKEN_LIFETIME_S * 1000,
  };
}

/** `{ token }`, or `{ error: { reason, detail } }`. */
export async function googleAccessToken(
  credentials,
  { fetch: send = globalThis.fetch, subjectToken = null } = {},
) {
  if (!credentials) {
    return problem("painter_key", "no Google credentials");
  }

  const key = identity(credentials);
  const standing = cache.get(key);

  if (standing && standing.expiresAt - TOKEN_MARGIN_MS > Date.now()) {
    return { token: standing.token };
  }

  const minted =
    credentials.type === "service_account"
      ? await serviceAccountToken(credentials, send)
      : credentials.type === "authorized_user"
        ? await userToken(credentials, send)
        : await federatedToken(credentials, send, subjectToken);

  if (minted.error) {
    return minted;
  }

  cache.set(key, { token: minted.token, expiresAt: minted.expiresAt });

  return { token: minted.token };
}
