import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isItemDocumentId,
  isItemDocumentPath,
  itemDocumentFileError,
  MAX_ITEM_DOCUMENT_BYTES,
  MAX_ITEM_DOCUMENT_NAME_LENGTH,
  validateItemDocument,
} from "./item-document.js";
import { readCatalogueItem, readItemFacts, validateItem } from "./inventory.js";

const DOCUMENT = "6f1c3d2e-0000-4000-8000-0000000000ca";

describe("item documents", () => {
  it("binds uploads to the owning campaign and one immutable filename", () => {
    const path = `${DOCUMENT}/${DOCUMENT}.html`;
    assert.equal(isItemDocumentPath(path, DOCUMENT), true);
    for (const value of [
      null,
      `${path}/`,
      `${path}/extra`,
      `${DOCUMENT}/../letter.html`,
      `${DOCUMENT}/letter.html`,
      `${path}?token=anything`,
    ]) {
      assert.equal(isItemDocumentPath(value, DOCUMENT), false);
    }
    assert.equal(isItemDocumentPath(path, "another-campaign"), false);
  });

  it("accepts a 25 MB file and refuses the next byte", () => {
    const html = "a".repeat(25 * 1024 * 1024);
    assert.equal(
      validateItemDocument({ name: "letter.html", html }).error,
      null,
    );
    assert.equal(
      validateItemDocument({ name: "letter.html", html: `${html}a` }).error,
      "document_too_large",
    );
  });
  it("accepts complete HTML documents and fragments without changing their content", () => {
    for (const name of ["letter.html", "LETTER.HTML", "letter.htm"]) {
      const html = "<style>p { color: gold }</style>\n<p>A letter</p>";
      assert.deepEqual(validateItemDocument({ name, html }), {
        values: { name, html },
        error: null,
      });
    }
  });

  it("checks the file before the browser or server reads it", () => {
    assert.equal(
      itemDocumentFileError({
        name: "letter.html",
        size: MAX_ITEM_DOCUMENT_BYTES,
      }),
      null,
    );
    assert.equal(
      itemDocumentFileError({
        name: "letter.html",
        size: MAX_ITEM_DOCUMENT_BYTES + 1,
      }),
      "document_too_large",
    );
    assert.equal(
      itemDocumentFileError({ name: "letter.html", size: 0 }),
      "empty_document",
    );
    assert.equal(
      itemDocumentFileError({ name: "letter.html", size: NaN }),
      "empty_document",
    );
    assert.equal(
      itemDocumentFileError({ name: "letter.html.exe", size: 10 }),
      "invalid_document",
    );
  });

  it("measures UTF-8 bytes instead of JavaScript string length", () => {
    assert.equal(
      validateItemDocument({
        name: "letter.html",
        html: "é".repeat(MAX_ITEM_DOCUMENT_BYTES / 2),
      }).error,
      null,
    );
    assert.equal(
      validateItemDocument({
        name: "letter.html",
        html: "é".repeat(MAX_ITEM_DOCUMENT_BYTES / 2 + 1),
      }).error,
      "document_too_large",
    );
  });

  it("rejects blank, binary and non-HTML files", () => {
    for (const html of ["", " \n\t", "<p>\0</p>", null]) {
      assert.ok(validateItemDocument({ name: "letter.html", html }).error);
    }
    assert.equal(
      validateItemDocument({ name: "letter.txt", html: "Letter" }).error,
      "invalid_document",
    );
  });

  it("counts filename code points to match the database", () => {
    const name = `${"🗝".repeat(MAX_ITEM_DOCUMENT_NAME_LENGTH - 5)}.html`;
    assert.equal(validateItemDocument({ name, html: "Letter" }).error, null);
    assert.equal(
      validateItemDocument({ name: `x${name}`, html: "Letter" }).error,
      "invalid_document",
    );
  });

  it("only carries a UUID reference through every inventory reader", () => {
    const facts = {
      documentId: DOCUMENT,
      catalogueId: DOCUMENT,
      html: "<script>ignored</script>",
    };
    assert.deepEqual(readItemFacts(facts), {
      documentId: DOCUMENT,
      catalogueId: DOCUMENT,
    });
    assert.equal(
      validateItem({ name: "Letter", quantity: 1, facts }).values.facts
        .documentId,
      DOCUMENT,
    );
    assert.equal(
      readCatalogueItem({ slug: "letter", name: "Letter", facts }).facts
        .documentId,
      DOCUMENT,
    );
    for (const id of [
      null,
      {},
      "",
      `${DOCUMENT}/file`,
      "javascript:alert(1)",
    ]) {
      assert.equal(isItemDocumentId(id), false);
      assert.deepEqual(readItemFacts({ documentId: id, catalogueId: id }), {});
    }
  });
});
