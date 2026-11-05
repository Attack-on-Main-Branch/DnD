import assert from "node:assert/strict";
import { it } from "node:test";

import { ITEM_DOCUMENT_SANDBOX, itemDocumentSource } from "./item-document.mjs";

it("isolates inline scripts without granting access to the app's origin", () => {
  assert.equal(ITEM_DOCUMENT_SANDBOX, "allow-scripts");
});

it("installs the content policy before any uploaded markup", () => {
  const html =
    '<meta http-equiv="Content-Security-Policy" content="default-src *"><script>window.test = true</script>';
  const source = itemDocumentSource(html, {
    color: "var(--ink)",
    background: "var(--surface)",
    accent: "var(--gold)",
    fontFamily: "serif",
  });
  assert.ok(source.indexOf("default-src 'none'") < source.indexOf(html));
  assert.ok(source.includes("connect-src 'none'"));
  assert.ok(source.includes("form-action 'none'"));
  assert.ok(source.includes("frame-src 'none'"));
  assert.ok(source.includes("base-uri 'none'"));
  assert.ok(source.includes("img-src data: blob:"));
  assert.ok(source.includes(html));
});
