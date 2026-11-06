export const MAX_ITEM_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const ITEM_DOCUMENT_MIME_TYPE = "application/octet-stream";
export const MAX_ITEM_DOCUMENT_NAME_LENGTH = 120;

export function isItemDocumentId(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function isItemDocumentPath(value, campaignId) {
  if (typeof value !== "string") return false;
  const parts = value.split("/");
  const [campaign, file] = parts;
  return (
    parts.length === 2 &&
    isItemDocumentId(campaign) &&
    campaign === campaignId &&
    file?.endsWith(".html") &&
    isItemDocumentId(file.slice(0, -5))
  );
}

export function itemDocumentFileError(file) {
  if (
    !file ||
    typeof file.name !== "string" ||
    !/\.html?$/i.test(file.name) ||
    [...file.name].length > MAX_ITEM_DOCUMENT_NAME_LENGTH
  ) {
    return "invalid_document";
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "empty_document";
  }

  return file.size > MAX_ITEM_DOCUMENT_BYTES ? "document_too_large" : null;
}

export function validateItemDocument({ name, html } = {}) {
  const error = itemDocumentFileError({
    name,
    size: typeof html === "string" ? new TextEncoder().encode(html).length : 0,
  });

  if (error) {
    return { values: null, error };
  }

  if (!html.trim() || html.includes("\0")) {
    return { values: null, error: "invalid_document" };
  }

  return { values: { name, html }, error: null };
}
