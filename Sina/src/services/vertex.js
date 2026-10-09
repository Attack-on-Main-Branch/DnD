/**
 * The scene painter: one Gemini image request on Vertex AI. How the server
 * signs in is google-auth.js's; `fetch` and the Vercel token supplier are
 * passed in, and failures come back as a `reason` code, never Google's words.
 */

import { DEFAULT_VERTEX_IMAGE_MODEL, DEFAULT_VERTEX_LOCATION } from "../env.js";

import {
  forgetGoogleToken,
  googleAccessToken,
  loadApplicationDefault,
  readCredentials,
  vercelFederation,
} from "./google-auth.js";

const DEFAULT_TIMEOUT_MS = 100_000;

function failure(reason, detail = null) {
  return { data: null, error: { reason, detail } };
}

function host(location) {
  return location === "global"
    ? "aiplatform.googleapis.com"
    : `${location}-aiplatform.googleapis.com`;
}

export function vertexEndpoint({ project, location, model }) {
  return (
    `https://${host(location)}/v1/projects/${encodeURIComponent(project)}` +
    `/locations/${encodeURIComponent(location)}/publishers/google/models/` +
    `${encodeURIComponent(model)}:generateContent`
  );
}

/**
 * The painter's settings, signing in by the first of: a service account key,
 * Vercel's Workload Identity Federation, or the gcloud login on this machine.
 * Null when none is set up. Server-only: none of these may ever carry a
 * `NEXT_PUBLIC_` prefix.
 */
export async function vertexPainter({
  env = process.env,
  subjectToken = null,
  readFile,
  platform,
  home,
} = {}) {
  let credentials;

  if (env.VERTEX_SERVICE_ACCOUNT_KEY) {
    credentials = readCredentials(env.VERTEX_SERVICE_ACCOUNT_KEY);
  } else if (
    env.VERTEX_WIF_PROJECT_NUMBER &&
    env.VERTEX_WIF_POOL_ID &&
    env.VERTEX_WIF_PROVIDER_ID &&
    env.VERTEX_SERVICE_ACCOUNT_EMAIL
  ) {
    credentials = vercelFederation({
      projectNumber: env.VERTEX_WIF_PROJECT_NUMBER,
      poolId: env.VERTEX_WIF_POOL_ID,
      providerId: env.VERTEX_WIF_PROVIDER_ID,
      serviceAccountEmail: env.VERTEX_SERVICE_ACCOUNT_EMAIL,
    });
  } else {
    credentials = await loadApplicationDefault({
      readFile,
      env,
      platform,
      home,
    });

    if (!credentials) {
      return null;
    }
  }

  return {
    credentials,
    subjectToken,
    project:
      env.VERTEX_PROJECT_ID ||
      credentials?.project_id ||
      credentials?.quota_project_id ||
      null,
    location: env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION,
    model: env.VERTEX_IMAGE_MODEL || DEFAULT_VERTEX_IMAGE_MODEL,
  };
}

function classifyStatus(status) {
  // An unauthorised account, a missing role, or the API not enabled.
  if (status === 401 || status === 403) {
    return "painter_key";
  }

  if (status === 429) {
    return "painter_busy";
  }

  // An unknown model name, or a request shape this model will not take.
  if (status === 400 || status === 404) {
    return "painter_rejected";
  }

  return "painter_unavailable";
}

function toPart(part) {
  if (typeof part.text === "string") {
    return { text: part.text };
  }

  return { inlineData: { mimeType: part.mimeType, data: part.data } };
}

function findImage(body) {
  for (const candidate of body?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      const inline = part?.inlineData ?? part?.inline_data;

      if (inline?.data) {
        return {
          data: inline.data,
          mimeType: inline.mimeType ?? inline.mime_type ?? "image/png",
        };
      }
    }
  }

  return null;
}

/** `parts` are `{ text }` or `{ mimeType, data }` (base64), in order. */
export async function paintWithVertex({
  credentials,
  subjectToken = null,
  project,
  location,
  model,
  fetch: send = globalThis.fetch,
  systemInstruction,
  parts,
  aspectRatio,
  imageSize,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!credentials || !project || !location || !model) {
    return failure("painter_key", "incomplete Vertex AI settings");
  }

  const { token, error: tokenError } = await googleAccessToken(credentials, {
    fetch: send,
    subjectToken,
  });

  if (tokenError) {
    return { data: null, error: tokenError };
  }

  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };

  // A personal gcloud login is billed to no project unless one is named.
  if (credentials.type === "authorized_user") {
    headers["x-goog-user-project"] = project;
  }

  let response;

  try {
    response = await send(vertexEndpoint({ project, location, model }), {
      method: "POST",
      headers,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: parts.map(toPart) }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio, imageSize },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (thrown) {
    return failure("painter_unavailable", String(thrown));
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      forgetGoogleToken(credentials);
    }

    return failure(
      classifyStatus(response.status),
      body?.error?.message ?? `HTTP ${response.status}`,
    );
  }

  const image = findImage(body);

  if (!image) {
    const why =
      body?.promptFeedback?.blockReason ??
      body?.candidates?.[0]?.finishReason ??
      "no image in the answer";

    return failure("painter_refused", String(why));
  }

  return {
    data: {
      bytes: Buffer.from(image.data, "base64"),
      mimeType: image.mimeType,
    },
    error: null,
  };
}
