import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stubQuery, postgrestError } from "../supabase-stub.js";
import {
  readItemDocument,
  prepareItemDocumentUpload,
  readItemDocumentUpload,
  removeItemDocumentUpload,
  cleanupItemDocuments,
  listPendingItemDocumentCleanup,
} from "./item-documents.js";
import {
  insertCampaignItem,
  updateCampaignItem,
  listCampaignItems,
  grantInventoryItem,
  transferInventoryItem,
  rewriteCampaignItemCopies,
} from "./inventory.js";

const CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
const DOCUMENT = "6f1c3d2e-0000-4000-8000-0000000000dc";
const ITEM = {
  name: "Letter",
  slug: "custom:letter",
  category: "Equipment",
  facts: { documentId: DOCUMENT },
};
const FILE = { name: "letter.html", html: "<p>Meet at midnight.</p>" };

describe("item document cleanup", () => {
  it("only reads pending IDs from the requested campaign", async () => {
    const query = stubQuery({ data: [{ id: DOCUMENT }], error: null });
    await listPendingItemDocumentCleanup(query, CAMPAIGN);
    assert.equal(query.lastSelect, "id");
    assert.deepEqual(query.filters, [
      ["campaign_id", CAMPAIGN],
      ["cleanup_pending", true],
    ]);
    assert.equal(query.lastLimit, 1);
  });

  it("deletes physical files before their records and drains every batch", async () => {
    const calls = [];
    let prepared = false;
    const client = {
      rpc: async (name, params) => {
        assert.equal(params.p_campaign_id, CAMPAIGN);
        calls.push(name);
        if (name === "finish_item_document_cleanup") {
          assert.deepEqual(params.p_document_ids, [DOCUMENT, "legacy"]);
          return { data: 2, error: null };
        }
        const data = prepared
          ? []
          : [
              { id: DOCUMENT, is_stored: true },
              { id: "legacy", is_stored: false },
            ];
        prepared = true;
        return { data, error: null };
      },
      storage: {
        from: (bucket) => {
          assert.equal(bucket, "item-documents");
          return {
            remove: async (paths) => {
              calls.push("storage/remove");
              assert.deepEqual(paths, [`${CAMPAIGN}/${DOCUMENT}.html`]);
              return { error: null };
            },
          };
        },
      },
    };
    assert.deepEqual(await cleanupItemDocuments(client, CAMPAIGN), {
      data: { removed: 2 },
      error: null,
    });
    assert.deepEqual(calls, [
      "prepare_item_document_cleanup",
      "storage/remove",
      "finish_item_document_cleanup",
      "prepare_item_document_cleanup",
    ]);
  });

  it("keeps the cleanup queued when storage fails and allows a later retry", async () => {
    let fail = true;
    let pending = true;
    let finished = false;
    const client = {
      rpc: async (name) => {
        if (name === "finish_item_document_cleanup") {
          finished = true;
          pending = false;
          return { data: 1, error: null };
        }
        return {
          data: pending ? [{ id: DOCUMENT, is_stored: true }] : [],
          error: null,
        };
      },
      storage: {
        from: () => ({
          remove: async () => ({
            error: fail ? { message: "storage offline" } : null,
          }),
        }),
      },
    };
    assert.equal(
      (await cleanupItemDocuments(client, CAMPAIGN)).error.reason,
      "cleanup_failed",
    );
    assert.equal(finished, false);
    fail = false;
    assert.equal((await cleanupItemDocuments(client, CAMPAIGN)).error, null);
    assert.equal(finished, true);
  });

  it("does not loop forever or claim success when finalization fails", async () => {
    let calls = 0;
    const client = {
      rpc: async (name) => {
        calls += 1;
        return {
          data:
            name === "prepare_item_document_cleanup"
              ? [{ id: DOCUMENT, is_stored: false }]
              : 0,
          error: null,
        };
      },
    };
    assert.equal(
      (await cleanupItemDocuments(client, CAMPAIGN)).error.reason,
      "cleanup_failed",
    );
    assert.equal(calls, 2);
  });
});

function storageQuery(query, result) {
  const calls = [];
  const storage = {
    createSignedUploadUrl: async (path) => {
      calls.push(["upload", path]);
      return result;
    },
    createSignedUrl: async (path, seconds) => {
      calls.push(["read", path, seconds]);
      return result;
    },
    download: async (path) => {
      calls.push(["download", path]);
      return result;
    },
    remove: async (paths) => {
      calls.push(["remove", paths]);
      return result;
    },
  };
  query.storage = {
    from: (bucket) => {
      assert.equal(bucket, "item-documents");
      return storage;
    },
  };
  return { query, calls };
}

describe("private document storage", () => {
  it("issues a narrowly scoped upload URL under the campaign", async () => {
    const { query, calls } = storageQuery(
      {},
      { data: { signedUrl: "https://storage.example/upload" }, error: null },
    );
    const { data, error } = await prepareItemDocumentUpload(query, CAMPAIGN);
    assert.equal(error, null);
    assert.match(data.path, new RegExp(`^${CAMPAIGN}/[0-9a-f-]{36}\\.html$`));
    assert.equal(data.url, "https://storage.example/upload");
    assert.deepEqual(calls, [["upload", data.path]]);
    assert.equal(
      (await prepareItemDocumentUpload({}, "invalid")).error.reason,
      "document_upload_failed",
    );
  });

  it("returns a short-lived download URL instead of putting large files in the app response", async () => {
    const { query, calls } = storageQuery(
      stubQuery({
        data: {
          id: DOCUMENT,
          campaign_id: CAMPAIGN,
          name: FILE.name,
          html: "",
          is_stored: true,
        },
        error: null,
      }),
      { data: { signedUrl: "https://storage.example/download" }, error: null },
    );
    assert.deepEqual((await readItemDocument(query, DOCUMENT)).data, {
      name: FILE.name,
      url: "https://storage.example/download",
    });
    assert.deepEqual(calls, [["read", `${CAMPAIGN}/${DOCUMENT}.html`, 60]]);
  });

  it("validates the actual uploaded bytes through the server's authenticated connection", async () => {
    const blob = new Blob([FILE.html]);
    const { query, calls } = storageQuery({}, { data: blob, error: null });
    assert.equal((await readItemDocumentUpload(query, "path")).data, blob);
    assert.deepEqual(calls, [["download", "path"]]);
  });

  it("discards unsuccessful uploads without exposing storage errors", async () => {
    const { query, calls } = storageQuery({}, { data: null, error: null });
    assert.equal((await removeItemDocumentUpload(query, "path")).error, null);
    assert.deepEqual(calls, [["remove", ["path"]]]);
    const failed = storageQuery(
      {},
      { data: null, error: { statusCode: "404", message: "private detail" } },
    );
    assert.deepEqual(
      (await readItemDocumentUpload(failed.query, "path")).error,
      { reason: "document_missing", detail: "private detail" },
    );
  });
});

describe("item document reads", () => {
  it("only reads contents by id, behind RLS", async () => {
    const query = stubQuery({ data: FILE, error: null });
    assert.deepEqual((await readItemDocument(query, DOCUMENT)).data, FILE);
    assert.equal(query.lastSelect, "id, campaign_id, name, html, is_stored");
    assert.deepEqual(query.filters, [["id", DOCUMENT]]);
  });

  it("treats a hidden document exactly like a missing document", async () => {
    assert.equal(
      (await readItemDocument(stubQuery({ data: null, error: null }), DOCUMENT))
        .error.reason,
      "not_found",
    );
  });

  it("keeps database failure messages out of user-facing reasons", async () => {
    const { error } = await readItemDocument(
      stubQuery(postgrestError("42P01", "private detail")),
      DOCUMENT,
    );
    assert.equal(error.reason, "unknown");
    assert.equal(error.detail, "private detail");
  });
});

describe("document items", () => {
  it("saves a new item and its upload atomically", async () => {
    const query = stubQuery({
      data: { id: "item", document_id: DOCUMENT },
      error: null,
    });
    await insertCampaignItem(query, {
      campaignId: CAMPAIGN,
      item: ITEM,
      document: FILE,
    });
    assert.equal(query.lastInsert, null);
    assert.equal(query.lastRpc.name, "save_campaign_item_document");
    assert.equal(query.lastRpc.params.p_item_id, null);
    assert.equal(query.lastRpc.params.p_campaign_id, CAMPAIGN);
    assert.equal(query.lastRpc.params.p_document_html, FILE.html);
    assert.equal(query.lastRpc.params.p_document_name, FILE.name);
    assert.ok(!query.lastSelect.includes("html"));
  });

  it("keeps an attachment when only other item fields change", async () => {
    const query = stubQuery({ data: { id: "item" }, error: null });
    await updateCampaignItem(query, {
      campaignId: CAMPAIGN,
      id: "item",
      item: ITEM,
    });
    assert.equal(query.lastRpc, null);
    assert.ok(!Object.hasOwn(query.lastUpdate, "document_id"));
  });

  it("replaces or removes an attachment through the owned item transaction", async () => {
    for (const extra of [{ document: FILE }, { removeDocument: true }]) {
      const query = stubQuery({ data: { id: "item" }, error: null });
      await updateCampaignItem(query, {
        campaignId: CAMPAIGN,
        id: "item",
        item: ITEM,
        ...extra,
      });
      assert.equal(query.lastRpc.params.p_item_id, "item");
      assert.equal(
        query.lastRpc.params.p_remove_document,
        extra.removeDocument ?? false,
      );
    }
  });

  it("saves only a storage reference after a direct upload", async () => {
    const query = stubQuery({ data: { id: "item" }, error: null });
    const path = `${CAMPAIGN}/${DOCUMENT}.html`;
    await insertCampaignItem(query, {
      campaignId: CAMPAIGN,
      item: ITEM,
      document: { name: FILE.name, path },
    });
    assert.equal(query.lastRpc.params.p_document_path, path);
    assert.equal(query.lastRpc.params.p_document_html, null);
  });

  it("reports a refusal and a missing migration through existing reasons", async () => {
    for (const [result, reason] of [
      [{ data: null, error: null }, "not_found"],
      [postgrestError("PGRST202"), "missing_function"],
    ]) {
      const { error } = await insertCampaignItem(stubQuery(result), {
        campaignId: CAMPAIGN,
        item: ITEM,
        document: FILE,
      });
      assert.equal(error.reason, reason);
    }
  });

  it("never loads the HTML while listing the catalogue", async () => {
    const query = stubQuery({ data: [], error: null });
    await listCampaignItems(query, CAMPAIGN);
    assert.match(query.lastSelect, /document_id/);
    assert.match(query.lastSelect, /item_documents\(name\)/);
    assert.ok(!query.lastSelect.includes("html"));
  });

  it("carries the reference through grants, transfers and catalogue edits", async () => {
    const query = stubQuery({ data: 1, error: null });
    await grantInventoryItem(query, {
      characterId: "character",
      item: ITEM,
      quantity: 1,
    });
    assert.deepEqual(query.lastRpc.params.p_facts, ITEM.facts);
    await transferInventoryItem(query, {
      fromCharacterId: "one",
      toCharacterId: "two",
      item: ITEM,
      quantity: 1,
    });
    assert.deepEqual(query.lastRpc.params.p_facts, ITEM.facts);
    await rewriteCampaignItemCopies(query, {
      campaignId: CAMPAIGN,
      oldSlug: ITEM.slug,
      item: ITEM,
      facts: ITEM.facts,
    });
    assert.deepEqual(query.lastRpc.params.p_facts, ITEM.facts);
  });
});
