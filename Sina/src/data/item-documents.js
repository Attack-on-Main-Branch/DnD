import { randomUUID } from "node:crypto";
import { isItemDocumentId } from "../rules/item-document.js";

const BUCKET = "item-documents";
const DOWNLOAD_SECONDS = 60;

function storageFailure(error) {
  const status = Number(error.statusCode ?? error.status);
  return {
    data: null,
    error: {
      reason: status === 404 ? "document_missing" : "document_upload_failed",
      detail: error.message,
    },
  };
}

export async function prepareItemDocumentUpload(supabase, campaignId) {
  if (!isItemDocumentId(campaignId)) {
    return {
      data: null,
      error: { reason: "document_upload_failed", detail: null },
    };
  }
  const path = `${campaignId}/${randomUUID()}.html`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  return error
    ? storageFailure(error)
    : { data: { path, url: data.signedUrl }, error: null };
}

export async function readItemDocumentUpload(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  return error ? storageFailure(error) : { data, error: null };
}

export async function removeItemDocumentUpload(supabase, path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return error ? storageFailure(error) : { error: null };
}

export async function listPendingItemDocumentCleanup(supabase, campaignId) {
  const { data, error } = await supabase
    .from("item_documents")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("cleanup_pending", true)
    .limit(1);
  return error
    ? { data: null, error: { reason: "cleanup_failed", detail: error.message } }
    : { data: data ?? [], error: null };
}

export async function cleanupItemDocuments(supabase, campaignId) {
  let removed = 0;
  try {
    for (;;) {
      const prepared = await supabase.rpc("prepare_item_document_cleanup", {
        p_campaign_id: campaignId,
      });
      if (prepared.error) throw prepared.error;
      const documents = prepared.data ?? [];
      if (documents.length === 0) return { data: { removed }, error: null };

      const paths = documents
        .filter((document) => document.is_stored)
        .map((document) => `${campaignId}/${document.id}.html`);
      if (paths.length > 0) {
        const stored = await supabase.storage.from(BUCKET).remove(paths);
        if (stored.error) throw stored.error;
      }

      const finished = await supabase.rpc("finish_item_document_cleanup", {
        p_campaign_id: campaignId,
        p_document_ids: documents.map((document) => document.id),
      });
      if (finished.error) throw finished.error;
      if (finished.data !== documents.length) {
        return {
          data: { removed },
          error: {
            reason: "cleanup_failed",
            detail: "Document cleanup did not finish",
          },
        };
      }
      removed += finished.data;
    }
  } catch (error) {
    return {
      data: { removed },
      error: { reason: "cleanup_failed", detail: error.message },
    };
  }
}

export async function readItemDocument(supabase, id) {
  const { data, error } = await supabase
    .from("item_documents")
    .select("id, campaign_id, name, html, is_stored")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: { reason: "unknown", detail: error.message },
    };
  }

  if (!data) {
    return { data: null, error: { reason: "not_found", detail: null } };
  }

  if (!data.is_stored)
    return { data: { name: data.name, html: data.html }, error: null };

  const path = `${data.campaign_id}/${data.id}.html`;
  const signed = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, DOWNLOAD_SECONDS);
  return signed.error
    ? storageFailure(signed.error)
    : {
        data: { name: data.name, url: signed.data.signedUrl },
        error: null,
      };
}
