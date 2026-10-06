import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { paintWithVertex, vertexEndpoint, vertexPainter } from "./vertex.js";

const PEM = generateKeyPairSync("rsa", {
  modulusLength: 2048,
}).privateKey.export({ type: "pkcs8", format: "pem" });
const PNG = Buffer.from("not really a png").toString("base64");

let made = 0;

/** A fresh login per test, so the token cache never carries across. */
function userLogin() {
  made += 1;

  return {
    type: "authorized_user",
    client_id: "client.apps.googleusercontent.com",
    client_secret: "secret",
    refresh_token: `refresh-${made}`,
  };
}

function serviceAccount() {
  made += 1;

  return {
    type: "service_account",
    client_email: `painter-${made}@trial-project.iam.gserviceaccount.com`,
    private_key: PEM,
    project_id: "trial-project",
  };
}

const PAINTED = {
  candidates: [
    {
      content: {
        parts: [
          { text: "Here you go" },
          { inlineData: { mimeType: "image/png", data: PNG } },
        ],
      },
    },
  ],
};

/** Answers the token request, then each painting with `paint`. */
function google({ paint = [200, PAINTED] } = {}) {
  const calls = [];

  const fetch = async (url, init) => {
    calls.push({ url, init });

    const [status, body] = url.startsWith("https://oauth2.googleapis.com")
      ? [200, { access_token: "ya29.token", expires_in: 3599 }]
      : paint;

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };

  return { fetch, calls };
}

function request(overrides = {}) {
  return {
    credentials: userLogin(),
    project: "trial-project",
    location: "global",
    model: "gemini-3.1-flash-image",
    systemInstruction: "Paint.",
    parts: [{ text: "Hello" }, { mimeType: "image/jpeg", data: "AAAA" }],
    aspectRatio: "16:9",
    imageSize: "2K",
    ...overrides,
  };
}

describe("vertexEndpoint", () => {
  it("uses the global host for the global location", () => {
    assert.equal(
      vertexEndpoint({
        project: "p",
        location: "global",
        model: "gemini-3.1-flash-image",
      }),
      "https://aiplatform.googleapis.com/v1/projects/p/locations/global/publishers/google/models/gemini-3.1-flash-image:generateContent",
    );
  });

  it("uses a regional host for a region", () => {
    assert.match(
      vertexEndpoint({ project: "p", location: "europe-west4", model: "m" }),
      /^https:\/\/europe-west4-aiplatform\.googleapis\.com\/v1\/projects\/p\/locations\/europe-west4\//,
    );
  });
});

describe("paintWithVertex", () => {
  it("paints with the token, never a key in the URL", async () => {
    const { fetch, calls } = google();

    await paintWithVertex({ ...request(), fetch });

    assert.equal(
      calls[1].url,
      vertexEndpoint({
        project: "trial-project",
        location: "global",
        model: "gemini-3.1-flash-image",
      }),
    );
    assert.equal(calls[1].init.headers.authorization, "Bearer ya29.token");
    assert.doesNotMatch(calls[1].url, /key=|token/);
  });

  it("bills a gcloud login to the project, and a service account to its own", async () => {
    const asUser = google();
    const asAccount = google();

    await paintWithVertex({ ...request(), fetch: asUser.fetch });
    await paintWithVertex({
      ...request({ credentials: serviceAccount() }),
      fetch: asAccount.fetch,
    });

    assert.equal(
      asUser.calls[1].init.headers["x-goog-user-project"],
      "trial-project",
    );
    assert.equal(
      asAccount.calls[1].init.headers["x-goog-user-project"],
      undefined,
    );
  });

  it("asks for an image, with the system instruction and the parts in order", async () => {
    const { fetch, calls } = google();

    await paintWithVertex({ ...request(), fetch });

    const body = JSON.parse(calls[1].init.body);

    assert.deepEqual(body.generationConfig.responseModalities, ["IMAGE"]);
    assert.deepEqual(body.generationConfig.imageConfig, {
      aspectRatio: "16:9",
      imageSize: "2K",
    });
    assert.equal(body.systemInstruction.parts[0].text, "Paint.");
    assert.deepEqual(body.contents[0].parts, [
      { text: "Hello" },
      { inlineData: { mimeType: "image/jpeg", data: "AAAA" } },
    ]);
  });

  it("hands back the picture's bytes", async () => {
    const { fetch } = google();

    const { data, error } = await paintWithVertex({ ...request(), fetch });

    assert.equal(error, null);
    assert.equal(data.mimeType, "image/png");
    assert.equal(Buffer.from(data.bytes).toString(), "not really a png");
  });

  it("says so when the settings are incomplete", async () => {
    const { error } = await paintWithVertex(request({ project: null }));

    assert.equal(error.reason, "painter_key");
  });

  const STATUSES = [
    [401, "painter_key"],
    [403, "painter_key"],
    [429, "painter_busy"],
    [400, "painter_rejected"],
    [404, "painter_rejected"],
    [500, "painter_unavailable"],
    [503, "painter_unavailable"],
  ];

  for (const [status, reason] of STATUSES) {
    it(`reads ${status} as ${reason}`, async () => {
      const { fetch } = google({
        paint: [status, { error: { message: "nope" } }],
      });
      const { error } = await paintWithVertex({ ...request(), fetch });

      assert.equal(error.reason, reason);
    });
  }

  it("reads an answer with no picture as a refusal", async () => {
    const { fetch } = google({
      paint: [200, { promptFeedback: { blockReason: "SAFETY" } }],
    });
    const { error } = await paintWithVertex({ ...request(), fetch });

    assert.equal(error.reason, "painter_refused");
    assert.equal(error.detail, "SAFETY");
  });

  it("reads a dropped connection as unavailable", async () => {
    const fetch = async () => {
      throw new Error("socket hang up");
    };

    const { error } = await paintWithVertex({ ...request(), fetch });

    assert.equal(error.reason, "painter_unavailable");
  });
});

describe("vertexPainter", () => {
  const NO_FILE = async () => {
    throw new Error("ENOENT");
  };
  const DISK = { platform: "linux", home: "/home/dm" };
  const FEDERATION = {
    VERTEX_WIF_PROJECT_NUMBER: "123456",
    VERTEX_WIF_POOL_ID: "vercel",
    VERTEX_WIF_PROVIDER_ID: "vercel",
    VERTEX_SERVICE_ACCOUNT_EMAIL:
      "painter@trial-project.iam.gserviceaccount.com",
    VERTEX_PROJECT_ID: "trial-project",
  };

  it("is not set up with nothing to sign in with", async () => {
    assert.equal(
      await vertexPainter({ env: {}, readFile: NO_FILE, ...DISK }),
      null,
    );
  });

  it("uses the gcloud login, billed to its quota project", async () => {
    const painter = await vertexPainter({
      env: {},
      readFile: async () =>
        JSON.stringify({ ...userLogin(), quota_project_id: "trial-project" }),
      ...DISK,
    });

    assert.equal(painter.credentials.type, "authorized_user");
    assert.equal(painter.project, "trial-project");
    assert.equal(painter.location, "global");
    assert.equal(painter.model, "gemini-3.1-flash-image");
  });

  it("prefers a service account key over everything", async () => {
    const painter = await vertexPainter({
      env: {
        ...FEDERATION,
        VERTEX_SERVICE_ACCOUNT_KEY: JSON.stringify(serviceAccount()),
      },
      readFile: async () => JSON.stringify(userLogin()),
      ...DISK,
    });

    assert.equal(painter.credentials.type, "service_account");
  });

  it("prefers Vercel federation over the gcloud login", async () => {
    const supplier = async () => "vercel-oidc";
    const painter = await vertexPainter({
      env: FEDERATION,
      subjectToken: supplier,
      readFile: async () => JSON.stringify(userLogin()),
      ...DISK,
    });

    assert.equal(painter.credentials.type, "vercel_federation");
    assert.equal(painter.subjectToken, supplier);
    assert.equal(painter.project, "trial-project");
  });

  it("lets the environment name the project", async () => {
    const painter = await vertexPainter({
      env: { VERTEX_PROJECT_ID: "other-project" },
      readFile: async () =>
        JSON.stringify({ ...userLogin(), quota_project_id: "trial-project" }),
      ...DISK,
    });

    assert.equal(painter.project, "other-project");
  });
});
