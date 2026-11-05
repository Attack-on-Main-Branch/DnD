import {
  MAX_ITEM_DOCUMENT_BYTES,
  MAX_ITEM_DOCUMENT_NAME_LENGTH,
} from "sina/rules/item-document";

export const ITEM_DOCUMENT_SIZE_LABEL = `${MAX_ITEM_DOCUMENT_BYTES / (1024 * 1024)} MB`;

export const ITEM_DOCUMENT_COPY = {
  invalid_document: `Choose a self-contained .html or .htm file with a name of at most ${MAX_ITEM_DOCUMENT_NAME_LENGTH} characters.`,
  empty_document: "That HTML file is empty.",
  document_too_large: `An HTML file can be up to ${ITEM_DOCUMENT_SIZE_LABEL}.`,
  document_upload_failed: "Could not upload that HTML file. Try again.",
  document_missing:
    "That uploaded file is no longer available. Choose it again.",
};
